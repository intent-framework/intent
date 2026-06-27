# Intent Quickstart

**Product intent is the program.**

This guide shows the fastest path from zero to a semantic screen using published alpha packages.

## 1. Install

```sh
pnpm add @intent-framework/core@0.1.0-alpha.9 @intent-framework/dom@0.1.0-alpha.9 @intent-framework/testing@0.1.0-alpha.9
```

Or with npm:

```sh
npm install @intent-framework/core@0.1.0-alpha.9 @intent-framework/dom@0.1.0-alpha.9 @intent-framework/testing@0.1.0-alpha.9
```

The quickstart pins `0.1.0-alpha.9` so the examples match the APIs shown below.

You also need `typescript` and `vitest` for type checking and tests.

The router (`@intent-framework/router`) and server (`@intent-framework/server`) are separate — the quickstart stays screen-first.

## 2. Define a screen

Create a file that describes what the screen means, not what it looks like:

```ts
import { screen } from "@intent-framework/core"

export const InviteMember = screen("InviteMember", $ => {
  const email = $.state.text("email")

  const emailAsk = $.ask("Email", email)
    .required("Email is required")
    .validate(value => value.includes("@") ? true : "Enter a valid email")

  const invite = $.act("Invite member")
    .primary()
    .when(emailAsk.valid, "Enter a valid email first")
    .does(() => {
      console.log("invite", email.value)
    })

  $.surface("main").contains(emailAsk, invite)
})
```

This describes:

- A screen named `InviteMember`
- A text state named `email`
- An ask labelled `Email` that is required and validated
- A primary action labelled `Invite member` that is blocked until the email is valid
- A surface named `main` that groups the ask and action

State, validation, actions, and surfaces are semantic nodes — not yet DOM.

## 3. Render with DOM

The DOM renderer materializes the screen into real HTML. No JSX required.

```ts
import { renderDom } from "@intent-framework/dom"
import { InviteMember } from "./InviteMember.js"

const root = document.getElementById("root")!
renderDom(InviteMember, { target: root })
```

This produces:

```html
<main>
  <form method="POST" novalidate>
    <div class="ask-group">
      <label for="ask_email">Email</label>
      <input id="ask_email" name="ask_email" type="text" required />
    </div>
    <button id="act_invite_member" type="button" class="primary" disabled>
      Invite member
    </button>
    <output id="feedback-output" aria-live="polite"></output>
  </form>
</main>
```

- Labels, inputs, buttons, and live regions are real DOM.
- The submit button is initially disabled because the email is empty.
- Typing a valid email enables the button reactively.
- Pressing Enter triggers the default action when unambiguous.

The DOM renderer also accepts services and options:

```ts
renderDom(InviteMember, {
  target: root,
  showScreenName: true,      // show screen name as <h1>
  showSemanticIds: true,     // add data-intent-* attributes for debugging
})
```

With `showSemanticIds: true`, the DOM includes `data-intent-screen`, `data-intent-ask`, and `data-intent-action` attributes that map rendered elements back to their `inspectScreen()` semantic IDs.

## 4. Test semantically

The testing package lets you assert product behavior without touching the DOM:

```ts
import { test, expect } from "vitest"
import { testScreen } from "@intent-framework/testing"
import { InviteMember } from "./InviteMember.js"

test("invite is blocked until email is valid", async () => {
  await testScreen(InviteMember, async app => {
    await app.act("Invite member").toBeBlockedBy("Enter a valid email first")

    await app.answer("Email", "ada@example.com")

    await app.act("Invite member").toBeEnabled()
  })
})

test("invite feedback shows after execution", async () => {
  await testScreen(InviteMember, async app => {
    await app.answer("Email", "ada@example.com")
    await app.act("Invite member").run()
    // Action status is available via feedback()
  })
})
```

The harness:

- Creates a runtime for the screen
- Answers asks by setting state directly
- Checks action enabled/blocked state via semantic conditions
- Executes actions through the runtime context

No DOM, no selectors, no waiting for renders. Tests speak product language.

## 5. Inspect the semantic graph

`inspectScreen()` returns a snapshot of the screen's semantic nodes, their states, and diagnostics:

```ts
import { inspectScreen } from "@intent-framework/core"
import { InviteMember } from "./InviteMember.js"

const graph = inspectScreen(InviteMember)
console.log(JSON.stringify(graph, null, 2))
```

Example output:

```json
{
  "name": "InviteMember",
  "semanticId": "screen:invite-member",
  "asks": [
    {
      "id": "ask_email",
      "semanticId": "ask:email",
      "label": "Email",
      "kind": "text",
      "required": true,
      "valid": false,
      "error": "Email is required"
    }
  ],
  "acts": [
    {
      "id": "act_invite_member",
      "semanticId": "action:invite-member",
      "label": "Invite member",
      "primary": true,
      "enabled": false,
      "blockedReasons": ["Enter a valid email first"]
    }
  ],
  "surfaces": [
    {
      "id": "surface_main",
      "semanticId": "surface:main",
      "name": "main",
      "itemCount": 2
    }
  ],
  "diagnostics": []
}
```

Every node carries a stable, deterministic `semanticId`:

| Node | semanticId |
|------|------------|
| Screen | `screen:invite-member` |
| Ask | `ask:email` |
| Action | `action:invite-member` |
| Surface | `surface:main` |

Diagnostics catch common authoring mistakes — multiple primary actions, secret asks that are not private, nodes not included in any surface.

## 6. What just happened?

You defined a screen in product terms — not as components, markup, or CSS classes.

- **The screen describes product intent.** It says: there is an email to collect, an invite action to offer, and a rule that the invite is blocked until the email is valid.
- **The DOM renderer materialized** that intent into real, inspectable HTML with labels, inputs, disabled states, and live regions — automatically.
- **The testing harness validated** that the action is blocked for the right reason and becomes enabled when the ask is satisfied — without touching the DOM.
- **`inspectScreen()` exposed the graph** for diagnostics and future tooling (DevTools, analytics, code generation).

This is the pattern:

```txt
Screen intent → Semantic graph → Materialized output (DOM, tests, diagnostics)
```

Intent does not replace components for everything. It replaces components as the source of truth for product behavior.

---

**Next steps:**

1. Run the [canonical example](../examples/canonical-invite) — it matches this Quickstart one-to-one:
   ```sh
   pnpm dev:canonical
   ```
2. See the [web demo](../examples/web-basic) for a full team invite flow with routing, resources, and diagnostics.
3. Read the [Resources Guide](Resources.md) for resource semantics — load, reload, invalidation, runtime scoping.
4. Read the [Specification](Specification.md) for the architecture.
5. Read the [Inspect Screen and Diagnostics Guide](Inspect-Screen.md) for a detailed walkthrough of `inspectScreen()`, diagnostics, and semantic IDs.
6. Check the [MVP Checkpoint](MVP-Checkpoint.md) for current boundaries.
