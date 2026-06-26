# Flow-Step-Not-Surfaced Implementation Plan

**Status:** Implementation Plan  
**Date:** 2026-06-26  
**Author:** Big Pickle  
**Lane:** B  
**Depends on:** `docs/proposals/Reachability-Diagnostics.md` (design proposal)  
**Affected package:** `@intent-framework/core`  
**Changeset:** None (plan-only lane)

---

## Overview

Implement the `flow-step-not-surfaced` diagnostic as described in the Reachability Diagnostics proposal. This diagnostic fires when a flow step references an ask or act node that is not included in any surface. The interaction path is defined but one of its steps would render nothing visible.

---

## Files to Modify

### 1. `packages/core/src/graph.ts`

#### 1a. Add `flowNodeId` / `flowSemanticNodeId` to `GraphDiagnostic`

Extend the type with optional flow-context fields:

```ts
export type GraphDiagnostic = {
  severity: DiagnosticSeverity
  code: string
  message: string
  nodeId?: string
  semanticNodeId?: string
  flowNodeId?: string        // new
  flowSemanticNodeId?: string // new
}
```

#### 1b. Implement `flow-step-not-surfaced` logic in `computeDiagnostics()`

Insert a new block **after** the existing `surfaced-node-not-in-any-flow` block (lines 161–190) and **before** the `return diagnostics` at line 192. The algorithm:

```
For each flow in screenDef.flows:
  for each step in flow.steps:
    if step.node.id ∉ surfacedNodeIds:
      emit diagnostic:
        severity: "warning"
        code: "flow-step-not-surfaced"
        message: `Flow "${flow.name}" step "${step.node.label}" is not included in any surface.`
        nodeId: step.node.id
        flowNodeId: flow.id
        // semanticNodeId and flowSemanticNodeId are assigned later by inspectScreen
```

Note: For ask nodes, `step.node.label` is available at `(step.node as AnyAskNode).label`. For act nodes, it is `(step.node as ActNode).label`. Since `FlowStep` is a tagged union (`{ type: "ask"; node: AnyAskNode } | { type: "act"; node: ActNode }`), the label can be accessed via `step.node.label` — both `AnyAskNode` and `ActNode` expose a `label` field.

#### 1c. Enrich flow-scoped diagnostics with semantic IDs

In `inspectScreen()`, after the existing `augmentedDiagnostics` mapping (lines 215–218), include the flow semantic IDs:

```ts
const augmentedDiagnostics: GraphDiagnostic[] = diagnostics.map(d => ({
  ...d,
  semanticNodeId: d.nodeId ? idToSemantic.get(d.nodeId) : undefined,
  flowSemanticNodeId: d.flowNodeId ? flowIdToSemantic.get(d.flowNodeId) : undefined,
}))
```

This requires building a `flowIdToSemantic` map similar to `idToSemantic`:

```ts
const flowIdToSemantic = new Map<string, string>()
for (const f of screenDef.flows) {
  flowIdToSemantic.set(f.id, flowIds(f.name))
}
```

### 2. `packages/core/src/index.ts`

No changes needed — `GraphDiagnostic` is already exported. The new fields are optional so the type is backward-compatible.

### 3. `packages/core/src/core.test.ts`

Add tests to the existing `describe("graph diagnostics")` or `describe("reachability diagnostics")` block (line 738):

| Test case | Expected behavior |
|-----------|------------------|
| Flow step references ask not in any surface | One `flow-step-not-surfaced` diagnostic |
| Flow step references act not in any surface | One `flow-step-not-surfaced` diagnostic |
| Flow with multiple steps, only some not surfaced | Diagnostics for the unsurfaced steps only |
| All flow steps are surfaced | No `flow-step-not-surfaced` diagnostics |
| No flows defined | No `flow-step-not-surfaced` diagnostics |
| Multiple flows, one has unsurfaced steps | Diagnostics only for the broken flow |
| Coexistence with `surfaced-node-not-in-any-flow` | Both fire when applicable |
| `flowNodeId` and `flowSemanticNodeId` are populated | Verify field presence and value |

---

## Algorithm Detail

```txt
Input: screenDef (asks, acts, flows, surfaces)
Output: GraphDiagnostic[]

1. Build surface membership set:
   surfacedNodeIds = {}  // Set<string>
   for each surface in screenDef.surfaces:
     for each item in surface.items:
       surfacedNodeIds.add(item.id)

2. Compute flow-step-not-surfaced:
   for each flow in screenDef.flows:
     for each step in flow.steps:
       if step.node.id not in surfacedNodeIds:
         emit diagnostic:
           severity: "warning"
           code: "flow-step-not-surfaced"
           message: `Flow "${flow.name}" step "${step.node.label}" is not included in any surface.`
           nodeId: step.node.id
           flowNodeId: flow.id

3. (Existing) Compute surfaced-node-not-in-any-flow:
   // unchanged — already in computeDiagnostics()
   // Both diagnostics can fire for the same node in different directions
```

This is O(n) in the total number of flow steps across all flows and surfaces.

---

## Interaction with Existing Diagnostics

| Diagnostic | Relationship |
|---|---|
| `ask-not-in-surface` | Both may fire for the same node. `flow-step-not-surfaced` adds flow context. |
| `action-not-in-surface` | Same as above. Both may fire. |
| `surfaced-node-not-in-any-flow` | These are inverses. A node can have both (if it's surfaced but not in a flow, AND a different flow references it but it's not surfaced). They can also fire independently. |

No existing diagnostic is removed or demoted. All are additive.

---

## Validation

After implementation, run:

```sh
rm -rf packages/*/dist
pnpm test         # all existing + new tests pass
pnpm typecheck    # types compile
pnpm build        # packages build
pnpm lint         # lint passes
pnpm pack:check   # pack validation passes
pnpm changeset status  # no changesets expected (plan-only lane)
```

---

## Not in Scope

- `orphaned-flow` diagnostic (separate lane)
- `flow-step-order-gap` diagnostic (stretch goal)
- Changes to `InspectedScreen.flows` to include step details (not needed for this diagnostic)
- Any runtime changes
