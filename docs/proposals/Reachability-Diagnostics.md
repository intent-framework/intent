# Reachability Diagnostics — Design Proposal

**Status:** Proposal  
**Date:** 2026-06-26  
**Author:** Big Pickle  
**Affected package:** `@intent-framework/core`  
**Related docs:** `docs/Inspect-Screen.md`

---

## Problem

`inspectScreen()` currently emits five diagnostics (surface membership, multiple primary
actions, secret/private mismatch, missing blocked reasons). All are structural —
they check *what exists* in the graph, not *whether it can be reached*.

A screen author can have:

- A surfaced ask that no flow ever references (visible but unfollowable).
- A flow whose first step references an ask that is not in any surface (defined
  interaction path but invisible first step).
- A flow that is completely disconnected from every surface (dead flow).
- An action whose blocking condition depends on state set by a step that appears
  later in the flow (ordering error).

None of these produce diagnostics today. Authors discover them only through
manual testing or runtime confusion.

---

## Goal

Add a new family of *reachability* diagnostics to `inspectScreen()` that trace
whether every node in the graph is reachable through at least one flow, and
whether every flow step is renderable (appears in at least one surface).

These are **static structural checks** — they operate entirely on the screen
definition at inspection time, with no runtime state needed.

---

## Proposed Diagnostics

### 1. `surfaced-node-not-in-any-flow`

| Field | Value |
|---|---|
| **Severity** | `info` |
| **Code** | `surfaced-node-not-in-any-flow` |
| **Applies to** | Ask and act nodes |
| **Triggers when** | A node appears in at least one surface but is not referenced in any flow's `startsWith(...)` / `.then(...)` chain. |

**Rationale:** The node is visible but there is no defined interaction path to
it. This is `info` rather than `warning` because flows are optional — a simple
screen may rely on implicit DOM ordering rather than explicit flow steps.

**Example:**
```ts
const email = $.ask("Email", emailState)
const name = $.ask("Name", nameState)

$.surface("main").contains(email, name)

$.flow("signup").startsWith(email)  // name is never mentioned in flows
// Diagnostic: surfaced-node-not-in-any-flow for "Name"
```

### 2. `flow-step-not-surfaced`

| Field | Value |
|---|---|
| **Severity** | `warning` |
| **Code** | `flow-step-not-surfaced` |
| **Applies to** | Ask and act nodes referenced in flow steps |
| **Triggers when** | A flow step references a node that is not included in any surface. The interaction path is defined but one of its steps would render nothing. |

**Rationale:** This is strictly more informative than the existing
`ask-not-in-surface` / `action-not-in-surface` diagnostics because it adds the
context of *which flow* is broken. It does not replace those diagnostics — it
supplements them.

**Example:**
```ts
const email = $.ask("Email", emailState)
const secret = $.ask("Secret", secretState)  // not in any surface

$.flow("signup").startsWith(email).then(secret)

$.surface("main").contains(email)
// Diagnostic: flow-step-not-surfaced for "Secret" in flow "signup"
```

### 3. `orphaned-flow`

| Field | Value |
|---|---|
| **Severity** | `warning` |
| **Code** | `orphaned-flow` |
| **Applies to** | Flow nodes |
| **Triggers when** | A flow exists but none of its steps reference nodes that are in any surface. |

**Rationale:** The flow is entirely disconnected from the rendered UI. Every
step produces no visible output. This is the flow-level analog of
`ask-not-in-surface`.

### 4. `flow-step-order-gap` (stretch goal)

| Field | Value |
|---|---|
| **Severity** | `info` |
| **Code** | `flow-step-order-gap` |
| **Applies to** | Act nodes in flow steps |
| **Triggers when** | An action in a flow has a `.when(...)` condition that depends on an ask or resource that appears later in that same flow (or not at all in the flow). |

**Rationale:** Detects ordering bugs where an action is blocked by state that
hasn't been collected yet. This is a heuristic (conditions could reference
screen-level state set elsewhere), so it is `info` not `warning`.

**Example:**
```ts
const email = $.ask("Email", emailState)
const submit = $.act("Submit").when(email.valid)

$.flow("signup").startsWith(submit).then(email)  // submit before email is asked
// Diagnostic: flow-step-order-gap — "Submit" depends on "Email" which appears after it
```

---

## Analysis Algorithm

```txt
Input: screen definition (asks, acts, flows, surfaces)
Output: GraphDiagnostic[]

1. Build surface membership set:
   surfacedNodes = union of all surface.items[*].id

2. Build flow-membership map:
   flowStepNodes = { flow.id → Set(node.id for each step in flow) }

3. Build reverse index: node → flows that reference it:
   nodeFlows = { node.id → Set(flow.id where node appears in flow.steps) }

4. Compute diagnostics:

   For each node in (asks ∪ acts):
     if node.id ∈ surfacedNodes AND nodeFlows.get(node.id) is empty:
       emit surfaced-node-not-in-any-flow

   For each flow in screenDef.flows:
     flowSurfaced = intersection(flowStepNodes[flow.id], surfacedNodes)
     if flowSurfaced is empty:
       emit orphaned-flow
     else: for each stepNode in flowStepNodes[flow.id]:
       if stepNode ∉ surfacedNodes:
         emit flow-step-not-surfaced (with flow context)

   (Stretch) For each act in flow steps that has conditions:
     check condition sources against flow order
     if dependency appears later in same flow:
       emit flow-step-order-gap
```

---

## Output Format

Existing `GraphDiagnostic` shape is sufficient. One addition: for flow-scoped
diagnostics, include the flow's `semanticNodeId` in the message or as a new
optional field.

```ts
{
  severity: "warning",
  code: "flow-step-not-surfaced",
  message: 'Flow "signup" step "Secret" is not included in any surface.',
  nodeId: "ask_secret",
  semanticNodeId: "ask:secret",
  // new optional field for flow context:
  flowNodeId?: "flow_signup",
  flowSemanticNodeId?: "flow:signup"
}
```

The `flowNodeId` / `flowSemanticNodeId` fields would need to be added to the
`GraphDiagnostic` type:

```ts
export type GraphDiagnostic = {
  severity: DiagnosticSeverity
  code: string
  message: string
  nodeId?: string
  semanticNodeId?: string
  flowNodeId?: string     // new — optional
  flowSemanticNodeId?: string  // new — optional
}
```

Alternatively, `nodeId` could reference the flow and `semanticNodeId` the
affected step. This proposal leans toward the extra fields for clarity but
is open to bikeshedding.

---

## Interaction with Existing Diagnostics

These new diagnostics **supplement**, not replace:

| Existing | New | Relationship |
|---|---|---|
| `ask-not-in-surface` | `flow-step-not-surfaced` | Both fire for a node in a flow but not rendered. The existing diagnostic fires once; the new one fires per-flow so the author knows *which flows* are affected. |
| `action-not-in-surface` | `flow-step-not-surfaced` | Same as above. |
| — | `surfaced-node-not-in-any-flow` | Inverse of surface membership — node is rendered but no flow leads to it. |
| — | `orphaned-flow` | Flow-level complement of the unsurfaced-node checks. |

Authors can suppress `surfaced-node-not-in-any-flow` (`info` severity) if they
rely on implicit rendering without explicit flows.

---

## Implementation Sketch

### Changes to `packages/core/src/graph.ts`

1. Add `flowNodeId` and `flowSemanticNodeId` to `GraphDiagnostic`.
2. Implement a new function `computeReachabilityDiagnostics(screenDef)` called
   from `computeDiagnostics()` or separately from within `inspectScreen()`.
3. The function follows the algorithm above, using the screen definition's
   `asks`, `acts`, `flows`, and `surfaces` arrays.

### No changes needed to

- `packages/core/src/flow.ts` — `FlowNode.steps` already contains the
  node references needed.
- `packages/core/src/surface.ts` — `SurfaceNode.items` already contains the
  node references needed.
- `packages/core/src/act.ts`, `ask.ts` — node `id` fields are stable at
  inspection time.

---

## Open Questions

1. **Should `surfaced-node-not-in-any-flow` default to `info` or `warning`?**
   This proposal says `info` because flows are optional. If the community
   treats flows as required, bump to `warning`.

2. **Should `flow-step-order-gap` be part of the initial implementation or a
   follow-up?** This proposal marks it as a stretch goal because it requires
   understanding condition source tracking, which is more complex than set
   membership checks.

3. **How should the diagnostics handle flows with zero steps?** A flow defined
   without `.startsWith()` has an empty step list. This is likely an error —
   should we add a separate `empty-flow` diagnostic? This could be a separate
   proposal or included here.

4. **What about resource reachability?** Resources are async and loaded by the
   runtime. But a resource that is defined and never used by any ask, act, or
   flow could produce an `unused-resource` diagnostic. This is out of scope for
   this proposal but worth noting.

---

## Migration

Since these are new diagnostics (additive), existing `inspectScreen()` output
will grow new entries. This is not a breaking change:

- Code that asserts `diagnostics.length === 0` may break if reachability
  diagnostics appear. Authors should either fix the screen or filter
  diagnostics by code.
- Warnings about new diagnostics during CI should be treated as actionable
  feedback.

---

## Related

- `docs/Inspect-Screen.md:243` — Boundaries section, "No full reachability
  analysis."
- `packages/core/src/graph.ts:96` — `computeDiagnostics()` function
- `packages/core/src/flow.ts` — `FlowNode`, `FlowStep` types
