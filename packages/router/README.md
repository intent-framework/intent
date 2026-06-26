# @intent-framework/router

Typed route definitions and navigation for Intent.

## Install

```sh
pnpm add @intent-framework/core @intent-framework/router
```

```sh
npm install @intent-framework/core @intent-framework/router
```

## What it provides

- `createRouter()` — typed, immutable route builder
- `.route(name, path, screen)` — register a route with typed params
- `.match(pathname)` — match a pathname to a route + screen
- `.path(name, params)` — generate a typed path string
- `RouterServices` — typed navigation service for screens and actions
- `renderRouter()` integration lives in `@intent-framework/dom`

## Minimal example

```ts
import { createRouter } from "@intent-framework/router"

type AppServices = {
  navigate: (name: string) => void
}

const router = createRouter<AppServices>()
  .route("home", "/", HomeScreen)
  .route("team", "/team/:teamId", TeamScreen)
  .route("invite", "/team/:teamId/invite", InviteScreen)

const match = router.match("/team/abc123")
if (match.found) {
  console.log(match.name, match.params) // "team", { teamId: "abc123" }
}

const path = router.path("team", { teamId: "abc123" })
console.log(path) // "/team/abc123"
```

## Where this fits

Router provides typed route definitions and navigation for Intent screens. Use `@intent-framework/dom`'s `renderRouter()` to materialize navigation into the DOM. The router does not own the product model — it maps paths to screens.

## Learn more

- [Root README](../../README.md) — project overview and philosophy
- [MVP Checkpoint](../../docs/MVP-Checkpoint.md) — current implementation boundaries
- [Web basic example](../../examples/web-basic) — full demo with routing, resources, and diagnostics

## Status

Experimental alpha. APIs may change. Not recommended for production use.
