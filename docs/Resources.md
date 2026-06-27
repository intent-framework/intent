# Resource Semantics Guide

## What a resource is

A resource is semantic async state owned by a screen runtime.

It represents data a screen needs — a team roster, a user profile, a document. It is not a global cache or a data-fetching library. Resources are part of the product graph, like asks and actions.

The current API:

```ts
const team = $.resource("team", {
  load: async ({ route }) => {
    return loadTeam(route.params.teamId)
  },
})
```

`$.resource(name, config)` returns a `ResourceRef<T, TServices>` — a definition-time handle. The loader is an async function that returns the resource value. `autoLoad` defaults to `true`.

## Minimal example

```ts
import { screen } from "@intent-framework/core"

type AppServices = {
  navigate?: (name: string) => void
}

const loadProfile = async (id: string): Promise<{ name: string; email: string }> => {
  const res = await fetch(`/api/profiles/${id}`)
  return res.json()
}

export const ProfileScreen = screen<AppServices>("Profile", $ => {
  const profile = $.resource("profile", {
    load: async () => loadProfile("user_1"),
  })

  const refresh = $.act("Refresh")
    .does(async () => {
      await profile.reload()
    })

  $.surface("main").contains(refresh)
})
```

The resource loads when the runtime starts (autoload). The action calls `profile.reload()` to re-fetch. The loader receives runtime services as context.

## Runtime-scoped resources

Resource definitions live on the screen definition. Resource instances live inside a `ScreenRuntime`.

When you call `createScreenRuntime()` or `testScreen()`, the runtime creates fresh `ResourceNode` instances:

```ts
const runtime1 = createScreenRuntime(ProfileScreen)
await runtime1.start()
// runtime1 has its own ResourceNode for "profile"

const runtime2 = createScreenRuntime(ProfileScreen)
await runtime2.start()
// runtime2 has a separate ResourceNode, independent of runtime1

runtime1.dispose()
// runtime1's resource nodes disconnect; runtime2's nodes are unaffected
```

**Key behaviors:**

- Starting a runtime creates new resource nodes from the screen's configs.
- Disposing the runtime disconnects `ResourceRef` proxies from their nodes.
- Two runtimes do not share live resource state. Loading a resource in one runtime does not affect another.

**Current limitation:** A `ResourceRef` proxies one connected runtime at a time. The last runtime to `start()` owns the ref. Full concurrent multi-mount semantics for the same ref across multiple active runtimes are future work.

## ResourceRef vs ResourceNode

| Concept | Role |
|---------|------|
| `ResourceRef` | Definition-time handle returned by `$.resource()`. Proxies status, value, conditions, and methods to whichever `ResourceNode` it is currently connected to. |
| `ResourceNode` | Runtime-owned instance holding current status, value, error, stale state, and conditions. Created by `ScreenRuntime.start()`. |

Users hold `ResourceRef` handles (e.g. `const team = $.resource("team", ...)`). The ref connects to a runtime node automatically on `start()` and disconnects on `dispose()`.

## Loading lifecycle

### Statuses

A resource transitions through these statuses:

| Status | Meaning |
|--------|---------|
| `"idle"` | Not yet loaded. Initial state before any `load()` call. |
| `"pending"` | Loader is running. |
| `"ready"` | Loader completed successfully. `value` is set. |
| `"failed"` | Loader threw an error. `error` is set. |

### Conditions

Each status has a corresponding `Condition`:

| Condition | True when |
|-----------|-----------|
| `resource.ready` | `status === "ready"` |
| `resource.pending` | `status === "pending"` |
| `resource.failed` | `status === "failed"` |
| `resource.stale` | Resource was invalidated and has not been reloaded successfully since. |

Conditions are cached: `resource.ready === resource.ready`.

### Lifecycle steps

1. **Definition** — `$.resource("name", { load, autoLoad })` creates a `ResourceRef`. No loading happens yet.
2. **Runtime start** — `ScreenRuntime.start()` creates `ResourceNode` instances, connects refs, and calls `load()` for resources with `autoLoad: true` (the default).
3. **Manual load** — `resource.load(context?)` runs the loader, sets status to `"pending"`, then `"ready"` or `"failed"`.
4. **Reload** — `resource.reload(context?)` works identically to `load()`. If no context is given, it reuses the last context from the previous load.
5. **Invalidation** — `resource.invalidate()` sets `stale` to `true`. It does not trigger a reload.
6. **Successful load clears stale** — After `load()` or `reload()` succeeds, `stale` returns to `false` and `status` becomes `"ready"` again.
7. **Failed load** — If the loader throws, `status` becomes `"failed"`, `error` is set, and `stale` is cleared (the resource is failed, not stale).

### autoLoad behavior

By default `autoLoad: true`. Set `autoLoad: false` to defer loading:

```ts
const team = $.resource("team", {
  load: async () => loadTeam("team_1"),
  autoLoad: false,
})

// Later, manually:
await team.reload()
```

## Action invalidation

Actions can mark resources as stale after successful execution:

```ts
const save = $.act("Save")
  .does(async () => { /* mutate data */ })
  .invalidates(team, members)
```

Rules:

- **Success invalidates.** After the action handler completes without throwing, each listed resource is invalidated (marked stale).
- **Blocked actions do nothing.** If the action is blocked by a condition, `executeAct()` returns early and resources are not invalidated.
- **Failed actions do nothing.** If the handler throws, invalidation is skipped.
- **Invalidation marks stale only.** It does not reload. The resource stays `ready` (value is still available) but `stale` becomes `true`. Reload manually if needed.

## Loader context

Resource loaders receive runtime services as context:

```ts
type AppServices = {
  route: RouteContext<AppRoutes>
}

const team = $.resource("team", {
  load: async ({ route }) => {
    return loadTeam(route.params.teamId)
  },
})
```

The context is the same `ActionExecutionContext<TServices>` that actions receive:

- Autoload passes the runtime's services to the loader.
- `resource.load(context)` passes the given context.
- `resource.reload()` without arguments reuses the last context from the prior load.
- `resource.reload(context)` passes the given context explicitly.

A loader that takes no context argument is also supported:

```ts
$.resource("team", {
  load: async () => loadTeam("team_1"),
})
```

## Using resources in tests

The `@intent-framework/testing` package exposes resources through the `ScreenHandle`:

```ts
import { test, expect } from "vitest"
import { testScreen } from "@intent-framework/testing"
import { ProfileScreen } from "./ProfileScreen.js"

test("resource loads and can be reloaded", async () => {
  await testScreen(ProfileScreen, async app => {
    const team = app.resource("team")
    expect(team.status()).toBe("ready")
    expect(team.stale()).toBe(false)

    team.invalidate()
    expect(team.stale()).toBe(true)

    await team.reload()
    expect(team.stale()).toBe(false)
    expect(team.status()).toBe("ready")
  })
})
```

The harness creates a runtime, autoloads resources, and provides methods to check status, load, reload, invalidate, and check staleness.

Resources with `autoLoad: false` stay idle until manually loaded:

```ts
test("autoLoad: false resource stays idle", async () => {
  await testScreen(ProfileScreen, async app => {
    const profile = app.resource("profile")
    expect(profile.status()).toBe("idle")
    await profile.load()
    expect(profile.status()).toBe("ready")
  })
})
```

## inspectScreen and resources

Resources appear in `inspectScreen()` output when you pass runtime resource nodes:

```ts
const runtime = createScreenRuntime(MyScreen)
await runtime.start()
const graph = inspectScreen(MyScreen, runtime.resources)
console.log(graph.resources)
```

Each inspected resource includes:

```json
{
  "id": "resource_team",
  "semanticId": "resource:team",
  "name": "team",
  "status": "ready",
  "hasValue": true,
  "stale": false,
  "error": undefined
}
```

On failure, `error` contains the error message and `status` is `"failed"`.

See the [Inspect Screen and Diagnostics Guide](Inspect-Screen.md) for more detail.

## Cache options (Phase 1 + Phase 2)

Resources support optional `cache` configuration:

```ts
const team = $.resource("team", {
  load: async ({ route }) => loadTeam(route.params.teamId),
  cache: {
    key: ({ route }) => route.params.teamId,  // optional, derive cache key from context
    staleTime: 5_000,                          // ms (optional, default: Infinity)
    deduplicate: true,                         // boolean (optional, default: true when cache is set)
  },
})
```

### cache.key (Phase 2)

`cache.key` is an optional function that derives a cache key from the resource's load context. When set, the resource holds multiple internal entries — one per unique key — each with its own:

- value
- error
- status (idle/pending/ready/failed)
- stale flag
- staleTime timer
- in-flight promise (for deduplication)

The `ResourceRef` always reflects the **active key** entry — the key from the most recent `load()` or `reload()` call.

```ts
const team = $.resource("team", {
  cache: {
    key: ({ route }) => route.params.teamId,
  },
  load: async ({ route }) => loadTeam(route.params.teamId),
})

// Navigating to /teams/abc loads with key "abc"
await team.load({ route: { params: { teamId: "abc" } } })
team.value // team data for "abc"

// Navigating to /teams/xyz loads with key "xyz"
await team.load({ route: { params: { teamId: "xyz" } } })
team.value // team data for "xyz"

// Back to /teams/abc — the cached entry is reused
await team.load({ route: { params: { teamId: "abc" } } })
team.value // team data for "abc" (reloaded)
```

Key semantics:

- `ResourceKey` type: `string | number | boolean | null | undefined | ResourceKey[]`
- Keys are normalized via a type-tagged serializer for stable map lookups — preserving distinctions between `null`, `undefined`, `"null"`, `"undefined"`, `0`, `-0`, `NaN`, `Infinity`, `-Infinity`, and nested arrays.
- Equivalent array content (e.g. `["a", "b"]`) maps to the same entry.
- `no-arg reload()` uses the last context, therefore reloads the last active key.
- `invalidate()` marks only the active entry stale.
- `cache.deduplicate` deduplicates per active key.
- `cache.staleTime` timers are per key.
- Resources without `cache.key` behave exactly as before (single-entry behavior).

Scope limitations (Phase 2):

- **Single-runtime only.** Keyed entries live in one `ResourceNode` within one `ScreenRuntime`.
- **No `cacheTime`.** Entries persist for the node's lifetime. No time-based eviction.
- **No SWR.** Stale data must be explicitly reloaded.
- **No cross-navigation cache.** Disposing the runtime clears all entries.
- **No dependency-tracked keys.** Key is derived from context at load time; automatically reacting to context changes is future work.

### staleTime

`cache.staleTime` is an optional number in milliseconds. After a successful `load()` or `reload()`, a timer starts. When it fires, the resource transitions to stale automatically:

- `resource.stale` becomes `true`
- `resource.status` remains `"ready"`
- `resource.value` remains available
- Subscribers to the `stale` condition are notified

Behavior:

- **Timer resets** on every successful `load()` or `reload()`.
- **`invalidate()`** always marks stale immediately, regardless of `staleTime`.
- **Failed loads** do not start a stale timer.
- **`dispose()`** clears all stale timers and prevents late notifications.
- **With `cache.key`**, each key has an independent stale timer.

### deduplicate

`cache.deduplicate` is an optional boolean. When `true`, concurrent `load()` and `reload()` calls while a load is already pending share the same in-flight promise:

- Only one loader invocation runs.
- All callers resolve or fail with the same result.
- The in-flight promise is cleared when the load completes (success or failure).

When `false`, each call runs independently (preserving existing behavior).

When `cache` is not set at all, deduplication is disabled to preserve backward compatibility. When `cache` is set, `deduplicate` defaults to `true`.

**With `cache.key`:** Deduplication is per-key. Concurrent `load()` calls with the same key share one promise. Different keys each invoke the loader independently.

### Future cache options

The following cache options remain as future work and are **not yet supported**:

- **`cacheTime`** — retention period for stale values before eviction
- **`swr`** — stale-while-revalidate background refreshing
- **Cross-navigation cache store** — persistent cache across screen navigations
- **Dependency-tracked keys** — automatic key derivation and reload when context changes without explicit load/reload

## Current boundaries

Resources are intentionally limited:

- **No global cache.** Each runtime owns its resource nodes. There is no shared cache between runtimes.
- **No `cacheTime`.** There is no time-based retention of stale values beyond `staleTime` transitions. Keyed entries persist for the node's lifetime.
- **No stale-while-revalidate (SWR).** Stale resources stay stale until explicitly reloaded.
- **No Suspense integration.** Resources do not integrate with React Suspense or any other framework's loading boundaries.
- **No server framework integration yet.** Resources live on screen definitions and runtimes. Server-side resource hydration is not implemented.
- **No full concurrent multi-mount resource ref semantics.** A `ResourceRef` connects to one runtime at a time. The last runtime to start owns the ref.
- **No dependency-tracked keys.** The `cache.key` function runs at load/reload time only. Automatically reacting to context changes is future work.
