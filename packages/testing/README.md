# @intent-framework/testing

Semantic test harness for Intent screens.

## Install

```sh
pnpm add -D @intent-framework/testing
```

```sh
npm install --save-dev @intent-framework/testing
```

## What it provides

- `testScreen()` — create a runtime and run semantic assertions
- Answer asks by setting state directly
- Assert action enabled/blocked state and blocked reasons
- Execute actions through the runtime
- Inspect feedback after action execution
- Test resource load, reload, invalidation, and staleness

## Minimal example

```ts
import { test, expect } from "vitest"
import { testScreen } from "@intent-framework/testing"
import { screen } from "@intent-framework/core"

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

test("invite is blocked until email is valid", async () => {
  await testScreen(InviteMember, async app => {
    await app.act("Invite member").toBeBlockedBy("Enter a valid email first")
    await app.answer("Email", "ada@example.com")
    await app.act("Invite member").toBeEnabled()
  })
})

test("invite action can be executed", async () => {
  await testScreen(InviteMember, async app => {
    await app.answer("Email", "ada@example.com")
    await app.act("Invite member").run()
  })
})
```

No DOM, no selectors, no render waits. Tests speak product language.

## Where this fits

Testing provides a runtime harness for Intent screens. It depends on `@intent-framework/core`. Use it with any test runner (Vitest recommended). It pairs with `inspectScreen()` for diagnostics assertions.

## Learn more

- [Testing Harness Guide](../../docs/Testing-Harness.md) — full API reference, resource testing, services injection
- [Root README](../../README.md) — project overview and testing philosophy
- [Quickstart](../../docs/Quickstart.md) — step-by-step guide with testing
- [Canonical runnable example](../../examples/canonical-invite) — matches the Quickstart one-to-one

## Status

Experimental alpha. APIs may change. Not recommended for production use.
