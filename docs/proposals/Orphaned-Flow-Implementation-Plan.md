# Orphaned Flow — Implementation Plan

**Status:** Plan  
**Date:** 2026-06-26  
**Author:** Big Pickle  
**Affected package:** `@intent-framework/core`  
**Related docs:** `docs/proposals/Reachability-Diagnostics.md`

---

## 1. Problem

`inspectScreen()` currently emits a `surfaced-node-not-in-any-flow` diagnostic when a surfaced ask/act is unreferenced by any flow step. However, there is no corresponding diagnostic for the inverse: a flow whose steps reference only nodes that are not in any surface.

Such a flow is **orphaned** — every step it defines produces no visible output. The author defined an interaction path that leads nowhere. This is the flow-level analog of `ask-not-in-surface` / `action-not-in-surface`.

---

## 2. Goal

Add an `orphaned-flow` diagnostic to `computeDiagnostics()` in `packages/core/src/graph.ts` that fires when a flow exists but none of its steps reference a node that appears in any surface.

### Design (from Reachability-Diagnostics.md)

| Field | Value |
|-------|-------|
| **Severity** | `warning` |
| **Code** | `orphaned-flow` |
| **Applies to** | Flow nodes |
| **Triggers when** | A flow exists but none of its steps reference nodes that are in any surface. |

---

## 3. Algorithm

Given `screenDef.flows`, `screenDef.surfaces`:

```
surfacedNodeIds = union of all surface.items[*].id

for each flow in screenDef.flows:
  if flow.steps is empty:
    emit orphaned-flow (empty flow — all zero steps are unsurfaced)
    continue

  flowHasSurfacedStep = false
  for each step in flow.steps:
    if step.node.id ∈ surfacedNodeIds:
      flowHasSurfacedStep = true
      break

  if not flowHasSurfacedStep:
    emit orphaned-flow
```

### Rationale for empty flows

A flow defined without `.startsWith()` (e.g. `$.flow("empty")` with no chained calls) has zero steps. Zero steps means zero surfaced nodes — the flow is trivially orphaned. This is consistent with the "every step unsurfaced" check.

If the team prefers a separate `empty-flow` diagnostic in the future, the orphaned check can gate on `flow.steps.length > 0`. For now, treat empty flows as orphaned.

---

## 4. Implementation Steps

### Step 1: Add the diagnostic emission in `computeDiagnostics()`

Location: `packages/core/src/graph.ts`, function `computeDiagnostics()`.

After the existing flow loop (lines 161–189, which emit `surfaced-node-not-in-any-flow`), add a second loop:

```ts
for (const flow of screenDef.flows) {
  const flowSurfaced = flow.steps.some(step => surfacedNodeIds.has(step.node.id))
  if (!flowSurfaced) {
    diagnostics.push({
      severity: "warning",
      code: "orphaned-flow",
      message: `Flow "${flow.name}" has no steps that reference surfaced nodes.`,
      nodeId: flow.id,
    })
  }
}
```

### Step 2: Add `flowSemanticNodeId` enrichment

In `inspectScreen()` (line 195), the `augmentedDiagnostics` map currently enriches `nodeId` → `semanticNodeId` for diagnostics. The `orphaned-flow` diagnostic references a flow node, not an ask/act node, so the existing `idToSemantic` map (which only maps ask and act IDs) will not cover it.

If the team wants `semanticNodeId` populated for orphaned-flow diagnostics, the flow IDs need their own semantic mapping. Add after the existing ask/act mapping (line 207):

```ts
// in inspectScreen(), after idToSemantic is built for asks and acts
const flowIdToSemantic = new Map<string, string>()
for (const f of screenDef.flows) {
  flowIdToSemantic.set(f.id, flowIds(f.name))
}
```

Then when enriching diagnostics that have `nodeId` referring to a flow, use `flowIdToSemantic` as a fallback, or check both maps.

Alternatively, add a new optional `flowNodeId` / `flowSemanticNodeId` field to `GraphDiagnostic`. The `Reachability-Diagnostics.md` proposal discusses this but it is not required for the `orphaned-flow` diagnostic to function — the semantic enrichment is a nice-to-have for tooling.

### Step 3: Test cases

Location: `packages/core/src/core.test.ts`, under the `graph diagnostics > reachability diagnostics` describe block.

#### Test 3a: Flow with all steps unsurfaced emits orphaned-flow

```ts
it("emits orphaned-flow when no flow step references a surfaced node", () => {
  const screenDef = screen("OrphanedFlow", $ => {
    const email = $.state.text("email")
    const emailAsk = $.ask("Email", email).private()
    const login = $.act("Log in")
    $.flow("orphan-flow").startsWith(emailAsk).then(login)
    // Nothing is surfaced
  })
  const inspected = inspectScreen(screenDef)
  const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
  expect(diags).toHaveLength(1)
  expect(diags[0]?.severity).toBe("warning")
  expect(diags[0]?.nodeId).toBe("flow_orphan-flow")
  expect(diags[0]?.message).toContain("orphan-flow")
})
```

#### Test 3b: Flow with at least one surfaced step does not emit orphaned-flow

```ts
it("does not emit orphaned-flow when at least one step references a surfaced node", () => {
  const screenDef = screen("NotOrphaned", $ => {
    const email = $.state.text("email")
    const emailAsk = $.ask("Email", email).private()
    const login = $.act("Log in")
    $.flow("ok-flow").startsWith(emailAsk).then(login)
    $.surface("main").contains(emailAsk)
  })
  const inspected = inspectScreen(screenDef)
  const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
  expect(diags).toHaveLength(0)
})
```

#### Test 3c: Empty flow emits orphaned-flow

```ts
it("emits orphaned-flow for empty flow", () => {
  const screenDef = screen("EmptyFlow", $ => {
    $.flow("empty")
    $.surface("main")
  })
  const inspected = inspectScreen(screenDef)
  const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
  expect(diags).toHaveLength(1)
  expect(diags[0]?.nodeId).toBe("flow_empty")
})
```

#### Test 3d: Multiple flows — only orphaned ones emit the diagnostic

```ts
it("emits orphaned-flow only for flows with no surfaced steps when multiple flows exist", () => {
  const screenDef = screen("MultiFlow", $ => {
    const email = $.state.text("email")
    const emailAsk = $.ask("Email", email).private()
    const login = $.act("Log in")
    const hiddenAct = $.act("Hidden")
    $.flow("good-flow").startsWith(emailAsk).then(login)
    $.flow("orphan-flow").startsWith(hiddenAct)
    $.surface("main").contains(emailAsk, login)
  })
  const inspected = inspectScreen(screenDef)
  const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
  expect(diags).toHaveLength(1)
  expect(diags[0]?.nodeId).toBe("flow_orphan-flow")
})
```

#### Test 3e: Deterministic ordering with existing diagnostics

```ts
it("orphaned-flow diagnostic is deterministic alongside other diagnostics", () => {
  const screenDef = screen("DeterministicOrphan", $ => {
    const email = $.state.text("email")
    const emailAsk = $.ask("Email", email).private()
    const login = $.act("Log in")
    $.flow("orphan").startsWith(emailAsk).then(login)
    // nothing surfaced — multiple diagnostics expected
  })
  const first = inspectScreen(screenDef)
  const second = inspectScreen(screenDef)
  expect(first.diagnostics.map(d => d.code)).toEqual(second.diagnostics.map(d => d.code))
  expect(first.diagnostics.some(d => d.code === "orphaned-flow")).toBe(true)
})
```

---

## 5. Interaction with Existing Diagnostics

| Diagnostic | Relationship to `orphaned-flow` |
|---|---|
| `ask-not-in-surface` | Both will fire for an ask referenced only in orphaned flow steps. The author sees the unsurfaced ask warning (generic) plus the orphaned flow warning (specific to the flow). This is intentionally redundant — different angles on the same problem. |
| `action-not-in-surface` | Same as above, for action nodes. |
| `surfaced-node-not-in-any-flow` | Inverse — this fires for surfaced nodes with no flow reference; `orphaned-flow` fires for flows with no surfaced nodes. They can coexist on the same screen (surfaced nodes not in any flow, and flows referencing only unsurfaced nodes). |

No existing diagnostic should be removed or modified.

---

## 6. Files to Change

| File | Change |
|------|--------|
| `packages/core/src/graph.ts` | Add orphaned-flow emission in `computeDiagnostics()` (lines 161–189 block). Optionally add flow semantic ID enrichment in `inspectScreen()`. |
| `packages/core/src/core.test.ts` | Add test cases (see section 4, step 3). |

### No changes needed to

- `packages/core/src/flow.ts` — `FlowNode.steps` already contains the node references needed.
- `packages/core/src/surface.ts` — `SurfaceNode.items` already contains the node references needed.
- `packages/core/src/act.ts`, `ask.ts` — Node `id` fields are stable at inspection time.
- `packages/core/src/screen.ts` — No changes to the builder API.
- `packages/core/src/registry.ts` — No new registry types needed.
- Any other package — The diagnostic is purely in `@intent-framework/core`.

---

## 7. Open Questions

1. **Should empty flows emit `orphaned-flow` or a separate `empty-flow`?** This plan says `orphaned-flow` for now. If the team prefers a distinct code, split: `orphaned-flow` for non-empty flows with all unsurfaced steps, `empty-flow` for zero-step flows.

2. **Should `orphaned-flow` include `flowNodeId` / `flowSemanticNodeId`?** The existing `GraphDiagnostic` shape (`nodeId`, `semanticNodeId`) is sufficient for now — the `nodeId` will reference the flow ID. Adding dedicated flow fields is forward-looking and not required for this diagnostic to be actionable.

3. **Should `orphaned-flow` fire when there are zero surfaces?** Yes, because `surfacedNodeIds` will be empty, and every step is trivially unsurfaced. This is consistent with the algorithm.

---

## 8. Verification

After implementation, run:

```sh
pnpm test          # new tests pass, existing tests unchanged
pnpm typecheck     # no type errors
pnpm build         # compiles cleanly
pnpm lint          # no lint errors
pnpm pack:check    # packing is valid
pnpm changeset status  # no unexpected changeset state
```

No changeset is needed for this lane (plan-only).

---

## 9. Related

- `docs/proposals/Reachability-Diagnostics.md` — parent proposal covering all four reachability diagnostics
- `packages/core/src/graph.ts:96` — `computeDiagnostics()` function
- `packages/core/src/graph.ts:161` — existing flows section (where orphaned-flow will be added)
- `packages/core/src/core.test.ts:738` — existing reachability diagnostics tests
