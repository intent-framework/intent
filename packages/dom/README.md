# @intent-framework/dom

DOM materializer for Intent screens and router.

## Install

```sh
pnpm add @intent-framework/core@0.1.0-alpha.1 @intent-framework/dom@0.1.0-alpha.1
```

```sh
npm install @intent-framework/core@0.1.0-alpha.1 @intent-framework/dom@0.1.0-alpha.1
```

## What it provides

- `renderDom()` — materialize a screen into semantic HTML
- `renderRouter()` — materialize a router into navigable DOM pages
- Real HTML labels, inputs, buttons, and `aria-live` output
- Reactive action enablement and blocked reasons
- Enter key triggers the default action when unambiguous
- Opt-in screen-name heading via `showScreenName`
- Opt-in semantic data attributes via `showSemanticIds` for debugging and tooling

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
- [Canonical runnable example](../../examples/canonical-invite) — matches the Quickstart one-to-one

## Status

Experimental alpha. Version `0.1.0-alpha.1`. APIs may change. Not recommended for production use.
