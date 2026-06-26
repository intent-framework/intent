# Semantic DOM Debugging

## Problem

You are looking at a rendered Intent screen in the browser and want to know which semantic node each DOM element corresponds to. The DOM class names and IDs are internal renderer details, not product semantics.

## Solution

Pass `showSemanticIds: true` to `renderDom()` or `renderRouter()`. The renderer adds `data-intent-*` attributes to key DOM elements, mapping them to the same semantic IDs produced by `inspectScreen()`.

## Data attributes produced

| Attribute | On element | Value example |
|-----------|-----------|--------------|
| `data-intent-screen` | `<main>` | `screen:invite-member` |
| `data-intent-ask` | `<label>`, `<input>` | `ask:email` |
| `data-intent-action` | `<button>` | `action:invite-member` |

The attribute values are the same `semanticId` strings documented in the [Inspect Screen and Diagnostics Guide](Inspect-Screen.md).

## Usage

### With `renderDom()`

```ts
import { renderDom } from "@intent-framework/dom"

const cleanup = renderDom(MyScreen, {
  target: document.getElementById("root")!,
  showSemanticIds: true,
})
```

### With `renderRouter()`

```ts
import { renderRouter } from "@intent-framework/dom"

const handle = renderRouter(myRouter, {
  target: document.getElementById("root")!,
  showSemanticIds: true,
})
```

### Opt-in only

By default, no `data-intent-*` attributes are emitted. Your production output is unaffected. Enable the flag only during development or in debug builds.

## Debugging workflow

### 1. Enable semantic IDs

```ts
renderDom(MyScreen, {
  target: document.getElementById("root")!,
  showSemanticIds: import.meta.env.DEV, // only in dev
})
```

### 2. Inspect in browser DevTools

Open the Elements panel. Select any rendered label, input, or button. The `data-intent-ask` or `data-intent-action` attribute tells you which semantic node it belongs to.

Example — inspecting a rendered email input:

```html
<main data-intent-screen="screen:invite-member">
  <form method="POST" novalidate>
    <div class="ask-group">
      <label for="ask_email" data-intent-ask="ask:email">Email</label>
      <input id="ask_email" name="ask_email" type="email" required autocomplete="email" data-intent-ask="ask:email">
    </div>
    <button id="act_invite_member" type="button" data-intent-action="action:invite-member">Invite member</button>
    <output id="feedback-output" aria-live="polite"></output>
  </form>
</main>
```

### 3. Cross-reference with `inspectScreen()`

Open the console and run:

```js
import { inspectScreen } from "@intent-framework/core"
console.log(inspectScreen(MyScreen))
```

The `semanticId` values in the console output match the `data-intent-*` attribute values in the Elements panel.

### 4. Use in tests

Query elements by their semantic attributes in browser tests:

```ts
const emailInput = document.querySelector('[data-intent-ask="ask:email"]')
const inviteButton = document.querySelector('[data-intent-action="action:invite-member"]')
const screen = document.querySelector('[data-intent-screen="screen:invite-member"]')
```

This is more resilient than querying by generated class names or internal IDs, and expresses the test's intent at the semantic level.

## How the mapping works

When `showSemanticIds: true` is set, `renderDom()` calls `inspectScreen()` internally to resolve the semantic IDs for every ask and action node. It then applies them as data attributes during DOM construction.

The mapping is:

1. `renderDom()` calls `inspectScreen(screenDef)`.
2. The returned `InspectedScreen` object contains `asks[].semanticId` and `acts[].semanticId` values.
3. These values are matched to DOM elements by the internal node `id` field (e.g., `ask_email`, `act_invite_member`).
4. The semantic ID is set as the corresponding `data-intent-*` attribute.

This is the same `inspectScreen()` call you would make manually — no extra computation, just reuse of the existing graph snapshot.

### Screen-level attribute

The `<main>` element receives `data-intent-screen` with the screen's own `semanticId`:

```ts
main.setAttribute("data-intent-screen", inspected.semanticId)
```

The screen `semanticId` follows the same normalization rules: `screen("InviteMember")` → `screen:invite-member`.

## What is not included

- **Floating blocked-reason paragraphs** (`<p id="act_*-reason">`) — these are runtime feedback, not semantic nodes. They do not receive data attributes.
- **Enter-key hints** (`<p id="*-enter-hint">`) — UI affordance, not a semantic node.
- **Feedback output** (`<output>`) — runtime status, not a semantic node.
- **Flow elements** — flows are graph concepts without a DOM representation.
- **Surface elements** — the surface's DOM id is set from the surface's internal id, but no `data-intent-surface` attribute is added. The `<main>` element id doubles as the surface id.

## Example end-to-end

Given this screen:

```ts
const InviteScreen = screen("InviteMember", $ => {
  const email = $.state.text("email")
  const emailAsk = $.ask("Email", email).required()
  const invite = $.act("Invite member").primary().when(emailAsk.valid)
  $.surface("main").contains(emailAsk, invite)
})
```

Rendering with `showSemanticIds: true` produces DOM elements with these attributes:

| DOM element | Attribute | Value |
|------------|-----------|-------|
| `<main>` | `data-intent-screen` | `screen:invite-member` |
| `<label>` | `data-intent-ask` | `ask:email` |
| `<input>` | `data-intent-ask` | `ask:email` |
| `<button>` | `data-intent-action` | `action:invite-member` |

Calling `inspectScreen(InviteScreen)` returns matching `semanticId` values:

```json
{
  "name": "InviteMember",
  "semanticId": "screen:invite-member",
  "asks": [
    {
      "id": "ask_email",
      "semanticId": "ask:email",
      "label": "Email"
    }
  ],
  "acts": [
    {
      "id": "act_invite_member",
      "semanticId": "action:invite-member",
      "label": "Invite member"
    }
  ]
}
```

## See also

- [Inspect Screen and Diagnostics Guide](Inspect-Screen.md) — full `inspectScreen()` reference, semantic ID rules, and diagnostics reference.
- [Quickstart](Quickstart.md) — step-by-step guide with `renderDom()`.
- [Root README](../README.md) — project overview.
