# @intent-framework/dom

DOM materializer for Intent screens and router.

## Install

```sh
pnpm add @intent-framework/core @intent-framework/dom
```

```sh
npm install @intent-framework/core @intent-framework/dom
```

## What it provides

- `renderDom()` — materialize a screen into semantic HTML
- `renderRouter()` — materialize a router into navigable DOM pages
- Real HTML labels, inputs, buttons, and `aria-live` output
- Reactive action enablement and blocked reasons
- Enter key triggers the default action when unambiguous
- Opt-in screen-name heading via `showScreenName`
- Opt-in semantic data attributes via `showSemanticIds`

## renderDom behavior

### Input types

| Ask kind | Renders as |
|----------|------------|
| `$.state.text()` / default | `<input type="text">` |
| `asContact("email")` | `<input type="email">` with `autocomplete="email"` |
| `asSecret()` | `<input type="password">` |
| `$.state.boolean()` | `<input type="checkbox">` |
| `$.state.choice()` with `asChoice()` | `<select>` with `<option>` elements |

### Boolean and choice asks

Boolean asks render as checkboxes. The checked state is synced with the underlying `BooleanState`.

Choice asks render as `<select>` elements. Options are populated from the `ChoiceState` options array. The selected value is synced with the underlying state.

### Blocked reasons

When an action is disabled due to blocked reasons, the renderer adds:

- `disabled` attribute on the button
- `<p class="intent-blocked-reason" role="alert">` with the first blocked reason text
- `aria-describedby` on the button pointing to the reason element

When the action becomes enabled, the reason element is removed from the DOM and `aria-describedby` is cleared.

### Single-surface output

When a screen has exactly one surface, the output is backward compatible: a single `<main>` element containing one `<form>` with all asks and actions. No surface name suffix is added to DOM ids.

### Multi-surface output

When a screen has multiple surfaces, each surface renders as a separate `<section>` with `aria-label` set to the surface name. Each section contains its own `<form>` with only the items belonging to that surface.

**DOM id suffixes:** All ask inputs, buttons, hint paragraphs, reason paragraphs, and feedback outputs get a `--<surfaceName>` suffix to avoid id collisions.

**Duplicate controls share state:** The same ask appearing in multiple surfaces shares the underlying state. Typing in one surface updates the input in all surfaces.

**Duplicate action buttons:** The same action appearing in multiple surfaces renders separate buttons, all executing the same `executeAct()` call.

**Per-surface feedback:** Each surface gets its own `<output aria-live="polite">` element. Action feedback is updated independently per surface.

**`data-intent-*` semantic ids:** The `data-intent-ask` and `data-intent-action` attributes remain the same across all copies — they identify the semantic node, not the DOM position.

### Enter key default action

When exactly one primary action exists (or exactly one action total), pressing Enter in any text input triggers that action. The Enter hint ("Press Enter to ...") appears reactively when the default action becomes enabled, and is hidden when disabled. Shift/ Meta/ Ctrl/ Alt + Enter are ignored. Enter is ignored on `<textarea>`, `<select>`, and checkbox inputs.

### Options

```ts
renderDom(Screen, {
  target: document.getElementById("root")!,
  showScreenName: true,        // render screen name as <h1>
  showSemanticIds: true,       // add data-intent-screen, data-intent-ask, data-intent-action attributes
})
```

## Minimal example

```ts
import { screen } from "@intent-framework/core"
import { renderDom } from "@intent-framework/dom"

const InviteMember = screen("InviteMember", $ => {
  const email = $.state.text("email")

  const emailAsk = $.ask("Email", email)
    .required()
    .validate(value => value.includes("@") ? true : "Enter a valid email")

  const invite = $.act("Invite member")
    .primary()
    .when(emailAsk.valid, "Enter a valid email first")

  $.surface("main").contains(emailAsk, invite)
})

const cleanup = renderDom(InviteMember, {
  target: document.getElementById("root")!,
})
```

The renderer produces real DOM — labels, inputs, buttons, and an `aria-live` output. No JSX required.

## Where this fits

DOM is a renderer for Intent screens. It depends on `@intent-framework/core` and can optionally integrate with `@intent-framework/router` via `renderRouter()`. It is not the source of truth — the screen definition is.

## Learn more

- [Root README](../../README.md) — project overview and philosophy
- [Quickstart](../../docs/Quickstart.md) — step-by-step guide with DOM rendering
- [Semantic DOM Debugging](../../docs/Semantic-DOM-Debugging.md) — how `showSemanticIds` maps `inspectScreen()` IDs to DOM data attributes
- [Canonical runnable example](../../examples/canonical-invite) — matches the Quickstart one-to-one

## Status

Experimental alpha. APIs may change. Not recommended for production use.
