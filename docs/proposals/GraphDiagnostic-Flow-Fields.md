# GraphDiagnostic Flow Fields — Design Proposal

**Status:** Proposal
**Date:** 2026-06-26
**Author:** Big Pickle
**Affected package:** `@intent-framework/core`
**Related docs:** `docs/proposals/Reachability-Diagnostics.md`

---

## Problem

The `GraphDiagnostic` type (defined in `packages/core/src/graph.ts:7-13`) currently carries `nodeId` and `semanticNodeId` to identify which ask or act a diagnostic refers to. There is no way to associate a diagnostic with a specific flow.

Future flow-scoped diagnostics — such as `flow-step-not-surfaced` and `orphaned-flow` (designed in `Reachability-Diagnostics.md:68-106`) — need to report *which flow* is affected, not just which node. Without flow fields, a consumer of `inspectScreen()` cannot group diagnostics by flow or display flow context to the author.

---

## Goal

Design the smallest additive extension to `GraphDiagnostic` that enables flow-scoped diagnostics, without breaking existing consumers.

---

## Proposed API Shape

### One new type: `FlowDiagnosticMeta`

```ts
export type FlowDiagnosticMeta = {
  flowNodeId: string
  flowSemanticNodeId?: string
}
```

### Make `GraphDiagnostic` carry optional flow meta

```ts
export type GraphDiagnostic = {
  severity: DiagnosticSeverity
  code: string
  message: string
  nodeId?: string
  semanticNodeId?: string
  flow?: FlowDiagnosticMeta
}
```

### Rationale for a nested `flow` object (vs top-level fields)

- **Namespacing**: `flowNodeId` and `flowSemanticNodeId` are only meaningful together. A flat `flowNodeId` without `flowSemanticNodeId` is ambiguous; grouping them into an optional object makes the relationship explicit.
- **Forward compatibility**: If later we add `flowStepIndex` or `flowStepNodeId`, they naturally live inside `flow` without polluting the top-level type.
- **Backward compatibility**: The `flow` field is optional (`flow?: FlowDiagnosticMeta`). Existing consumers that destructure only `severity`, `code`, `message`, `nodeId`, `semanticNodeId` continue to work unchanged.
- **Type narrowing**: A consumer checking `if (d.flow)` immediately has access to the complete flow context, rather than checking two separate optional fields.

### Example diagnostic using the new shape

```ts
{
  severity: "warning",
  code: "flow-step-not-surfaced",
  message: 'Flow "signup" step "Secret" is not included in any surface.',
  nodeId: "ask_secret",
  semanticNodeId: "ask:secret",
  flow: {
    flowNodeId: "flow_signup",
    flowSemanticNodeId: "flow:signup"
  }
}
```

---

## Alternative: Flat top-level fields

The `Reachability-Diagnostics.md:186-203` proposal originally suggested:

```ts
export type GraphDiagnostic = {
  severity: DiagnosticSeverity
  code: string
  message: string
  nodeId?: string
  semanticNodeId?: string
  flowNodeId?: string
  flowSemanticNodeId?: string // new — optional
}
```

**Rejected** because:

1. Two new optional top-level fields with no structural relationship to each other. A consumer must remember to check both and understand they covary.
2. Adding more top-level optional fields increases cognitive overhead for consumers that ignore flow diagnostics entirely.

---

## Alternative: Overload `nodeId` to reference the flow

```ts
// For flow-scoped diagnostics:
{
  nodeId: "flow_signup",   // nodeId now refers to the flow
  semanticNodeId: "flow:signup",
  stepNodeId: "ask_secret" // the affected step
}
```

**Rejected** because:

1. Polymorphic `nodeId` breaks existing consumers that assume it always refers to an ask or act node.
2. Introduces a new `stepNodeId` field anyway, so no net field reduction.
3. Violates the principle of least surprise.

---

## Impact on Existing Code

### Changes to `packages/core/src/graph.ts`

- Add `FlowDiagnosticMeta` type (2 lines).
- Change `GraphDiagnostic` to include `flow?: FlowDiagnosticMeta` (add 1 line).

### No changes needed to

- `computeDiagnostics()` — existing diagnostics do not set `flow`, so no existing logic needs updating.
- `inspectScreen()` — the augmentation step (`diagnostics.map(...)`) already spreads each diagnostic; the `flow` field passes through transparently.
- `InspectedScreen` — no change needed; its `diagnostics: GraphDiagnostic[]` field is generic.
- Any existing consumer that reads `audited.code` — new field is optional and ignored by destructuring.

### Public API surface impact

`FlowDiagnosticMeta` and the amended `GraphDiagnostic` are exported from `packages/core/src/index.ts`. This is additive only — no existing exports are removed or renamed.

---

## Interaction with Future Diagnostics

### `flow-step-not-surfaced` (planned)

```ts
{
  severity: "warning",
  code: "flow-step-not-surfaced",
  message: 'Flow "onboarding" step "VerifyEmail" is not in any surface.',
  nodeId: "act_verifyEmail",
  semanticNodeId: "act:verify-email",
  flow: {
    flowNodeId: "flow_onboarding",
    flowSemanticNodeId: "flow:onboarding"
  }
}
```

### `orphaned-flow` (planned)

```ts
{
  severity: "warning",
  code: "orphaned-flow",
  message: 'Flow "legacy" has no surfaced steps.',
  flow: {
    flowNodeId: "flow_legacy",
    flowSemanticNodeId: "flow:legacy"
  }
  // No nodeId — the diagnostic is about the flow itself, not a specific step node
}
```

---

## Migration

No migration needed. The new field is optional and additive. Consumers that ignore `flow` continue to see all existing fields unchanged.

---

## Open Questions

1. **Should `FlowDiagnosticMeta` be its own exported type or inline in `GraphDiagnostic`?** This proposal exports it separately for documentation value and reuse potential. Inline is simpler but loses the named type in API docs.
2. **Should we add `stepIndex` to `FlowDiagnosticMeta` now?** Could be useful for `flow-step-order-gap`, but this proposal prefers to add fields only when a diagnostic needs them (YAGNI).

---

## Related

- `packages/core/src/graph.ts:7-13` — current `GraphDiagnostic` type
- `docs/proposals/Reachability-Diagnostics.md` — reachability diagnostics design (defines the diagnostics that will use these fields)
- `packages/core/src/index.ts:4` — public export of `GraphDiagnostic`
