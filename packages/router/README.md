# @intent-framework/router

Typed route definitions and navigation for Intent.

## Install

```sh
pnpm add @intent-framework/core @intent-framework/router
```

```sh
npm install @intent-framework/core @intent-framework/router
```

## Quick reference

### `createRouter()`

```ts
import { createRouter } from "@intent-framework/router"

const router = createRouter()
  .route("home", "/", HomeScreen)
  .route("team", "/teams/:teamId", TeamScreen)
```

| Method | Description |
|--------|-------------|
| `.route(name, path, screen)` | Register a route with typed params |
| `.match(pathname)` | Match a pathname → `{ found, name, params, screen }` |
| `.path(name, params?)` | Generate a typed path string |
| `.routes()` | List all registered route definitions |

### Typed navigation

```ts
import type { RouterServices, RoutesFromPaths, RouterNavigate, RouteContext } from "@intent-framework/router"

const appPaths = { home: "/", team: "/teams/:teamId" } as const
type AppRoutes = RoutesFromPaths<typeof appPaths>

// Typed navigate function
type Navigate = RouterNavigate<AppRoutes>
// (name: "home") => void
// (name: "team", params: { teamId: string }) => void

// Full services with navigate + extras
type AppServices = RouterServices<AppRoutes, {
  route: RouteContext<AppRoutes>
  analytics: { track(event: string): void }
}>
```

### DOM rendering

```ts
import { renderRouter } from "@intent-framework/dom"

renderRouter(router, {
  target: document.getElementById("root")!,
  notFound: NotFoundScreen,
  services: { /* custom services */ },
})
```

`renderRouter()` injects `navigate` (and `route` when matched) into screen services, listens for `popstate` to handle back/forward, and cleans up on `dispose()`.

## Guide

See [docs/Router.md](../../docs/Router.md) for the full router guide covering typed navigation, route params, services, popstate behavior, renderRouter options, and current non-goals.

## Where this fits

Router provides typed route definitions and navigation for Intent screens. Use `@intent-framework/dom`'s `renderRouter()` to materialize navigation into the DOM. The router does not own the product model — it maps paths to screens.

## Learn more

- [Router guide](../../docs/Router.md) — comprehensive guide
- [Root README](../../README.md) — project overview and philosophy
- [MVP Checkpoint](../../docs/MVP-Checkpoint.md) — current implementation boundaries
- [Web basic example](../../examples/web-basic) — full demo with routing, resources, and diagnostics

## Status

Experimental alpha. APIs may change. Not recommended for production use.
