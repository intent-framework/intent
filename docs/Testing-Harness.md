# Testing Harness Guide

## What `testScreen` is

`testScreen()` is a runtime harness for Intent screens. It creates a `ScreenRuntime`, starts it, and gives you a `ScreenHandle` to interact with the screen semantically — no DOM, no selectors, no render waits.

It is exported from `@intent-framework/testing`.

```ts
import { testScreen } from "@intent-framework/testing"
```

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
```

## How it works

1. `testScreen()` creates a `ScreenRuntime` from the screen definition.
2. The runtime starts — resources with `autoLoad: true` are loaded, `ResourceRef` nodes connect.
3. The callback receives a `ScreenHandle` for semantic interaction.
4. When the callback completes (or throws), the runtime is disposed.

## ScreenHandle API

The `ScreenHandle` returned inside the callback has the following methods:

### `act(label)`

Returns an action assertion object for the given action label (case-insensitive match). Throws if no action with that label exists.

```ts
screen.act("Invite member")
```

**`toBeEnabled()`** — Asserts the action is not blocked by any condition.

```ts
screen.act("Invite member").toBeEnabled()
```

Throws if the action is blocked.

**`toBeBlocked()`** — Asserts the action is blocked (one or more conditions are not met).

```ts
screen.act("Invite member").toBeBlocked()
```

Throws if the action is enabled.

**`toBeBlockedBy(...reasons)`** — Asserts the action is blocked and that the given reason strings are present in its blocked reasons.

```ts
screen.act("Invite member").toBeBlockedBy("Enter a valid email first")
screen.act("Log in").toBeBlockedBy("Enter your email.", "Enter your password.")
```

Throws if the action is enabled or if any specified reason is not in the actual blocked reasons list.

**`run()`** — Executes the action through the runtime.

```ts
await screen.act("Invite member").run()
```

The action handler runs with the runtime's execution context (services). If the action is blocked by a condition, the handler is not called and no invalidation happens.

### `answer(label, value)`

Sets the state value for a given ask label (case-insensitive match). Throws if no ask with that label exists.

```ts
await screen.answer("Email", "ada@example.com")
await screen.answer("Password", "secret")
```

This directly sets the underlying state value, which updates derived conditions (`ask.valid`, etc.) reactively.

### `feedback()`

Returns the status message from the last executed action, or `null` if no action has produced feedback.

```ts
const msg = screen.feedback()
// e.g. "Invitation sent!" or "Failed."
```

The value comes from `act.statusMessage` — set by `.feedback({ success: "...", failure: "..." })` on the action definition.

### `state()`

Returns the raw `ScreenDefinition` object for the screen, giving access to all semantic nodes directly.

```ts
const def = screen.state()
```

### `start()`

Manually starts the runtime. The runtime is already started when `testScreen` enters the callback, but `start()` can be called again for re-initialization. Guards against double-start.

```ts
await screen.start()
```

### `resource(name)`

Returns a resource handle for the given resource name (case-insensitive match). Throws if no resource with that name exists.

```ts
const team = screen.resource("team")
```

**`status()`** — Returns the current resource status: `"idle"`, `"pending"`, `"ready"`, or `"failed"`.

```ts
expect(team.status()).toBe("ready")
```

**`load()`** — Manually runs the resource loader. Returns a promise that resolves when loading completes.

```ts
await screen.resource("team").load()
```

**`reload()`** — Runs the resource loader again. If called without arguments, reuses the context from the previous load.

```ts
await screen.resource("team").reload()
```

**`invalidate()`** — Marks the resource as stale. Does not trigger a reload.

```ts
screen.resource("team").invalidate()
expect(screen.resource("team").stale()).toBe(true)
```

**`stale()`** — Returns `true` if the resource has been invalidated since its last successful load.

```ts
expect(screen.resource("team").stale()).toBe(false)
```

## Asserting action state

### Enabled vs blocked

Use `toBeEnabled()` and `toBeBlocked()` to check binary action state:

```ts
await testScreen(LoginScreen, async screen => {
  // Initially blocked — email and password are empty
  expect(() => screen.act("Log in").toBeBlocked()).not.toThrow()

  await screen.answer("Email", "ada@example.com")
  await screen.answer("Password", "secret")

  // Now enabled
  expect(() => screen.act("Log in").toBeEnabled()).not.toThrow()
})
```

### Blocked reasons

Use `toBeBlockedBy()` to assert specific blocked reasons:

```ts
await testScreen(LoginScreen, async screen => {
  // Both reasons present
  screen.act("Log in").toBeBlockedBy("Enter your email.", "Enter your password.")

  // After answering email, only the password reason remains
  await screen.answer("Email", "ada@example.com")
  screen.act("Log in").toBeBlockedBy("Enter your password.")

  // Answering password enables the action
  await screen.answer("Password", "secret")
  screen.act("Log in").toBeEnabled()
})
```

This is useful for testing that the right blocking conditions are reported to the user.

## Executing actions

Use `act(label).run()` to execute an action through the runtime:

```ts
await testScreen(InviteMember, async screen => {
  await screen.answer("Email", "ada@example.com")
  await screen.act("Invite member").run()
})
```

### Blocked actions do not execute

If the action is blocked, `run()` returns early without calling the handler:

```ts
await testScreen(BlockedScreen, async screen => {
  const navigate = vi.fn()
  await screen.act("Go").run()
  expect(navigate).not.toHaveBeenCalled()
}, { services: { navigate } })
```

### Action execution context

Action handlers receive the execution context with runtime services:

```ts
type AppServices = {
  navigate: (name: string) => void
}

const TestScreen = screen<AppServices>("Test", $ => {
  $.act("Go")
    .when(true)
    .does(({ navigate }) => {
      navigate("somewhere")
    })
})

await testScreen<AppServices>(TestScreen, async screen => {
  await screen.act("Go").run()
}, { services: { navigate: vi.fn() } })
```

## Feedback inspection

Actions with feedback config produce a status message after execution:

```ts
const SaveScreen = screen("Save", $ => {
  $.act("Save")
    .when(true)
    .does(async () => { /* save */ })
    .feedback({ success: "Saved!", failure: "Save failed." })
})

await testScreen(SaveScreen, async screen => {
  await screen.act("Save").run()
  expect(screen.feedback()).toBe("Saved!")
})
```

## Services injection

Pass services to the runtime via the `services` option:

```ts
await testScreen(
  MyScreen,
  async screen => {
    await screen.act("Navigate").run()
    expect(navigate).toHaveBeenCalledWith("login")
  },
  { services: { navigate } }
)
```

Services are available to action handlers and resource loaders as the execution context.

### Typed services

For full type safety, provide a generic type parameter:

```ts
type AppServices = {
  analytics: { track: (event: string) => void }
  navigate: (name: string) => void
}

await testScreen<AppServices>(
  MyScreen,
  async screen => {
    await screen.act("Track and go").run()
  },
  { services: { analytics, navigate } }
)
```

## Resource testing

### Status checks

Assert resource lifecycle states:

```ts
await testScreen(TeamScreen, async screen => {
  expect(screen.resource("team").status()).toBe("ready")
})
```

Resources with `autoLoad: false` start in the `"idle"` state:

```ts
await testScreen(TeamScreen, async screen => {
  expect(screen.resource("searchResults").status()).toBe("idle")
  await screen.resource("searchResults").load()
  expect(screen.resource("searchResults").status()).toBe("ready")
})
```

### Loading

Manually trigger a resource load:

```ts
await testScreen(TeamScreen, async screen => {
  const team = screen.resource("team")
  expect(team.status()).toBe("idle")

  await team.load()
  expect(team.status()).toBe("ready")
})
```

### Reloading

Reload a resource after it has been loaded:

```ts
let callCount = 0
const TeamScreen = screen("ReloadTest", $ => {
  $.resource("team", {
    load: async () => {
      callCount++
      return `data${callCount}`
    },
    autoLoad: false,
  })
})

await testScreen(TeamScreen, async screen => {
  await screen.resource("team").load()
  expect(callCount).toBe(1)

  await screen.resource("team").reload()
  expect(callCount).toBe(2)
})
```

### Invalidation and staleness

Invalidate a resource and check staleness:

```ts
await testScreen(TeamScreen, async screen => {
  expect(screen.resource("team").stale()).toBe(false)

  screen.resource("team").invalidate()
  expect(screen.resource("team").stale()).toBe(true)

  await screen.resource("team").reload()
  expect(screen.resource("team").stale()).toBe(false)
})
```

### Resources update action conditions

After auto-load, resource conditions update and actions become enabled:

```ts
await testScreen(TeamScreen, async screen => {
  // Resource autoloaded on start, act condition is met
  expect(() => screen.act("Save").toBeEnabled()).not.toThrow()
})
```

### Resource load context (services)

Resource loaders receive services as context:

```ts
type TestServices = { route: string }

await testScreen<TestServices>(
  TeamScreen,
  async screen => {
    await screen.resource("team").load()
    // Loader received { route: "/teams/team_1" }
  },
  { services: { route: "/teams/team_1" } }
)
```

## Error handling

### Action not found

```ts
expect(() => screen.act("Nonexistent")).toThrow('Act "Nonexistent" not found.')
```

### Ask not found

```ts
await expect(screen.answer("Fake", "value")).rejects.toThrow('Ask "Fake" not found.')
```

### Resource not found

```ts
expect(() => screen.resource("nonexistent")).toThrow('Resource "nonexistent" not found.')
```

## Where this fits

Testing provides a runtime harness for Intent screens. It depends on `@intent-framework/core`. Use it with any test runner (Vitest recommended). It pairs with `inspectScreen()` for diagnostics assertions.

### Comparison with inspectScreen

| Purpose | `testScreen` | `inspectScreen` |
|---------|-------------|-----------------|
| Runtime execution | Yes | No |
| Action execution | Yes | No |
| State mutation | Yes (via answer) | No |
| Diagnostics | No | Yes |
| Semantic graph snapshot | No | Yes |
| Blocked reason assertions | Yes | Read-only |

Use `testScreen()` when you need to test dynamic behavior — answering asks, executing actions, loading resources, asserting blocked reasons. Use `inspectScreen()` for static graph structure and diagnostics.

## See also

- [Quickstart](Quickstart.md) — step-by-step guide with testing
- [Inspect Screen and Diagnostics Guide](Inspect-Screen.md) — graph inspection and diagnostics
- [Resources Guide](Resources.md) — resource semantics
- [Root README](../README.md) — project overview
- [Canonical runnable example](../examples/canonical-invite) — matches the Quickstart one-to-one
