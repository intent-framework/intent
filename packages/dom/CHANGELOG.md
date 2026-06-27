# @intent-framework/dom

## 0.1.0-alpha.10

### Patch Changes

- Updated dependencies [95b68b4]
  - @intent-framework/core@0.1.0-alpha.10
  - @intent-framework/router@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Updated dependencies [ba62d1d]
  - @intent-framework/core@0.1.0-alpha.9
  - @intent-framework/router@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies [d403398]
  - @intent-framework/core@0.1.0-alpha.8
  - @intent-framework/router@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- 2185136: renderDom now renders each surface as a separate `<section>` with accessible label and unique DOM id. Multi-surface screens use `--<surfaceName>` suffixed DOM ids to avoid duplicates. Duplicate ask controls across surfaces share underlying state; duplicate action buttons execute the same action. Single-surface screens preserve backward-compatible DOM output with no suffixing or section wrappers.
  - @intent-framework/core@0.1.0-alpha.7
  - @intent-framework/router@0.1.0-alpha.7

## 0.1.0-alpha.6

### Patch Changes

- ce52d3e: DOM rendering now uses proper controls for boolean and choice asks: boolean-backed asks render as checkboxes, choice asks render as select elements. Blocked reason elements now include an `intent-blocked-reason` class and `role="alert"` for accessible error feedback. Enter key default action is disabled for non-text inputs (checkbox, select).
  - @intent-framework/core@0.1.0-alpha.6
  - @intent-framework/router@0.1.0-alpha.6

## 0.1.0-alpha.5

### Patch Changes

- Updated dependencies [95cb82f]
- Updated dependencies [b76a1e0]
- Updated dependencies [57b8bda]
  - @intent-framework/core@0.1.0-alpha.5
  - @intent-framework/router@0.1.0-alpha.5

## 0.1.0-alpha.4

### Patch Changes

- 8150b8d: Fix npm package README: remove stale version pins from install commands and status sections.
- Updated dependencies [8150b8d]
  - @intent-framework/core@0.1.0-alpha.4
  - @intent-framework/router@0.1.0-alpha.4

## 0.1.0-alpha.3

### Patch Changes

- Updated dependencies [9d07535]
  - @intent-framework/core@0.1.0-alpha.2
  - @intent-framework/router@0.1.0-alpha.2

## 0.1.0-alpha.2

### Patch Changes

- 65149c1: Add opt-in `showSemanticIds` rendering support for semantic `data-intent-*` attributes.

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies [73ab269]
  - @intent-framework/core@0.1.0-alpha.1
  - @intent-framework/router@0.1.0-alpha.1
