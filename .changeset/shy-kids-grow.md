---
"@intent-framework/core": minor
---

Add `orphaned-flow` diagnostic to `inspectScreen` for flows with no surfaced steps.

`inspectScreen` now reports `severity: "warning"` diagnostics with code `orphaned-flow`
when a flow has one or more steps but none of its steps appear in any surface.
