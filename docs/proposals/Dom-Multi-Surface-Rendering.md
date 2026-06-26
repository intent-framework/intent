# DOM Multi-Surface Rendering

**Status:** Design Proposal  
**Date:** 2026-06-26  
**Author:** Big Pickle  
**Lane:** `renderer/dom`  
**Depends on:** Nothing  
**Affected package:** `@intent-framework/dom`  
**Changeset:** None (proposal-only)

---

## Problem

`renderDom` renders only the first surface (`screenDef.surfaces[0]`) and ignores all others. The graph supports multiple surfaces (`ScreenDefinition.surfaces: SurfaceNode[]`), and examples already define them — `choice-form/RegistrationForm.ts` defines both a `"main"` and a `"sidebar"` surface — but the DOM renderer silently drops all but the first.

### Current behavior (broken)

In `packages/dom/src/index.ts:185`:

```ts
const surface = screenDef.surfaces[0]
```

All asks and actions are then rendered into a single `<form>` inside a single `<main>`, regardless of which surface they belong to. The second surface's contents are never materialized.

---

## Audit: what surfaces currently mean

| Concept | Current state |
|---------|---------------|
| `SurfaceNode` in core | `{ id, name, items: Array<AskNode \| ActNode> }` |
| Multiple surfaces per screen | Supported at the type level. Graph diagnostics correctly check "is this node in ANY surface?" across all surfaces. |
| Surface item types | Asks and Acts. Resources are not items — they appear "through" the asks/acts that reference them, or independently via the runtime. |
| Ordering | Surfaces are rendered in registration order. Items within a surface are rendered in `.contains(...)` argument order. |
| Deduplication | The same AskNode / ActNode can appear in multiple surfaces. The graph already deduplicates surface-membership checks (a node in any surface is considered surfaced). |

---

## Design decisions

### Q1: What should `renderDom` output when a screen has multiple surfaces?

**Answer:** One `<section>` (or `<div>` with `role="region"` and an `aria-label`) per surface, inside the screen's `<main>`.

Each surface section contains only the asks and actions listed in that surface's `items`, in the order they appear in `.contains(...)`.

### Q2: Should each surface render as a separate semantic section?

**Answer:** Yes. Use `<section>` elements with:
- `id` attribute set to the surface's internal id (e.g. `surface_main`, `surface_sidebar`)
- `aria-label` set to the surface name (e.g. `"main"`, `"sidebar"`)
- A heading (`<h2>`) visible only when `showScreenName` is enabled, using the surface name

### Q3: What happens when the same ask/action appears in multiple surfaces?

**Answer:** The same **node** appears in multiple surface sections. This is the correct semantic: one logical state, multiple visual locations.

### Q4: How do we avoid duplicate DOM ids?

**Answer:** All ask inputs, buttons, hint paragraphs, reason paragraphs, and feedback outputs must use unique DOM ids.

If the same `ActNode` or `AskNode` appears in `k` surfaces, its DOM elements must be duplicated `k` times with **different ids**. The simplest scheme: append `--<surfaceName>` to the base id.

Examples:

| Element | Single surface | Multi-surface |
|---------|----------------|---------------|
| Ask input id | `ask_email` | `ask_email--main`, `ask_email--sidebar` |
| Act button id | `act_log_in` | `act_log_in--main`, `act_log_in--sidebar` |
| Blocked reason id | `act_log_in-reason` | `act_log_in-reason--main`, `act_log_in-reason--sidebar` |
| Enter hint id | `ask_email-enter-hint` | `ask_email-enter-hint--main`, `ask_email-enter-hint--sidebar` |
| Feedback output | `feedback-output` | **One per surface**: `feedback-output--main`, `feedback-output--sidebar` |

The `for` attribute on `<label htmlFor>` must match the per-surface input id.

### Q5: Should duplicate controls share the same underlying state?

**Answer:** Yes. Since the same `AskNode` (and therefore the same state object) is referenced in multiple surfaces, typing in surface A updates the same state as typing in surface B. This is the expected behavior — the state is shared.

The event listeners attach to each DOM copy but all write to the same `ask.state.set()`.

### Q6: Should duplicate action buttons execute the same action?

**Answer:** Yes. Clicking "Log in" in surface A and "Log in" in surface B both call `runtime.executeAct(act)` on the same `ActNode`. Execution is idempotent at the semantic level.

### Q7: How should `aria-describedby`, labels, hints, blocked reasons, and Enter default action work across duplicated controls?

**Answer:** Each DOM copy gets its own set of adjacent elements, all suffixed with the surface name.

The reactive subscription logic in `renderDom` must:
- Query buttons and inputs **per surface** (by surface-suffixed id)
- Subscribe to `act.enabled` and update **all** per-surface copies of that act's button, reason element, and aria attributes
- Subscribe to Enter-key default action for **each** per-surface copy of an ask input

For the **Enter default action**: the default action is a screen-level concept. `findDefaultAction(screenDef.acts)` remains unchanged — it operates over all acts regardless of surface. Each ask input in each surface independently listens for Enter and triggers the same default action.

For **`aria-describedby` on ask inputs**: each per-surface copy of an input independently manages its own `aria-describedby` attribute, referencing the surface-suffixed hint id.

For **blocked reasons on act buttons**: each per-surface copy of a button independently manages its own `aria-describedby` pointing to its own surface-suffixed reason `<p>` element.

### Q8: Should `data-intent-*` semantic ids remain the same across duplicated surface occurrences?

**Answer:** Yes. `data-intent-ask` and `data-intent-action` are semantic identifiers, not DOM-positional ones. The same ask/action node gets the same semantic id in every surface where it appears.

```html
<!-- Surface "main" -->
<label data-intent-ask="ask:email">Email</label>
<input data-intent-ask="ask:email" id="ask_email--main" />

<!-- Surface "sidebar" -->
<label data-intent-ask="ask:email">Email</label>
<input data-intent-ask="ask:email" id="ask_email--sidebar" />
```

### Q9: How should resources appear when included in a surface?

**Answer:** Resources are not items in `SurfaceNode.items`. They are loaded by the runtime and their status is available via `ResourceRef` conditions. Resources are visible to the user only indirectly — through the asks/acts that depend on them (via `.when(resource.ready, ...)` or via a loading indicator).

The DOM renderer currently has no explicit resource rendering. A future enhancement could render a resource's status (loading spinner, error message, stale indicator) as an implicit DOM element within each surface where any item depends on that resource. This is **out of scope** for this proposal; see "Future work" below.

For now, resources with autoLoad still load correctly through the runtime, and actions that depend on resource conditions still enable/disable reactively. The only change is that each per-surface copy of a button subscribes to the same `act.enabled` condition independently.

### Q10: What is the smallest implementation plan that preserves current single-surface behavior?

The single-surface case (`screenDef.surfaces.length === 1`) must produce **identical** DOM output to the current implementation, including all ids (no `--surfaceName` suffix when there is only one surface). This maintains backward compatibility for all existing tests and examples.

---

## Implementation plan

### Phase 1: Restructure `buildDom` to iterate over surfaces

**Estimated size:** ~150 lines changed in `packages/dom/src/index.ts`

Replace the single-surface `buildDom` with a `buildSurface` helper called once per surface.

**`buildDom` (top-level):**
```ts
function buildDom(screenDef, showScreenName, showSemanticIds): HTMLElement {
  const main = document.createElement("main")
  // screen-level attributes...
  for (const surface of screenDef.surfaces) {
    const el = buildSurface(screenDef, surface, showScreenName, showSemanticIds, isSingleSurface)
    main.appendChild(el)
  }
  return main
}
```

**`buildSurface` (per surface):**
```ts
function buildSurface(screenDef, surface, showScreenName, showSemanticIds, single): HTMLElement {
  const section = document.createElement("section")
  section.id = single ? surface.id : `${surface.id}--section`
  // surface heading (if showScreenName)...
  const form = document.createElement("form")
  // render only this surface's items...
  // per-surface feedback output...
  return section
}
```

### Phase 2: Suffix DOM ids when multi-surface

When `screenDef.surfaces.length > 1`, all DOM element ids for asks and actions within a surface get a `--<surfaceName>` suffix.

The `--surfaceName` suffix uses the surface `name` (sanitized), e.g. `ask_email--sidebar`.

This means:
- `label.htmlFor` → `ask_email--sidebar`
- `control.id` → `ask_email--sidebar`
- `control.name` → `ask_email--sidebar`
- `button.id` → `act_log_in--sidebar`
- hint ids → `ask_email-enter-hint--sidebar`
- reason ids → `act_log_in-reason--sidebar`
- output ids → `feedback-output--sidebar`

**Helper:**
```ts
function surfaceSuffix(surfaceName: string, isMulti: boolean): string {
  return isMulti ? `--${surfaceName}` : ""
}
```

### Phase 3: Subscribe per-surface copies

The current subscription loop:

```ts
for (const act of screenDef.acts) {
  const button = form.querySelector(`#${act.id}`) as HTMLButtonElement | null
  // subscribe...
}
```

Must become per-surface:

```ts
for (const surface of screenDef.surfaces) {
  for (const item of surface.items) {
    if (item type is ActNode) {
      const button = form.querySelector(`#${item.id}${suffix}`) as HTMLButtonElement | null
      // subscribe...
    }
  }
}
```

Or more practically, iterate over `screenDef.acts` and `screenDef.asks` but query with the surface-specific selector. The safest approach: loop over surfaces, and for each surface, loop over its items, find the existing button in the DOM, and attach the subscription.

The same applies to:
- Button click handlers → `runtime.executeAct(act)` per surface copy
- Status change subscriptions → `updateFeedback(act, outputEl)` per surface output element
- Enter key default → per surface ask copy
- Enter hint reactive toggle → per surface hint and input

### Phase 4: Single feedback output → per-surface feedback outputs

Currently there is one `<output id="feedback-output">` in the form. With multi-surface, each surface gets its own output:

```ts
const output = document.createElement("output")
output.id = `feedback-output${suffix}`
```

The `updateFeedback` calls from status change subscriptions must target the correct per-surface output element.

### Phase 5: Tests

See "Test plan" below.

---

## Files likely to change

| File | Nature of change |
|------|-----------------|
| `packages/dom/src/index.ts` | **Primary.** Restructure `buildDom`, add `buildSurface`, surface-suffixed ids, per-surface subscriptions, per-surface feedback, per-surface Enter key handling. |
| `packages/dom/src/dom.test.ts` | Add multi-surface test suite (see Test Plan). Existing single-surface tests must continue to pass unchanged. |
| `packages/dom/src/dom-router.ts` | Unchanged — delegates to `renderDom`. |

---

## Test plan

### Backward-compatibility tests (must pass before and after)

All existing tests in `dom.test.ts` and `dom-router.test.ts` **must pass without modification**. These all use single-surface screens.

### Multi-surface tests (new)

1. **Two surfaces render as two `<section>` elements**
   - Screen with `"main"` and `"sidebar"` surfaces
   - Expect two `<section>` children inside `<main>`
   - Each section has the correct `aria-label` and `id`

2. **Each surface contains only its own items**
   - `"main"` has asks A, B and act X
   - `"sidebar"` has ask C and act Y
   - Assert DOM: main section has A, B, X; sidebar section has C, Y; no cross-contamination

3. **Duplicate node in two surfaces has surface-suffixed ids**
   - Same ask in `"main"` and `"sidebar"`
   - Expect `ask_email--main` and `ask_email--sidebar`

4. **Duplicate controls share state**
   - Type in `ask_email--main`, assert `ask_email--sidebar` value also changes
   - Vice versa

5. **Duplicate action buttons execute same action**
   - Click button in surface A, assert action ran
   - Click same button in surface B, assert action ran

6. **Blocked reason rendered per-surface for duplicate act**
   - Act with blocked reason in two surfaces
   - Each surface gets its own reason element with surface-suffixed id

7. **`aria-describedby` on button is surface-specific**
   - Button in `"main"` has `aria-describedby="act_log_in-reason--main"`
   - Button in `"sidebar"` has `aria-describedby="act_log_in-reason--sidebar"`

8. **Feedback output per surface**
   - Execute action in surface A — only surface A's output shows feedback
   - Execute same action in surface B — only surface B's output shows feedback

9. **Enter key default action works in both surfaces**
   - Press Enter in ask input in `"main"` — triggers default action
   - Press Enter in ask input in `"sidebar"` — triggers same default action

10. **`data-intent-*` semantic ids are same across surfaces**
    - `showSemanticIds: true` — same `data-intent-ask="ask:email"` on both copies

11. **Cleanup removes all subscriptions across all surfaces**
    - After `cleanup()`, state changes should not update any per-surface copy

---

## Compatibility notes

| Example | Surfaces defined | Current behavior | After multi-surface |
|---------|-----------------|------------------|---------------------|
| `canonical-invite/InviteMember.ts` | 1 (`main`) | Rendered correctly | No change |
| `resource-lifecycle/ResourceDemo.ts` | 1 (`main`) | Rendered correctly | No change |
| `secret-vault` (all 3 screens) | 1 (`main`) each | Rendered correctly | No change |
| `choice-form/RegistrationForm.ts` | 2 (`main`, `sidebar`) | Silently drops "sidebar" | Both surfaces render |
| `web-basic` screens | 1 (`main`) each | Rendered correctly | No change |

The `choice-form` example is the only one that defines multiple surfaces. After implementation, `renderDom(RegistrationForm, ...)` will render both `"main"` and `"sidebar"` sections. The example's `renderDom` call site (in `main.ts`) needs no changes — it will automatically pick up the extra surface.

---

## Future work (not in scope)

- **Resource rendering in surfaces:** Show loading spinners, error states, or stale indicators for resources within surfaces that reference them. Requires adding resource dependencies to surface items or a resource-to-surface mapping.
- **Surface-level layout hints:** Allow surfaces to declare layout roles (nav, sidebar, main, footer) that map to semantic HTML elements.
- **Dynamic surface visibility:** Hide/show surfaces based on conditions.
- **Surface composition:** Surface-within-surface or named slot patterns.

---

## Validation

Before merging the implementation PR:

```sh
pnpm test          # all existing + new tests pass
pnpm typecheck     # no type errors
pnpm build         # clean build
pnpm lint          # no lint errors
pnpm pack:check    # packages are packable
pnpm changeset status  # no unexpected changesets
```
