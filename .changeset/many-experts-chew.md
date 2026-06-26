---
"@intent-framework/dom": patch
---

renderDom now renders each surface as a separate `<section>` with accessible label and unique DOM id. Multi-surface screens use `--<surfaceName>` suffixed DOM ids to avoid duplicates. Duplicate ask controls across surfaces share underlying state; duplicate action buttons execute the same action. Single-surface screens preserve backward-compatible DOM output with no suffixing or section wrappers.

