# @intent-framework/core

## 0.1.0-alpha.5

### Minor Changes

- 95cb82f: Add public `FlowDiagnosticMeta` type and optional `flow` metadata to `GraphDiagnostic` for future flow-scoped diagnostics.
- b76a1e0: Add `flow-step-not-surfaced` diagnostic to `inspectScreen` for flow steps missing from surfaces.
- 57b8bda: Add `orphaned-flow` diagnostic to `inspectScreen` for flows with no surfaced steps.

  `inspectScreen` now reports `severity: "warning"` diagnostics with code `orphaned-flow`
  when a flow has one or more steps but none of its steps appear in any surface.

## 0.1.0-alpha.4

### Patch Changes

- 8150b8d: Fix npm package README: remove stale version pins from install commands and status sections.

## 0.1.0-alpha.2

### Patch Changes

- 9d07535: Add `surfaced-node-not-in-any-flow` reachability diagnostic to `inspectScreen`.

## 0.1.0-alpha.1

### Patch Changes

- 73ab269: Add stable semantic node IDs to `inspectScreen` output so diagnostics and graph inspection can reference deterministic semantic nodes.
