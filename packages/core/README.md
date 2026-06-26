# @intent-framework/core

Platformless semantic graph and runtime for Intent applications.

## Install

```sh
pnpm add @intent-framework/core
```

```sh
npm install @intent-framework/core
```

## What it provides

- `screen()` — define a semantic interaction space
- `$.state.text()` / `$.state.boolean()` / `$.state.choice()` — reactive state
- `$.ask()` — user-facing question with validation
- `$.act()` — executable action with conditions, lifecycle, and feedback
- `$.resource()` — async state with load/reload lifecycle
- `$.surface()` — named containment surface
- `createScreenRuntime()` — runtime that owns screen state and resources
- `inspectScreen()` — semantic graph snapshot with diagnostics
- Condition and signal primitives

## Minimal example

```ts
import { screen, inspectScreen } from "@intent-framework/core"

const InviteMember = screen("InviteMember", $ => {
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

const graph = inspectScreen(InviteMember)
console.log(graph.diagnostics)
```

## Where this fits

Core defines the product graph. It has no DOM, React, Node, or framework dependencies. Renderers (`@intent-framework/dom`), the router (`@intent-framework/router`), and testing (`@intent-framework/testing`) all build on core.

## Learn more

- [Root README](../../README.md) — project overview and philosophy
- [Quickstart](../../docs/Quickstart.md) — step-by-step guide
- [Inspect Screen and Diagnostics Guide](../../docs/Inspect-Screen.md) — graph inspection and diagnostics
- [Resources Guide](../../docs/Resources.md) — resource lifecycle and runtime scoping
- [MVP Checkpoint](../../docs/MVP-Checkpoint.md) — current implementation boundaries

## Status

Experimental alpha. APIs may change. Not recommended for production use.
