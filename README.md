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
- `@intent/dom` - real semantic HTML renderer (form, label, input, button, output); each action renders as an independently executable button
- `@intent/testing` - semantic test harness (answer asks, assert act state, load resources)
- `@intent/server` - typed action/resource/policy skeleton
- `examples/web-basic` - Login screen + route-driven team invite app demonstrating typed navigation, route context, runtime-scoped resources, action blocked reasons, semantic asks/acts/surfaces, and multiple independent actions per screen
- `inspectScreen()` includes semantic diagnostics for common graph footguns, including ambiguous primary actions and unsurfaced asks/actions.

## Quick Example

```ts
import { screen } from "@intent/core"
import { renderDom } from "@intent/dom"

const LoginScreen = screen("Login", $ => {
  const email = $.state.text("email")
  const password = $.state.text("password")

  const emailAsk = $.ask("Email", email).asContact("email").required().private()
  const passwordAsk = $.ask("Password", password).asSecret().required().private()

  const login = $.act("Log in")
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
    <button type="button" disabled>Log in</button>
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

## Action Navigation

Actions can navigate using a runtime-provided service. When rendered through `renderRouter()`, the router provides navigation to actions:

```ts
import { screen } from "@intent/core"
import { renderRouter } from "@intent/dom"

const LoginScreen = screen("Login", $ => {
  $.act("Go to home")
    .primary()
    .does(({ navigate }) => {
      navigate?.("home")
    })
  $.surface("main").contains()
})
```

The `navigate` function is available in the action execution context. The service is provided by the runtime — core only knows the abstract interface:

```ts
navigate?.("login")                              // static route
navigate?.("team.details", { teamId: "team_1" }) // dynamic route
```

Direct calls to `screen.act(...).execute()` without context still work.

### Typed Navigation

Route-map-derived types give typed navigation inside action context:

```ts
import { screen } from "@intent/core"
import { type RouterServices, type RoutesFromPaths } from "@intent/router"

const appPaths = { home: "/", login: "/login" } as const
type AppRoutes = RoutesFromPaths<typeof appPaths>
type AppServices = RouterServices<AppRoutes>

const Home = screen<AppServices>("Home", $ => {
  const goLogin = $.act("Go login").does(({ navigate }) => {
    navigate("login")
    // navigate("login", {})  // type error: static route rejects params
  })

  $.surface("main").contains(goLogin)
})
```

Extra services can be added alongside typed navigate:

```ts
type AppServices = RouterServices<AppRoutes, {
  analytics: { track(event: string): void }
}>
```

### Route Context

Routed screens can access matched route params inside action handlers:

```ts
import { type RouteContext, type RouterServices, type RoutesFromPaths } from "@intent/router"

const appPaths = { home: "/", "team.invite": "/teams/:teamId/invite" } as const
type AppRoutes = RoutesFromPaths<typeof appPaths>
type AppServices = RouterServices<AppRoutes, {
  route: RouteContext<AppRoutes>
}>

const Team = screen<AppServices>("Team", $ => {
  $.act("Accept invite")
    .does(({ route }) => {
      if (route.name === "team.invite") {
        console.log(route.params.teamId)
      }
    })
  $.surface("main").contains()
})
```

`renderRouter()` injects the route context automatically. For not-found screens, route is absent.

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

### Login Screen

```sh
cd examples/web-basic
pnpm dev
```

Open `http://localhost:5173/` or `http://localhost:5173/login` to see typed navigation.

The example demonstrates:
- `createRouter` and `renderRouter` with three routes: home, team details (`/teams/:teamId`), and team invite (`/teams/:teamId/invite`)
- Typed navigation with route params in action handlers
- Route context injection into action handlers and resource loaders
- Runtime-scoped resource loading (`$.resource` with route-param-driven load)
- Action blocked reasons (ask validation blocks an action until the email is valid)
- Action feedback (pending/success/failure states)
- `$.flow` for interaction sequencing
- Semantic asks with contact type, required, and private metadata

## Architecture

Intent starts from the semantic graph, not the component tree.

```
Developer authors intent → Semantic graph → DOM/resource/test materialization
```
