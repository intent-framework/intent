---
"@intent-framework/dom": patch
---

DOM rendering now uses proper controls for boolean and choice asks: boolean-backed asks render as checkboxes, choice asks render as select elements. Blocked reason elements now include an `intent-blocked-reason` class and `role="alert"` for accessible error feedback. Enter key default action is disabled for non-text inputs (checkbox, select).
