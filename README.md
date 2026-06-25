# Intent

Intent is a semantic full-stack interaction framework for TypeScript applications.

Product intent is the program.

## MVP Status

The first working proof is implemented.

What works:

- `screen` - define interaction screens
- `state.text`, `state.boolean`, `state.choice` - reactive state with getter/setter
- `ask` - semantic questions with required validation, custom validation, privacy, input types
- `act` - actions with reactive conditions, async handlers, feedback states
- `resource` - async resources with load/reload lifecycle, auto-load policy, and reactive conditions
- `createScreenRuntime` - runtime lifecycle (start auto-loads resources, dispose cleans up)
- `flow` - interaction sequencing
- `surface` - presentation grouping
- `@intent/dom` - real semantic HTML renderer (form, label, input, button, output)
- `@intent/testing` - semantic test harness (answer asks, assert act state, load resources)
- `@intent/server` - typed action/resource/policy skeleton
- `examples/web-basic` - Login screen without JSX or manual DOM

## Quick Example

```ts
import { screen } from "@intent/core"
import { renderDom } from "@intent/dom"

const LoginScreen = screen("Login", $ => {
  const email = $.state.text("email")
  const password = $.state.text("password")

  $.ask("Email", email).asContact("email").required().private()
  $.ask("Password", password).asSecret().required().private()

  $.act("Log in")
    .primary()
    .when(emailAsk.valid)
    .when(passwordAsk.valid)
    .does(async () => { await loginUser({ email: email.value, password: password.value }) })
    .feedback({ pending: "Logging in...", success: "Logged in.", failure: "Could not log in." })

  $.surface("main").contains(emailAsk, passwordAsk, login)
})

renderDom(LoginScreen, { target: document.getElementById("root")! })
```

Outputs real semantic HTML:

```html
<main>
  <form>
    <label>Email</label><input type="email" autocomplete="email" required />
    <label>Password</label><input type="password" required />
    <button type="submit" disabled>Log in</button>
    <output aria-live="polite"></output>
  </form>
</main>
```

## Resources

Resources let screens declare async data dependencies semantically:

```ts
const team = $.resource("team", {
  load: async () => getTeam(teamId.value)
})

// Reactive conditions
const invite = $.act("Send invite")
  .when(team.ready, "Team must load first.")

// Lifecycle
await team.load()       // idle → pending → ready/failed
await team.reload()     // re-fetch
team.status             // "idle" | "pending" | "ready" | "failed"
team.value              // T | undefined
team.ready.current      // boolean
```

### Invalidation

Actions can declare which resources become stale after success:

```ts
const team = $.resource("team", {
  load: async () => getTeam()
})

const save = $.act("Save")
  .does(saveTeam)
  .invalidates(team)
// or multiple:
// .invalidates(team, members)
```

Semantics:

- `resource.invalidate()` marks the resource stale without clearing the value.
- `resource.stale.current` is a reactive Condition.
- `resource.ready.current` remains `true` even when stale — readiness and staleness are independent.
- Successful load clears stale; failed load also clears stale (the refresh was attempted).
- Invalidation fires stale condition subscribers.

Resources support an auto-load policy (default `true`):

```ts
// Auto-loads when the screen starts
const team = $.resource("team", {
  load: async () => getTeam()
})

// Manual/lazy — load only when explicitly triggered
const searchResults = $.resource("searchResults", {
  load: async () => search(query.value),
  autoLoad: false
})
```

## Screen Runtime

A runtime starts a screen instance and triggers lifecycle behavior such as resource auto-loading:

```ts
import { createScreenRuntime } from "@intent/core"
import { screen } from "@intent/core"
import { renderDom } from "@intent/dom"

const MyScreen = screen("MyScreen", $ => { /* ... */ })

// Manual runtime
const runtime = createScreenRuntime(MyScreen)
await runtime.start()     // auto-loads resources
runtime.screen            // ScreenDefinition
runtime.graph             // snapshot via inspectScreen
runtime.resources         // resource nodes
runtime.dispose()         // cleanup

// DOM renderer creates and starts a runtime automatically
renderDom(MyScreen, { target: document.getElementById("root")! })
```

## Router

```ts
import { createRouter } from "@intent/router"
import { renderRouter } from "@intent/dom"

const router = createRouter()
  .route("home", "/", HomeScreen)
  .route("login", "/login", LoginScreen)
  .route("team.invite", "/teams/:teamId/invite", InviteMemberScreen)

// Type-safe path building
router.path("home")                                 // "/"
router.path("team.invite", { teamId: "team_1" })    // "/teams/team_1/invite"
// router.path("team.invite")                       // type error: missing params
// router.path("team.invite", { wrong: "x" })       // type error: wrong param

// Typed match results
const match = router.match("/teams/team_1/invite")

if (match.found) {
  match.name       // "home" | "login" | "team.invite"
  match.params     // { teamId: "team_1" }
  match.screen     // InviteMemberScreen
}

// Browser router shell — renders matched screens to the DOM
const app = renderRouter(router, {
  target: document.getElementById("root")!,
})

// Typed imperative navigation
app.navigate("login")
app.navigate("team.invite", { teamId: "team_1" })

app.dispose()
```

## Semantic Tests

```ts
import { testScreen } from "@intent/testing"

await testScreen(LoginScreen, async screen => {
  expect(screen.act("Log in")).toBeBlocked()
  await screen.answer("Email", "mahyar@example.com")
  await screen.answer("Password", "secret")
  expect(screen.act("Log in")).toBeEnabled()
})
```

## Packages

| Package | Description |
|---------|-------------|
| `@intent/core` | Semantic graph builder. Zero DOM/React/Node dependencies. |
| `@intent/dom` | DOM renderer. Real semantic HTML. No JSX, no React. |
| `@intent/router` | Typed router. Map URL paths to semantic screens. |
| `@intent/testing` | Semantic test harness. Test intent, not DOM. |
| `@intent/server` | Typed server actions, resources, policies. |

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

## Examples

```sh
cd examples/web-basic
pnpm dev
```

## Architecture

Intent starts from the semantic graph, not the component tree.

```
Developer authors intent → Semantic graph → DOM/resource/test materialization
```
