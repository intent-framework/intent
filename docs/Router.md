# Intent Router Guide

The `@intent-framework/router` package provides typed route definitions and navigation for Intent screens. It maps URL paths to screen definitions and injects type-safe `navigate()` into action handlers.

**The router is transport, not the product model.** Routes describe how users arrive at screens, not what screens are or how they behave. The product model lives in screen definitions, states, resources, and actions — not in URL structure.

---

## Installation

```sh
pnpm add @intent-framework/core @intent-framework/router
```

```sh
npm install @intent-framework/core @intent-framework/router
```

---

## Quick start

```ts
import { createRouter } from "@intent-framework/router"
import { screen } from "@intent-framework/core"

const HomeScreen = screen("Home", $ => {
  $.surface("main").contains()
})

const router = createRouter()
  .route("home", "/", HomeScreen)
  .route("team", "/teams/:teamId", TeamScreen)
  .route("invite", "/teams/:teamId/invite", InviteScreen)

// Match a pathname
const match = router.match("/teams/abc123")
if (match.found) {
  console.log(match.name)    // "team"
  console.log(match.params)  // { teamId: "abc123" }
}

// Build a typed path
router.path("team", { teamId: "abc123" }) // "/teams/abc123"

// List all routes
router.routes() // [{ name, path, screen }, ...]
```

---

## `createRouter()`

Creates a new, empty router. Accepts an optional generic type parameter for screen services.

```ts
const router = createRouter()
const typedRouter = createRouter<AppServices>()
```

### `.route(name, path, screen)`

Registers a route. Returns the router for chaining.

- **`name`** — unique route identifier (e.g. `"team.details"`)
- **`path`** — URL pattern (e.g. `"/teams/:teamId"`)
- **`screen`** — a `ScreenDefinition` created with `screen()`

```ts
const router = createRouter()
  .route("home", "/", HomeScreen)
  .route("team.details", "/teams/:teamId", TeamDetailScreen)
```

Paths are normalized: a leading `/` is added if missing, and a trailing `/` is stripped (except for the root path `"/"`).

Duplicate route names or paths throw at registration time.

### `.match(pathname)`

Matches a pathname against registered routes. Returns a discriminated union:

```ts
type RouteMatch =
  | { found: true; name: string; path: string; params: Record<string, string>; screen: ScreenDefinition }
  | { found: false; pathname: string }
```

Routes are checked in registration order. The first match wins.

```ts
const match = router.match("/teams/abc123")
if (match.found) {
  // match.name, match.params, match.screen available
} else {
  // match.pathname available
}
```

### `.path(name, params?)`

Generates a path string for a named route. Returns the compiled path.

```ts
router.path("home")                        // "/"
router.path("team.details", { teamId: "t1" }) // "/teams/t1"
router.path("invite", { teamId: "t1" })    // "/teams/t1/invite"
```

Throws if the route name is unknown or required params are missing.

### `.routes()`

Returns a copy of all registered route definitions.

```ts
const routes = router.routes()
// [{ name: "home", path: "/", screen: HomeScreen }, ...]
```

---

## Route parameters

Dynamic path segments start with `:` and match any non-empty segment.

| Pattern | Example path | Matches |
|---------|-------------|---------|
| `"/"` | `/` | Root |
| `"/about"` | `/about` | Static |
| `"/users/:userId"` | `/users/abc123` | Single param |
| `"/teams/:teamId/members/:memberId"` | `/teams/t1/members/u2` | Multiple params |

Params are extracted as strings.

### Trailing slash behavior

Trailing slashes are normalized. `/about/` and `/about` match the same route. The root path `"/"` always remains `"/"`.

---

## Typed navigation

The router provides compile-time safety for route names and their required params.

### `RouterNavigate<Routes>`

A typed `navigate` function that enforces correct route names and params:

```ts
import type { RouterNavigate, RoutesFromPaths } from "@intent-framework/router"

const appPaths = {
  home: "/",
  "team.details": "/teams/:teamId",
} as const

type AppRoutes = RoutesFromPaths<typeof appPaths>
type Navigate = RouterNavigate<AppRoutes>

// OK
const n: Navigate = (name, ...args) => {}
n("home")
n("team.details", { teamId: "t1" })

// Type errors:
n("team.details")                     // missing required params
n("team.details", { wrong: "x" })    // wrong param name
n("nonexistent")                      // unknown route name
```

### `RouterServices<Routes, ExtraServices>`

Combines `navigate` with extra application services:

```ts
import type { RouterServices, RoutesFromPaths } from "@intent-framework/router"

const appPaths = { home: "/" } as const
type AppRoutes = RoutesFromPaths<typeof appPaths>

type AppServices = RouterServices<AppRoutes, {
  analytics: { track(event: string): void }
}>

// Services object includes both navigate and analytics
const svc: AppServices = {
  navigate: (name) => {},
  analytics: { track: (e) => {} },
}
```

### Typed `navigate` in screen actions

When screens are typed with `RouterServices`, action handlers receive a fully typed `navigate`:

```ts
import type { RouterServices, RoutesFromPaths, RouteContext } from "@intent-framework/router"

const appPaths = {
  home: "/",
  "team.details": "/teams/:teamId",
} as const

type AppRoutes = RoutesFromPaths<typeof appPaths>
type AppServices = RouterServices<AppRoutes, {
  route: RouteContext<AppRoutes>
}>

const TeamScreen = screen<AppServices>("Team Details", $ => {
  $.act("Back home")
    .does(({ navigate }) => {
      navigate("home")
    })

  $.act("Invite")
    .does(({ navigate, route }) => {
      navigate("team.invite", { teamId: route.params.teamId })
    })

  $.surface("main").contains()
})
```

### `RouteContext<Routes>` and `RouteContextFor<Routes, Name>`

Provides the current route's name, path, and typed params. Useful for actions that need to read the current route context:

```ts
import type { RouteContext, RouteContextFor, RoutesFromPaths } from "@intent-framework/router"

type AppRoutes = RoutesFromPaths<typeof appPaths>

// Shaped as a discriminated union keyed by name
const ctx: RouteContext<AppRoutes> = { name: "team.details", path: "/teams/:teamId", params: { teamId: "t1" } }

// Narrow by name to get typed params
if (ctx.name === "team.details") {
  ctx.params.teamId // string
}
```

---

## `renderRouter()` (DOM integration)

The `@intent-framework/dom` package provides `renderRouter()` to materialize routed screens into the DOM.

```ts
import { renderRouter } from "@intent-framework/dom"
import { router } from "./router.js"

const handle = renderRouter(router, {
  target: document.getElementById("root")!,
  notFound: NotFoundScreen,           // optional fallback screen
  services: { /* custom services */ }, // optional, omits navigate and route
  showScreenName: true,                // optional, shows screen name heading
  showSemanticIds: true,               // optional, adds data-intent-* attributes
})
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `target` | `HTMLElement` | Required. DOM element to render into. |
| `window` | `Window` | Optional. Custom window (for testing, SSR). Defaults to `globalThis.window`. |
| `notFound` | `ScreenDefinition \| ((pathname: string) => ScreenDefinition)` | Optional. Screen to render when no route matches. |
| `services` | `Omit<TServices, "navigate" \| "route">` | Optional. Custom services injected into all screens. |
| `showScreenName` | `boolean` | Optional. Renders a `<h1>` heading with the screen name. |
| `showSemanticIds` | `boolean` | Optional. Adds `data-intent-*` attributes for debugging. |

### Return value

```ts
type RouterDomHandle = {
  navigate(name, ...args): void       // programmatic navigation
  renderPath(pathname: string): void  // render a specific path
  dispose(): void                     // cleanup
}
```

---

## Popstate behavior

`renderRouter()` listens for `popstate` events on the window. When the user clicks browser back/forward, the router re-matches the current `location.pathname` and re-renders the corresponding screen.

Calling `navigate()` (either from the returned handle or from action contexts) calls `history.pushState()` and renders the target path, enabling standard browser navigation behavior.

The `dispose()` method removes the `popstate` listener and cleans up the current render.

---

## Complete example

```ts
import { createRouter } from "@intent-framework/router"
import { screen } from "@intent-framework/core"
import { renderRouter } from "@intent-framework/dom"
import type { RouterServices, RoutesFromPaths, RouteContext } from "@intent-framework/router"

// 1. Define paths
const appPaths = {
  home: "/",
  "team.details": "/teams/:teamId",
} as const

// 2. Derive types
type AppRoutes = RoutesFromPaths<typeof appPaths>
type AppServices = RouterServices<AppRoutes, {
  route: RouteContext<AppRoutes>
}>

// 3. Define screens
const HomeScreen = screen<AppServices>("Home", $ => {
  $.act("Open team")
    .does(({ navigate }) => {
      navigate("team.details", { teamId: "team_1" })
    })
  $.surface("main").contains()
})

const TeamScreen = screen<AppServices>("Team Details", $ => {
  $.act("Back")
    .does(({ navigate }) => {
      navigate("home")
    })
  $.surface("main").contains()
})

// 4. Create router
const router = createRouter<AppServices>()
  .route("home", appPaths.home, HomeScreen)
  .route("team.details", appPaths["team.details"], TeamScreen)

// 5. Render
renderRouter(router, {
  target: document.getElementById("root")!,
  notFound: screen("Not Found", $ => { $.surface("main").contains() }),
  showScreenName: true,
})
```

---

## Current non-goals

The following are intentionally not part of the router at this stage:

| Feature | Status |
|---------|--------|
| Nested/layout routes | Not implemented |
| Route guards / middleware | Not implemented |
| Lazy loading / code splitting | Not implemented |
| Query string parsing | Not implemented |
| Hash-based routing | Not implemented |
| SSR / server-side matching | Not implemented |
| Scroll restoration | Not implemented |
| Link components | DOM renderer uses actions; no `<a>` generation |
| Route metadata / titles | Screen names serve this role |
| Redirects | Not implemented |

These may be added in future iterations as the framework matures. The router is designed to remain focused on typed path-to-screen mapping without accumulating app-model responsibilities.

---

## Related

- [@intent-framework/router README](../packages/router/README.md) — package reference
- [DOM guide](Semantic-DOM-Debugging.md) — DOM rendering and debugging
- [Resource guide](Resources.md) — resource lifecycle and runtime scoping
- [Demo guide](Demo.md) — web-basic demo walkthrough
