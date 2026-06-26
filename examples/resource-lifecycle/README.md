# Resource Lifecycle Example

A focused demonstration of the full resource lifecycle in Intent — autoLoad, manual load, reload, invalidation, stale detection, failed state, and action-driven invalidation.

## What it demonstrates

- Auto-loaded resource that reaches "ready" on screen start
- `autoLoad: false` resource that stays "idle" until explicitly loaded
- `resource.reload()` — transitions through "pending" back to "ready"
- `resource.invalidate()` — marks the resource stale without reloading
- `resource.load()` — manual load for `autoLoad: false` resources
- `.invalidates(resource)` on an action — marks resources stale on success
- Resource "failed" status when a loader throws
- Route-driven resource load context

## Run

```sh
pnpm install
pnpm dev:resource-lifecycle
```

Open the local URL printed by Vite. Use the browser console to inspect resource state.

## Test

```sh
pnpm test
```

Tests cover every resource status transition: autoLoad, idle, pending, ready, stale, failed, and action-driven invalidation.

## Inspect

- Watch the console log for resource load events and load counts
- Each reload increments the team version counter
- The "Broken save" action demonstrates a failed invalidation
- Test file (`src/ResourceDemo.test.ts`) shows the full resource API surface via `@intent-framework/testing`
