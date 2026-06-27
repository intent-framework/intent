# Resource Cache and Stale Semantics — Design Proposal

**Status:** Phase 1 implemented (staleTime + deduplicate), Phase 2 implemented (cache.key), Phase 3 implemented (cacheTime single-runtime)  
**Date:** 2026-06-27  
**Author:** Big Pickle  
**Affected package:** `@intent-framework/core`  
**Related docs:** `docs/Resources.md`, `docs/Specification.md`

> **Phase 1** (PR #119, `@intent-framework/core@0.1.0-alpha.8`): `cache.staleTime` and `cache.deduplicate`.  
> **Phase 2** (PR #123, `@intent-framework/core@0.1.0-alpha.9`): `cache.key` only, scoped to one runtime and one `ResourceNode`.  
> **Phase 3** (PR #127, `@intent-framework/core@0.1.0-alpha.10`): `cacheTime` single-runtime in-memory eviction, per `ResourceNode`, per key.  
> **Phase 4+**: SWR, cross-navigation cache store, dependency-tracked keys. These remain design-only until implementation begins.

---

## Problem

Resources in Intent are semantic async state owned by a screen runtime. The current
implementation provides a minimal stale mechanism (a boolean flag set by
`invalidate()`) with no time-based expiration, no automatic background
revalidation, no cache key concept, and no deduplication.

This leaves several gaps:

1. **No `staleTime`.** Staleness is only manual or action-driven. There is no
   TTL-based staleness. Once a resource loads successfully, it stays `ready`
   and non-stale indefinitely unless explicitly invalidated.

2. **No `cacheTime`.** When a resource becomes stale or when a runtime is
   disposed, the loaded value is discarded. There is no grace period where
   stale data can still be served while a refresh happens in the background.

3. **No cache keys.** Resource identity is by name within a screen. Two
   different load parameters (e.g. different team IDs) to the same resource
   name share the same node. There is no key-based deduplication.

4. **No automatic background refetching.** `stale` is a flag that sits until
   someone calls `reload()` explicitly. There is no SWR (stale-while-revalidate)
   pattern or polling.

5. **No deduplication.** Concurrent `load()` calls each invoke the loader
   independently.

6. **No cache persistence across navigations.** Navigating away disposes the
   runtime and its resource nodes. Navigating back creates fresh nodes that
   re-fetch from scratch.

The `docs/Specification.md` lists `staleTime`, `cacheTime`, keying, and
streaming as desired features. This proposal addresses the cache and stale
semantics portion of that vision.

---

## Goals

1. Define a **cache key** mechanism that gives resources identity beyond name.
2. Define **`staleTime`** — time-based automatic staleness, configurable per
   resource.
3. Define **`cacheTime`** — how long a stale value remains available before
   eviction.
4. Define **stale-while-revalidate (SWR)** behavior — use stale data
   immediately while fetching fresh data in the background.
5. Define **deduplication** semantics — concurrent loaders keyed the same
   way should resolve to a single in-flight promise.
6. Define **cross-navigation cache survival** — optionally reuse resource data
   across runtime boundaries.
7. Implement incrementally per-phase. Each phase is self-contained and
   backward-compatible. Remaining phases after Phase 3 remain design-only.

---

## Non-Goals

- Streaming (`stream: true` from the spec) — deferred to a separate proposal.
- SSR hydration of resources — deferred to a separate proposal.
- Server resource integration — server resources (`packages/server`) are a
  separate concept and need their own design work.
- Suspense integration — out of scope for cache/stale semantics.
- Optimistic updates — touched on but not fully designed here.

---

## Proposed Design

### 1. Cache Keys

#### Current behavior

Resource identity is scoped to `(screen, name)`. Within a single runtime, a
resource name maps to exactly one `ResourceNode`. There is no way to have
multiple instances of the same resource for different parameters.

#### Proposal: `key` option on `ResourceConfig`

```ts
type ResourceKey = string | number | boolean | null | undefined | ResourceKey[]

type ResourceConfig<TValue, TServices> = {
  id: string
  name: string
  autoLoad: boolean
  loader: ResourceLoader<TValue, TServices>
  cache?: ResourceCacheOptions
  ref?: ResourceRef<TValue, TServices>
}

type ResourceCacheOptions = {
  key?: (context: ResourceLoadContext<TServices>) => ResourceKey
  staleTime?: number        // ms, default Infinity (never stale by time)
  cacheTime?: number        // ms, default 0 (no cache after stale/removal)
  swr?: boolean             // default false
  deduplicate?: boolean     // default true
}
```

The `key` function receives the loader context and returns a stable key. When
two load calls for the same resource name produce the same key, they refer to
the same cached entry. When they produce different keys, they are independent.

**Key semantics:**

```ts
const team = $.resource("team", {
  cache: {
    key: ({ route }) => route.params.teamId,
  },
  load: async ({ route }) => loadTeam(route.params.teamId),
})
```

In this example:
- Navigating to `/teams/abc` loads the resource with key `"abc"`.
- Navigating to `/teams/xyz` loads the resource with a different key `"xyz"`.
- Both instances coexist under the same resource name but are independently
  cached.

**Key equality** is determined by deep equality of the key value.

**No key provided** = the resource uses its name as the key (current behavior).

#### Keyed Loader Invocation

When a resource has a `key` function, the loader is invoked once per unique
key within a runtime. Subsequent `load()` calls for the same key return the
existing promise or cached value instead of invoking the loader again
(depending on `deduplicate` and staleness).

### 2. StaleTime

#### Current behavior

Staleness is a boolean set by `invalidate()` and cleared by `load()` /
`reload()`. There is no automatic time-based transition.

#### Proposal: `staleTime` option

```ts
staleTime?: number  // milliseconds, default Infinity
```

When `staleTime` is a finite number, a timer starts after each successful
load. When the timer fires, the resource transitions to stale automatically:

```
load() succeeds → status: "ready", stale: false, timer starts
  ... staleTime elapses ...
                  stale: true (automatic, no loader call)
  ... user calls reload()
                  stale: false, timer restarts
```

The `stale` Condition fires when the timer elapses, just as it does for
manual invalidation.

The `staleTime` timer is **reset** on every successful `load()` or `reload()`.

An explicit `invalidate()` call always sets stale immediately, regardless of
`staleTime`.

If `staleTime` is not set (or `Infinity`), behavior is identical to today:
time-based staleness never triggers.

### 3. CacheTime

#### Current behavior

When a resource value becomes stale, `.value` still returns the data. When
a runtime is disposed, the value is lost entirely. There is no retention
period.

#### Proposal: `cacheTime` option

```ts
cacheTime?: number  // milliseconds, default undefined (no time-based eviction)
```

`cacheTime` controls how long a stale resource value is retained before
eviction:

```
load() succeeds → value cached
  ... staleTime elapses → stale: true, cacheTime timer starts
  ... cacheTime elapses → value evicted, status → "idle"
```

When `cacheTime` is `undefined` (default), stale entries are never evicted by
time. They persist until an explicit `load()`/`reload()` call or node disposal.

When `cacheTime` is `0`, stale entries are evicted on the next tick (immediate
eviction on staleness). Positive numbers retain the stale value for N ms.

**Effect on status:**
- While stale and within `cacheTime`: `.status` remains `"ready"`,
  `.value` returns data.
- After `cacheTime` elapses without a successful reload: `.status` transitions
  to `"idle"`.
- A new `load()` call: clears the cacheTime timer, sets status to `"pending"`,
  clears value, calls loader.

**Scope note (Phase 3):** cacheTime applies only within the lifetime of a
single `ResourceNode`. Runtime disposal clears all entries regardless of
cacheTime. Cross-navigation cache survival (retaining data across navigation)
requires a cache store and is deferred to Phase 5+.

**Rationale:** `cacheTime` exists as a separate concern from `staleTime`
to support patterns like:
- "Consider data stale after 5 minutes, but keep showing it for up to 30
  minutes while the user is on the screen."

### 4. Stale-While-Revalidate (SWR)

#### Current behavior

When a resource is stale, nothing happens automatically. The UI continues to
show the stale value until something calls `reload()`.

#### Proposal: `swr` option

```ts
swr?: boolean  // default false
```

When `swr: true` and the resource loads with a cached value, the resource
returns the stale value immediately while triggering a background reload:

```
stale: true, swr: true
  → immediately serve `.value` (stale data)
  → trigger background reload
  → when reload finishes: update `.value`, set stale: false
```

**SWR + staleTime interaction:**
- `staleTime` elapses → resource becomes stale automatically.
- With `swr: true`, this triggers an automatic background reload.
- The background reload resets the `staleTime` timer on success.
- If the background reload fails, the resource stays `ready` with the old
  value and keeps `stale: true`. The next `staleTime` cycle retries.

**SWR + autoLoad interaction:**
- A resource with `autoLoad: true` and `swr: true` loads on runtime start.
- On subsequent `staleTime` expirations, the resource revalidates in the
  background.
- If the user is on the screen long enough for multiple staleTime cycles,
  the resource auto-revalidates repeatedly.

**SWR + navigation:**
- When navigating back to a screen with a cached resource, if the cached
  value is still within `cacheTime` and `swr: true`, the resource serves the
  cached value immediately and refreshes in the background.
- If the cached value is beyond `cacheTime`, fall through to full load.

**UI exposure:** The UI can differentiate "fresh" vs "stale-while-revalidate"
via the `.stale` Condition. While SWR is refetching, `.status` is `"ready"`
and `.stale` is `true`. After the background reload, `.stale` becomes `false`.
The UI can show a subtle indicator ("refreshing...") by observing `.stale`.

### 5. Deduplication

#### Current behavior

Each `load()` call runs the loader independently. If `load()` is called twice
before the first completes, two loader calls run concurrently.

#### Proposal: `deduplicate` option

```ts
deduplicate?: boolean  // default true
```

When `deduplicate: true` and a loader is already in-flight for the same cache
key, subsequent `load()` calls return the existing promise instead of starting
a new one.

```ts
await Promise.all([
  team.reload(),  // starts loading for key "abc"
  team.reload(),  // deduplicated: returns same promise
  team.reload(),  // deduplicated: returns same promise
])
// Only one loader invocation.
```

When `deduplicate: false`, each call runs independently (current behavior).

**Keying for deduplication:** Deduplication is keyed by the resource's cache
key. Resources without an explicit `key` option are deduplicated by name.

### 6. Cross-Navigation Cache

#### Current behavior

Navigating away disposes the runtime, which disconnects all `ResourceRef`s
from their `ResourceNode`s. Navigating back creates a fresh runtime with fresh
resource nodes — the old values are lost completely.

#### Proposal: Optional in-memory cache layer

Introduce a **resource cache store** — an in-memory key-value store scoped to
the application (or a configurable scope). The store is keyed by
`(screenName, resourceName, cacheKey)`.

```
Runtime A (screen "Team", key "abc") → loads data → stored in cache
Runtime A disposed
Runtime B (screen "Team", key "abc") → starts → checks cache
  → cache hit and within cacheTime → skip loader, serve cached value
  → if swr: true → serve cached value, reload in background
  → if cache miss or beyond cacheTime → run loader normally
```

**Cache store interface:**

```ts
type CacheEntry<TValue> = {
  value: TValue
  loadedAt: number
  staleAt: number    // loadedAt + staleTime, or Infinity
  expiresAt: number  // loadedAt + cacheTime + staleTime, or Infinity
}

interface ResourceCacheStore {
  get<TValue>(key: string): CacheEntry<TValue> | undefined
  set<TValue>(key: string, entry: CacheEntry<TValue>): void
  delete(key: string): void
  clear(): void
}
```

**The cache store is optional.** Frameworks using Intent can opt in by
providing a `cacheStore` to `createScreenRuntime()`:

```ts
const runtime = createScreenRuntime(MyScreen, {
  services,
  cacheStore: new InMemoryResourceCache(),
})
```

If no `cacheStore` is provided, every runtime starts fresh (current default
behavior). This preserves the existing contract while enabling opt-in caching.

**Eviction policy:** The in-memory cache uses time-based eviction (via
`expiresAt`). LRU or size-based eviction can be layered on top in the
`InMemoryResourceCache` implementation.

**Cross-screen key collisions:** Key is namespaced by screen name + resource
name + cache key to prevent collisions.

---

## ResourceCacheOptions Type

The full proposed shape for resource cache options:

```ts
type ResourceCacheOptions = {
  /**
   * A function that returns a stable cache key from the loader context.
   * Resources without a key use their name as the key.
   * Two loads with the same key reference the same cache entry.
   */
  key?: (context: ResourceLoadContext<TServices>) => ResourceKey

  /**
   * Time in milliseconds after a successful load after which the resource
   * is considered stale. Default: Infinity (never stale by time).
   * An explicit invalidate() always sets stale immediately.
   */
  staleTime?: number

  /**
   * Time in milliseconds that a stale resource's value is retained
   * before eviction. Default: undefined (no time-based eviction).
   * During cacheTime, .status remains "ready" and .value is available.
   * Phase 3: single-runtime only — does not survive runtime disposal.
   */
  cacheTime?: number

  /**
   * When true, a stale resource serves its cached value immediately while
   * triggering a background reload. The .stale Condition remains true
   * until the background reload completes. Default: false.
   */
  swr?: boolean

  /**
   * When true, concurrent load() calls for the same cache key share a
   * single in-flight promise. Default: true.
   */
  deduplicate?: boolean
}
```

---

## Interaction Matrix

| staleTime | cacheTime | swr | Behavior |
|-----------|-----------|-----|----------|
| unset | unset | unset | Current behavior: manual invalidation only |
| `5m` | unset | unset | Stale after 5 min, no grace period, value still accessible |
| `5m` | `30m` | unset | Stale after 5 min, value retained for 30 min of staleness |
| `5m` | `30m` | `true` | Stale after 5 min → serve stale + background reload; value retained 30 min |
| unset | unset | `true` | SWR on manual `invalidate()` only (no time-based staleness) |
| unset | `10m` | unset | Value survives runtime disposal for up to 10 min (cross-navigation cache)* |
| `5m` | `0` | `true` | Stale after 5 min → background reload; no retention if reload fails |
| unset | unset | unset | with `deduplicate: true`: concurrent loads share one promise |

<sup>\*</sup> Cross-navigation cache survival requires a cache store (Phase 5+). Not part of Phase 3. All other rows apply to Phase 3.

---

## Phase Plan

### Phase 1 — Implemented (`@intent-framework/core@0.1.0-alpha.8`)

**Scope:** `cache.staleTime` + `cache.deduplicate`

- `staleTime` — time-based automatic staleness via setTimeout
- `deduplicate` — in-flight load promise sharing
- Resources without `cache` options behave exactly as before
- No new exports from the package
- PR #119

### Phase 2 — `cache.key` (implemented)

**Scope:** `cache.key` only, scoped to one runtime and one `ResourceNode`.

- Add `key?: (context: ResourceLoadContext<TServices>) => ResourceKey` to `ResourceCacheOptions`.
- The `ResourceNode` internally maintains a `Map<ResourceKey, CacheEntry>`.
- Each cache entry tracks its own value, status, stale state, error, stale timer, and in-flight promise.
- `deduplicate` dedupes by active key (not by a single global promise).
- `no-arg reload()` uses `lastContext` → last key.
- No cross-runtime cache. No `cacheTime`. No SWR.
- All existing resources without `cache.key` behave identically to today (the node stores one entry keyed by `null` or the resource name).

**Rationale:** cache.key is:
- Purely additive — does not break existing behavior.
- Enables parameterized resources (different route params → different keys).
- Provides the foundation for later phases (cacheTime, SWR, cross-navigation cache all operate per-key).
- Safe to implement in a single PR because it does not require cache store, router integration, or new lifecycle concepts.

### Phase 3 — `cacheTime` (Single-Runtime, In-Memory)

**Scope:** `cacheTime` option, in-memory entry retention/eviction within the lifetime of a single `ResourceNode`. No cross-navigation cache store. No SWR. No dependency-tracked keys.

- `cacheTime` is an optional time (ms) controlling how long a stale value is retained before eviction.
- Default is `undefined` (no time-based eviction). `0` means evict immediately when stale.
- cacheTime starts when an entry becomes stale (from `invalidate()`, action invalidation, or `staleTime` expiry).
- Active entry eviction: `status` → `"idle"`, `value` → `undefined`, `error` → `undefined`, `stale` → `false`. Subscribers notified.
- Inactive entry eviction: entry removed from internal `Map` silently. No subscriber notification.
- Successful `load()`/`reload()` cancels the cacheTime timer, clears stale, restarts staleTime.
- Failed `load()`/`reload()` does NOT start cacheTime — existing failure behavior is preserved.
- Runtime `dispose()` clears all cacheTime timers and drops all entries.
- Per-key: each entry in the `Map<ResourceKey, CacheEntry>` has its own independent cacheTime timer.
- Works with or without `staleTime`.
- Applies to non-keyed resources (single entry).

**Note:** Full cross-navigation `cacheTime` (surviving runtime disposal) requires the cache store (Phase 5+). Phase 3 is single-runtime only.

### Phase 4 — SWR (Stale-While-Revalidate)

**Scope:** `swr` option.

- Requires `cacheTime` (Phase 3) to make sense — SWR needs a retained value to serve while revalidating.
- Benefits from `cache.key` (Phase 2) to scope the background reload.
- SWR without a cache store is limited to single-runtime scenarios.

### Phase 5+ — Cross-Navigation Cache Store

**Scope:** `ResourceCacheStore` interface, `InMemoryResourceCache`, runtime integration.

- Depends on all prior phases — the store is per-key, has staleTime/cacheTime semantics, and supports SWR.
- Ownership, eviction policy, and memory management are open design questions.
- Likely requires a new package (`@intent-framework/cache`) or integration with `@intent-framework/router`.

### Phase 6+ — Dependency-Tracked Keys

**Scope:** Reactive key functions that auto-reload when dependencies change.

- Requires Phase 2 + a reactive system (signals) integrated into the key function.
- Significant complexity. Deferred until core signal integration patterns are proven.

---

## Approved Next Implementation Slice — Phase 2: `cache.key`

### Design Decisions

#### Q1: Should phase 2 be cache.key or cacheTime?

**Answer: cache.key.** cache.key is purely additive — it adds the ability to have multiple cache entries within one resource node without changing behavior for existing (non-keyed) resources. cacheTime, by contrast, introduces eviction lifecycle and interacts with cross-navigation cache. cache.key is the prerequisite for all later phases.

#### Q2: Can cache.key be implemented without cross-navigation cache storage?

**Answer: Yes.** cache.key operates within a single `ResourceNode` within a single runtime. Multiple keyed entries coexist in the node's internal `Map`. Cross-navigation storage (surviving runtime disposal) is a separate concern that builds on top of per-key entries.

#### Q3: What is the behavior of a single ResourceRef when the key changes?

**Answer:** The `ResourceRef` remains connected to the same `ResourceNode`. The node's "active key" is determined by calling `key(context)` on each `load()`/`reload()` call. When the key changes:

1. If an entry for the new key already exists in the node's map, the node switches to that entry (serving its cached value/status).
2. If no entry exists, the node transitions to `pending`, calls the loader, and stores the result under the new key.
3. The `ResourceRef` continues to proxy whatever the active entry shows.

This means a single ref can show different parameter results without creating multiple runtimes. The ref's `.value`, `.status`, `.stale`, etc., always reflect the entry for the active key.

#### Q4: Does each key map to a separate node internally?

**Answer: No.** One `ResourceNode` maintains a `Map<ResourceKey, CacheEntry>`. The entries are internal to the node. From the outside, the `ResourceRef` and the runtime see a single `ResourceNode` — they do not need to know about keying. This keeps the runtime API unchanged.

```ts
// Internal structure of a keyed ResourceNode:
// Map<string, CacheEntry>
//   "abc" → { value: TeamData, status: "ready", stale: false, ... }
//   "xyz" → { value: TeamData, status: "ready", stale: true, ... }
// activeKey: "abc"  ← determines what .value, .status, etc. return
```

#### Q5: How does keying interact with lastContext and no-arg reload()?

**Answer:** `no-arg reload()` uses `lastContext` to derive the key. Since `lastContext` stores the full context from the last `load()`/`reload()` call, calling the key function with it produces the last active key. This preserves the existing contract — `reload()` without args reloads the same resource with the same parameters.

```ts
// First load with context
await team.load({ route: { params: { teamId: "abc" } } })
// lastContext = { route: { params: { teamId: "abc" } } }
// activeKey = key(lastContext) = "abc"

// No-arg reload reuses lastContext
await team.reload()
// activeKey = key(lastContext) = "abc" (same as before)
```

If the caller wants a different key, they pass explicit context: `reload({ route: { params: { teamId: "xyz" } } })`.

#### Q6: How does deduplicate behave once cache.key exists?

**Answer:** Deduplication is per-key. Each keyed entry has its own `_inFlightPromise`. Concurrent `load()` calls with the same key share one loader invocation. Concurrent `load()` calls with different keys each invoke the loader independently.

```ts
const resource = createResourceNode("team", "team", loader, true, {
  key: ctx => ctx.route.params.teamId,
  deduplicate: true,
})

// These share one promise (same key "abc"):
await Promise.all([
  resource.load({ route: { params: { teamId: "abc" } } }),
  resource.load({ route: { params: { teamId: "abc" } } }),
])

// This runs independently (different key "xyz"):
await resource.load({ route: { params: { teamId: "xyz" } } })
```

For non-keyed resources, `key` is `undefined` and the entry key defaults to `null` (or the resource name). Deduplication for non-keyed resources is unchanged from Phase 1.

#### Q7: Should cacheTime exist before a cacheStore, or only with one?

**Answer: cacheTime should only be implemented alongside a cacheStore.** Without a cross-navigation store, `cacheTime` has limited value — it only controls eviction within a single runtime's lifetime. The runtime already clears entries on `dispose()`, so the meaningful use of `cacheTime` (surviving navigation) requires a store. Phase 3 can implement single-runtime `cacheTime` as a stepping stone, but the full value comes in Phase 5+.

#### Q8: Who owns cross-navigation cache storage?

**Answer: Undetermined — future work.** Candidates:

- **`@intent-framework/router`** — the router naturally manages navigation lifecycle and could own per-route-tree cache stores.
- **`@intent-framework/core`** — own the interface only; leave implementations to other packages.
- **`@intent-framework/cache`** (new package) — own the interface + default `InMemoryResourceCache` implementation.
- **Application-level** — users provide a `cacheStore` to `createScreenRuntime()`.

This question is explicitly deferred until Phase 5+ design begins.

#### Q9: Should swr wait until cache.key and cacheTime exist?

**Answer: Yes.** SWR depends on:
- `cache.key` — to know which entry to revalidate.
- `cacheTime` — to have a retained value to serve during revalidation.

Implementing SWR before both would produce an incomplete or misleading API. SWR is Phase 4.

#### Q10: What is the smallest next runtime PR that preserves existing resource behavior?

**Answer: Phase 2 — `cache.key` only.** The implementation:
- Adds `key?: (context: ResourceLoadContext<TServices>) => ResourceKey` to `ResourceCacheOptions`.
- Converts `ResourceNode` from single-slot storage to `Map<ResourceKey, CacheEntry>`.
- Non-keyed resources store one entry keyed by `null` (or by resource name as sentinel).
- No new exports from the package.
- All existing tests pass unchanged.
- All existing examples unchanged.
- No changeset needed (type addition only; no behavioral change for existing code).

---

### Behavior Specification for Phase 2

#### Type Additions

```ts
export type ResourceKey = string | number | boolean | null | undefined | ResourceKey[]

export type ResourceCacheOptions<TServices extends object = DefaultScreenServices> = {
  key?: (context: ResourceLoadContext<TServices>) => ResourceKey
  staleTime?: number
  deduplicate?: boolean
}
```

`key` is added alongside existing `staleTime` and `deduplicate`. It is also added to `ResourceConfig` if the current convention keeps `cache` as a nested object.

#### Key Derivation

- On each `load()` or `reload()` call with a context, call `key(context)` to derive the active key.
- On `no-arg reload()`, call `key(lastContext)`.
- If no `key` function is provided, use a sentinel key (`null` or `""`) — equivalent to today's single-entry behavior.
- Key equality is determined by deep equality (`JSON.stringify` or a fast deep-equal utility).

#### Entry Lifecycle

Each entry in the `Map` tracks:

```ts
type CacheEntry<TValue> = {
  value: TValue | undefined
  status: ResourceStatus
  error: unknown
  stale: boolean
  inFlightPromise: Promise<void> | null
  staleTimer: ReturnType<typeof setTimeout> | null
  lastContext: ResourceLoadContext<TServices> | undefined
}
```

- **Entry creation:** When `load()` is called with a key not in the map, create a new entry in `"idle"` status, then transition to `"pending"` and start the loader.
- **Entry reuse:** When `load()` is called with a key already in the map:
  - If `deduplicate` is true and the entry has an in-flight promise, return it.
  - If the entry is `"ready"` and not stale, return immediately (no loader call).
  - If the entry is stale, reload (call loader again).
- **Entry eviction:** Entries are never evicted during Phase 2 (no `cacheTime`). They persist for the lifetime of the `ResourceNode`. Future phases will add eviction.
- **Entry on dispose:** When `node.dispose()` is called, clear all timers and in-flight promises in the map. Entries are discarded (they do not survive the node's lifetime).

#### Active Key Visibility

The `ResourceNode` exposes the state of the **active entry only**:

- `.value` — value of the entry for `activeKey`
- `.status` — status of the entry for `activeKey`
- `.error` — error of the entry for `activeKey`
- `.stale` — stale condition of the entry for `activeKey`
- `.load()`, `.reload()` — operate on the entry for the key derived from the provided context (or `lastContext`)

The `ResourceRef` connected to this node proxies whatever the node exposes. The ref does not need to know about keying.

#### No-Key Backward Compatibility

When no `key` option is provided:

- The node creates one entry keyed by `null`.
- The node stores `lastContext` (unchanged from today).
- `deduplicate` uses the single entry's `_inFlightPromise` (unchanged from Phase 1).
- `staleTime` timer is on the single entry (unchanged from Phase 1).
- Behavior is identical to the current implementation.

---

### Test Plan for Phase 2

#### Unit Tests (in `packages/core/src/core.test.ts`)

**Key derivation tests:**
1. Resource without `key` keeps existing behavior (single entry, no key awareness).
2. Resource with `key` derives key from context on `load(context)`.
3. Resource with `key` derives key from `lastContext` on `no-arg reload()`.
4. Resource with `key` and no prior context gets empty context for key derivation (graceful fallback).

**Multi-entry tests:**
5. Two `load()` calls with different keys create independent entries.
6. Each entry independently tracks its own status, value, and error.
7. Loading key "abc" to ready, then loading key "xyz", then switching back to "abc" via context — the value for "abc" is still available without re-fetching.
8. Entries with `staleTime` each have independent timers.

**Key change tests:**
9. Loading with key "abc", then loading with key "xyz" — the active key switches to "xyz", `.value` reflects "xyz"'s entry, `.status` reflects "xyz"'s entry.
10. `no-arg reload()` after loading key "abc" reloads the "abc" entry (via `lastContext`).

**Deduplication with keying:**
11. Concurrent `load()` calls with the same key are deduplicated (one loader call).
12. Concurrent `load()` calls with different keys are NOT deduplicated (two loader calls).
13. `deduplicate: false` with keying — each load runs independently per key.

**Error handling:**
14. One key's entry can be in `"failed"` while another key's entry for the same resource is `"ready"`.
15. Retry after failure is per-key: failing key "abc" does not affect key "xyz"'s ability to load.

**Ref proxying:**
16. `ResourceRef.proxy` correctly reflects the active entry's value, status, and conditions regardless of which key is active.
17. `ResourceRef.subscribe` fires when the active entry changes (including when switching keys via a new load).

**Runtime integration:**
18. `ScreenRuntime.start()` with a keyed resource — autoload with runtime services produces the correct key.
19. `ScreenRuntime.dispose()` clears all entries in the keyed node.

**TypeScript:**
20. `cache.key` function receives correctly typed context.
21. Existing type-only tests continue to pass.

---

### Compatibility Notes

#### Backward Compatibility

- Resources without `cache.key` behave identically before and after Phase 2.
- Resources without any `cache` option behave identically.
- `ResourceRef`, `ResourceNode`, `ScreenRuntime`, and `createResourceNode` signatures are backward compatible (the new `key` option is optional).
- All existing tests pass without modification.
- All examples compile and run without changes.

#### Migration

- **No migration required** for existing resources — the `key` option is opt-in.
- Users who want parameterized resources add `cache: { key: (ctx) => ctx.route.params.id }` to their resource config.
- Users who had workarounds (e.g., creating separate resources for each parameter) can consolidate into a single keyed resource.
- `deduplicate` defaults to `true` when `cache` is set (already the case from Phase 1).

#### Interaction with Existing Features

- **`invalidate()`** — marks the active entry as stale. Other entries in the map are unaffected.
- **`autoLoad`** — autoload uses runtime services to derive the key. Works naturally.
- **Action invalidation** — `act.invalidates(resource)` marks the active entry stale. If the key changes, the new key's entry needs separate invalidation.
- **`staleTime`** — each entry has its own timer. Timers are independent per-key.
- **`deduplicate`** — per-key as described above. Existing single-entry deduplication is a special case of per-key deduplication with one key.

#### Open Questions (Deferred from Phase 2)

- **Key equality function** — should we use `JSON.stringify` (fast, no deps) or a deep equality utility (more correct for complex keys like arrays/objects)? Recommendation: use `JSON.stringify` with a type-tagged encoder for Phase 2 (see `encodeResourceKey`). This preserves distinctions between `null`, `undefined`, `NaN`, `Infinity`, `-0`, and nested arrays. Array keys are supported by the type but should be used sparingly.
- **Active key change without explicit load** — should the key be reactive (automatically reload when route params change)? This is dependency-tracked keys (Phase 6+). Phase 2 requires an explicit `load()`/`reload()` call to change the active key.
- **Entry eviction policy** — without `cacheTime`, entries accumulate in the map indefinitely. For Phase 2 this is acceptable (the node is disposed when the runtime is disposed). Future phases should add LRU or time-based eviction.
- **`cache.key` as a top-level config property vs nested under `cache`** — the existing convention nests under `cache`. Phase 2 follows this convention for consistency. The nested API is the approved design.
- **Key type validation** — `ResourceKey` allows `string | number | boolean | null | undefined | ResourceKey[]`. Should we restrict further (e.g., disallow arrays in Phase 2)? Recommendation: keep the union type but document that string keys are preferred.

---

## Phase 3: CacheTime — Single-Runtime Design

**Status:** Design (PR #126), implemented in `@intent-framework/core@0.1.0-alpha.10` (PR #127)  
**Scope:** `cacheTime` option, in-memory entry retention/eviction within the lifetime of a single `ResourceNode`. No cross-navigation cache store. No SWR. No dependency-tracked keys. No server resources.

### Revisiting Phase 2 Q7

Phase 2's design (Q7) recommended that `cacheTime` should wait for a cacheStore. Phase 3 re-evaluates this and finds that **single-runtime cacheTime is feasible and valuable** as a stepping stone:

- `cacheTime` without a store provides **in-memory entry retention/eviction** within the lifetime of a `ResourceNode`.
- This enables "stale data grace period" patterns: show stale data for N ms after it becomes stale, then clear it.
- Cross-navigation survival (the original reason for requiring a cacheStore) remains future work.
- Runtime disposal still clears all entries immediately — no ambiguity.

**Decision:** Implement single-runtime `cacheTime` in Phase 3, deferring cross-navigation survival to Phase 5+.

### Core Semantics

`cacheTime` is optional, in milliseconds. Default: `undefined` (no time-based eviction).

#### When cacheTime starts

cacheTime starts when an entry transitions from non-stale to stale. This happens via:
- Manual `invalidate()`
- Action invalidation (calls `invalidate()` under the hood)
- `staleTime` expiry

#### What happens while stale and before cacheTime expires

- `status` remains `"ready"`
- `value` remains available
- `stale` is `true`
- The entry's cache eviction timer is running

#### What happens when cacheTime expires (active entry)

- `value` → `undefined`
- `error` → `undefined`
- `status` → `"idle"`
- `stale` → `false`
- Subscribers are notified
- If an in-flight promise exists for this entry, it is left unchanged. When the promise resolves, it updates the entry state naturally (entry transitions from `"pending"` to the load outcome). If the entry was removed from the Map (inactive case), the resolved update is a no-op.

#### What happens when cacheTime expires (inactive entry)

- The entry is removed from the node's internal `Map`
- No subscriber notification
- If this key becomes active later, a fresh load begins (entry not found in Map)

#### What a successful load/reload does

- Clears `stale` → `false`
- Clears any running cacheTime timer for that entry (no longer needed — entry is non-stale)
- Restarts `staleTime` timer if configured

#### What a failed load/reload does

- Does NOT start cacheTime by itself
- Preserves existing phase 1/2 failure behavior: `status` → `"failed"`, `stale` → `false`, `value` is `undefined` (cleared when load began)
- The user must call `reload()` again to retry

#### Interaction with deduplicate

Orthogonal. Deduplicate controls in-flight promise sharing per key. cacheTime controls eviction per key. No direct interaction.

#### Interaction with no-arg reload() and lastContext

- `no-arg reload()` uses `lastContext` to derive the key
- If the entry for that key has been evicted (cacheTime expired), `reload()` creates a fresh entry and loads from scratch
- If the entry still exists (within cacheTime), `reload()` proceeds normally: clears the cacheTime timer, clears stale, sets `"pending"`, clears value, calls loader

#### Default value

- `undefined` (property omitted): no time-based eviction. The entry persists until node disposal or explicit load.
- `0`: evict immediately when stale (timer fires on next event loop tick).
- Positive number: evict after N ms of staleness.
- `Infinity`: equivalent to `undefined` (no time-based eviction).

#### Allowed without staleTime

Yes. `cacheTime` is useful with only manual `invalidate()` patterns — e.g., "when I say this data is stale, keep it around for 30 seconds before discarding."

#### Runtime dispose

Clears all staleTime timers, cacheTime timers, and in-flight promises. Drops all entries. No cross-navigation survival.

### Active vs Inactive Key Eviction

| Scenario | Eviction behavior | Notify subscribers? |
|----------|------------------|---------------------|
| Active entry, cacheTime expires | Clear entry state (value, error, status, stale). Entry stays in Map as `"idle"`. | Yes |
| Inactive entry, cacheTime expires | Remove entry from Map entirely. | No |
| Entry in-flight, cacheTime expires | Leave in-flight promise alone. When it resolves, update entry if it still exists; no-op if removed. | Depends on active status at resolution time |
| Active entry, `load()` called during cacheTime | Cancel cacheTime timer. Clear stale. Set `"pending"`. Clear value. Start fresh load. | Yes (transition to `"pending"`) |

### Updated Interaction Matrix

Append the following rows. Existing rows from the main Interaction Matrix remain valid but note: rows involving cross-navigation cache survival require a cache store (Phase 5+) and are not part of Phase 3.

| staleTime | cacheTime | swr | Behavior (Phase 3 scope) |
|-----------|-----------|-----|--------------------------|
| unset | `30s` | unset | Manual `invalidate()` → stale for 30s, then evicted |
| `5m` | `30s` | unset | Stale after 5m, stale value retained for 30s, then evicted |
| `5m` | `0` | unset | Stale after 5m, stale value evicted on next tick |
| `5m` | `30s` | unset | `reload()` during cacheTime → cache timer cleared, fresh load |
| unset | unset | unset | No time-based eviction (current Phase 1/2 behavior) |

---

## Approved Phase 3 Implementation Slice

### Design Decisions

#### Q1: Can cacheTime be implemented safely before a cache store?

**Answer:** Yes, but scoped to single-runtime in-memory eviction. Cross-navigation cache survival requires a cache store (Phase 5+). Single-runtime cacheTime provides value for "stale data grace period" patterns and establishes the eviction infrastructure for future phases.

#### Q2: Does cacheTime start on staleness or on key switch?

**Answer:** On staleness (when an entry becomes stale). Switching to a different key should not evict the previous key's entry — it remains available if the user switches back before its cacheTime expires.

#### Q3: Should cacheTime evict the active entry silently or notify?

**Answer:** Notify. The active entry's state change (`"ready"` → `"idle"`, value disappearance, stale reset) is visible to all subscribers via `ResourceRef`.

#### Q4: Should cacheTime evict inactive entries silently or notify?

**Answer:** Silently. Inactive entries are internal to the node. No subscriber should be notified about state changes they cannot observe.

#### Q5: What should cacheTime default to?

**Answer:** `undefined` (no time-based eviction). `0` means evict immediately when stale (next tick). Positive numbers mean evict after N ms of staleness. `Infinity` is equivalent to `undefined`.

#### Q6: Should cacheTime be allowed without staleTime?

**Answer:** Yes. cacheTime works with any source of staleness, including manual `invalidate()`.

#### Q7: Should failed reload preserve the old stale value?

**Answer:** No. Current Phase 1/2 behavior clears the value when a load starts. cacheTime does not change this — it only preserves the value if NO `load()`/`reload()` is explicitly called. This avoids complexity and keeps SWR (which would preserve the value during reload) for Phase 4.

#### Q8: Should runtime dispose clear cacheTime timers?

**Answer:** Yes. Runtime `dispose()` clears all staleTime timers, cacheTime timers, and in-flight promises. cacheTime does not extend entry lifetime beyond the node's lifetime.

### Behavior Specification

#### Type additions

```ts
export type ResourceCacheOptions<TServices extends object = DefaultScreenServices> = {
  key?: (context: ResourceLoadContext<TServices>) => ResourceKey
  staleTime?: number
  cacheTime?: number   // ms, undefined = no time-based eviction
  deduplicate?: boolean
}
```

#### Entry type

```ts
type Entry = {
  value: TValue | undefined
  status: ResourceStatus
  error: unknown
  stale: boolean
  staleTimer: ReturnType<typeof setTimeout> | null
  cacheTimer: ReturnType<typeof setTimeout> | null   // NEW
  inFlightPromise: Promise<void> | null
}
```

#### CacheTime timer helpers

```ts
function _clearEntryCacheTimer(entry: Entry): void {
  if (entry.cacheTimer != null) {
    clearTimeout(entry.cacheTimer)
    entry.cacheTimer = null
  }
}

function _startEntryCacheTimer(entry: Entry, key: string): void {
  _clearEntryCacheTimer(entry)
  if (cache?.cacheTime != null && isFinite(cache.cacheTime)) {
    entry.cacheTimer = setTimeout(() => {
      if (entry === getActiveEntry()) {
        // Active entry: clear state, notify
        entry.value = undefined
        entry.error = undefined
        entry.status = "idle"
        entry.stale = false
        _clearEntryCacheTimer(entry)
        syncFromActiveEntry()
      } else {
        // Inactive entry: remove from map silently
        entries.delete(key)
      }
    }, cache.cacheTime)
  }
}
```

#### Changes to existing functions

**`invalidate()` (add cacheTime start):**
```
if (!entry.stale) {
  entry.stale = true
  _startEntryCacheTimer(entry, _activeKey)   // NEW
  // existing stale notify logic
}
```

**`_startEntryStaleTimer` callback (add cacheTime start):**
```
if (!entry.stale) {
  entry.stale = true
  _startEntryCacheTimer(entry, key)          // NEW
  // existing stale notify logic
}
```

**`executeLoad()` start (cancel pending eviction):**
```
_clearEntryCacheTimer(entry)   // NEW — cancel eviction before fresh load
// existing start-load logic
```

**`executeLoad()` success path (cancel eviction timer):**
```
_clearEntryCacheTimer(entry)   // NEW — success neutralizes eviction
// existing success logic
```

**`dispose()` (clear all timers):**
```
for (const entry of entries.values()) {
  _clearEntryStaleTimer(entry)
  _clearEntryCacheTimer(entry)  // NEW
  entry.inFlightPromise = null
}
```

#### What does NOT change

- `ResourceRef` — no changes. It proxies the node's active entry, which handles eviction internally.
- `ScreenRuntime` — no changes. Dispose calls `node.dispose()` which clears all timers.
- Non-keyed resources — they have a single entry; cacheTime works the same way.
- `ResourceNode.load()` and `ResourceNode.reload()` signatures — unchanged.
- `createResourceNode` signature — unchanged (new option is in `ResourceCacheOptions` which is already optional).

---

### Test Plan for Phase 3

#### CacheTime basic

1. Resource with `cacheTime: 50` — after `invalidate()`, value persists for ~50ms, then transitions to idle.
2. Resource with `cacheTime: 0` — after `invalidate()`, value evicted on next tick.
3. Resource without `cacheTime` — entry stays stale indefinitely after invalidate (no time-based eviction).

#### CacheTime with staleTime

4. Resource with `staleTime: 30, cacheTime: 50` — after staleTime fires, stale value persists for 50ms, then evicted.
5. Resource with `staleTime: 50, cacheTime: 30` — stale value kept for 30ms after staleTime expiry, then evicted.
6. Resource with `staleTime: 30, cacheTime: 200` — `reload()` called during cacheTime window: cache timer cleared, fresh load starts, new staleTime/cacheTime cycle begins after load.

#### Active entry eviction

7. Active entry evicted by cacheTime: `status` transitions from `"ready"` to `"idle"`, `value` from data to `undefined`, `stale` from `true` to `false`.
8. `subscribe()` callback fires when active entry is evicted.
9. `ResourceRef` reflects the post-eviction state (`status: "idle"`, `value: undefined`).

#### Inactive entry eviction

10. Keyed resource with keys "a" and "b" — load "a", invalidate "a", switch to "b" — cacheTime fires for "a" while inactive: no subscriber notification.
11. After inactive entry "a" is evicted, switching back to key "a" triggers a fresh load (entry not found in Map).

#### Reload interaction

12. Stale entry within cacheTime: `reload()` cancels cacheTime timer, starts fresh load.
13. Successful reload after cacheTime timer cancellation: entry is fresh (non-stale), new staleTime timer starts.
14. Failed reload after cacheTime timer cancellation: entry is `"failed"`, stale is `false` (existing Phase 1/2 behavior preserved).

#### Deduplicate interaction

15. cacheTime and `deduplicate: true` — eviction does not affect deduplication (orthogonal concerns).
16. cacheTime with concurrent loads — cacheTime timer is cleared when any load starts for that entry key.

#### Invalidate interaction

17. `invalidate()` on non-stale entry: stale → true, cacheTime timer starts.
18. `invalidate()` on already-stale entry: no-op (cacheTime timer continues unaffected).
19. `invalidate()` during cacheTime window: no-op (entry already stale, timer continues).

#### Non-keyed resources

20. Non-keyed resource with cacheTime: entry evicted after cacheTime from invalidate/staleTime expiry.
21. Non-keyed resource without cacheTime: no time-based eviction (current behavior).

#### Dispose

22. `dispose()` clears all cacheTime timers for all entries.
23. `dispose()` clears stale entries with active cacheTime timers (no late evictions after dispose).

#### CacheTime edge cases

24. cacheTime with no staleTime — only manual `invalidate()` triggers cacheTime timer.
25. cacheTime: 0 with staleTime set — staleTime fires, stale is set, cacheTime=0 means evict on next tick.
26. Multiple keys with different cacheTime values — each entry's timer runs independently.
27. Switching between keys multiple times — each entry's cacheTime timer only starts when that entry becomes stale.

#### TypeScript

28. `cacheTime` accepts `number | undefined` (optional).
29. Existing type-only tests continue to pass.

---

### Compatibility Notes

#### Backward Compatibility

- Resources without `cacheTime` (the default) behave identically before and after Phase 3.
- Resources without any `cache` option behave identically.
- `ResourceRef`, `ResourceNode`, `ScreenRuntime`, and `createResourceNode` signatures are backward compatible (the new `cacheTime` option is optional).
- All existing tests pass without modification.
- All examples compile and run without changes.

#### Migration

- **No migration required** for existing resources — `cacheTime` is opt-in.
- Users who want "stale data grace period" add `cache: { cacheTime: 30000 }` to their resource config.
- Users who set `cacheTime: 0` explicitly enable immediate eviction on staleness (aggressive setting).

#### Interaction with Existing Features

- **`invalidate()`** — now starts cacheTime timer (new behavior, but non-breaking because no existing code uses cacheTime).
- **`staleTime`** — expiry now starts cacheTime timer (new behavior).
- **`deduplicate`** — orthogonal, no change.
- **`cache.key`** — each keyed entry has an independent cacheTime timer.
- **`autoLoad`** — no interaction.
- **Action invalidation** — calls `invalidate()` which starts cacheTime timer.
- **`dispose()`** — clears all cacheTime timers (no change in visible behavior).

#### Open Questions (Resolved for Phase 3)

- **Should expired inactive entries be deleted from the Map?** Yes. This keeps the Map clean and avoids memory leaks.
- **Shared timer wheel vs individual setTimeout?** `setTimeout` is fine for Phase 3 (typical entry count is small). A shared timer wheel could optimize many entries but is premature.
- **Should cacheTime accept `Infinity`?** Yes, equivalent to `undefined` (no time-based eviction). The `isFinite()` check handles this.
- **Should cacheTime be typed as `number | undefined`?** Yes, following the existing `staleTime` convention.
- **Should cacheTime default to `0` (original proposal) or `undefined`?** `undefined`, to distinguish "no eviction" from "immediate eviction."

#### Known Limitations (Phase 3)

- `cacheTime` does not survive runtime disposal. Navigating away clears all entries.
- `cacheTime` does not trigger automatic reload. That requires SWR (Phase 4).
- No global or LRU eviction. Memory usage scales linearly with number of unique keys.
- No cache size limits.

---

## Implementation Sketch

### New types in `packages/core/src/resource.ts`

```ts
export type ResourceKey = string | number | boolean | null | undefined | ResourceKey[]

export type ResourceCacheStore = {
  get<TValue>(key: string): CacheEntry<TValue> | undefined
  set<TValue>(key: string, entry: CacheEntry<TValue>): void
  delete(key: string): void
  clear(): void
}

export type CacheEntry<TValue = unknown> = {
  value: TValue
  loadedAt: number
  staleAt: number
  expiresAt: number
}

export type ResourceCacheOptions<TServices extends object = DefaultScreenServices> = {
  key?: (context: ResourceLoadContext<TServices>) => ResourceKey
  staleTime?: number
  cacheTime?: number
  swr?: boolean
  deduplicate?: boolean
}
```

### Changes to `ResourceConfig`

Add optional `cache?: ResourceCacheOptions<TServices>`.

### Changes to `createResourceNode`

- Accept a `cache` options object.
- If `staleTime` is set, start a timer after each successful load. When it
  fires, call `invalidate()` internally.
- If `cacheTime` is set, start an eviction timer when the resource becomes
  stale or when `dispose()` is called.
- If `deduplicate` is true, track in-flight promises by key and reuse them.

### Changes to `ScreenRuntime`

- Accept an optional `cacheStore: ResourceCacheStore`.
- On resource node creation, check the cache store for existing entries.
- On resource discovery, write back to the cache store.
- On runtime disposal, do NOT evict from the cache store immediately —
  let the entry's `expiresAt` handle eviction.

### New in-memory cache store

```ts
export class InMemoryResourceCache implements ResourceCacheStore {
  private _store = new Map<string, CacheEntry>()
  get<TValue>(key: string): CacheEntry<TValue> | undefined { /* ... */ }
  set<TValue>(key: string, entry: CacheEntry<TValue>): void { /* ... */ }
  delete(key: string): void { /* ... */ }
  clear(): void { /* ... */ }
  // Optional: periodic cleanup of expired entries via setTimeout or idle callback
}
```

---

## Migration

All new options are **opt-in**. Existing resources without a `cache` option
behave exactly as they do today:

- No `key` → name-based identity (current behavior).
- No `staleTime` → manual invalidation only (current behavior).
- No `cacheTime` → no retention after stale or disposal (current behavior).
- No `swr` → no background revalidation (current behavior).
- `deduplicate` defaults to `true` (new default, but practically inert unless
  concurrent `load()` calls occur).

The only behavioral change for existing code is the `deduplicate: true`
default. If existing code intentionally fires concurrent `load()` calls and
expects them to each invoke the loader, those resources would need
`deduplicate: false`.

No changeset is needed for this proposal — it is design-only.

---

## Future Work (Separate Proposals)

- **Streaming resources** — `stream: true` from the spec.
- **SSR hydration** — serialize resource state server-side, hydrate client-side.
- **Suspense integration** — throw promises for async boundaries.
- **Optimistic updates** — set expected value before mutation completes.
- **Server resources** — unify `packages/server` resource model with core.

---

## Related

- `docs/Resources.md:254` — Current boundaries: "No staleTime", "No global
  cache", "No automatic background refetching."
- `docs/Specification.md:1691` — Resource spec: keying, staleTime, cacheTime,
  invalidation, dependency tracking.
- `packages/core/src/resource.ts` — Current `ResourceNode`, `ResourceConfig`,
  `createResourceNode` implementation.
- `docs/MVP-Checkpoint.md` — "Resource cache policy" listed as unproven.

---

## Implementation Status

### Phase 1 (implemented in `@intent-framework/core@0.1.0-alpha.8`)

- `cache.staleTime` — time-based automatic staleness
- `cache.deduplicate` — in-flight load deduplication
- Resources without `cache` options behave exactly as before

### Phase 2 (implemented in `@intent-framework/core@0.1.0-alpha.9`)

- `cache.key` — per-key resource entries within a single ResourceNode
- Per-key value, status, error, stale flag, staleTime timer, and in-flight promise
- ResourceRef proxies the active key entry
- Non-keyed resources preserve backward compatibility

| Aspect | Decision |
|--------|----------|
| Scope | `cache.key` only, scoped to one runtime + one `ResourceNode` |
| Internal storage | `Map<ResourceKey, CacheEntry>` within `ResourceNode` |
| Key derivation | `key(context)` on load/reload; `key(lastContext)` on no-arg reload |
| Deduplication | Per-key (each entry has its own in-flight promise) |
| staletime | Per-key (each entry has its own timer) |
| Active key | Determined by last `load()`/`reload()` context |
| Non-keyed resources | Store one entry under sentinel key (`null`) — behavior unchanged |
| Backward compat | Full — all existing tests pass without modification |
| New exports | `ResourceKey` type only |

### Phase 3 (implemented in `@intent-framework/core@0.1.0-alpha.10`, PR #127)

- **`cacheTime`** — single-runtime in-memory entry retention/eviction
- Per-key eviction within a single `ResourceNode`
- Active entry eviction clears value/error/status/stale and notifies subscribers
- Inactive entry eviction removes from Map silently
- See "Phase 3: CacheTime — Single-Runtime Design" section above

| Aspect | Decision |
|--------|----------|
| Scope | `cacheTime` only, single-runtime, per `ResourceNode`, per key |
| Default | `undefined` (no time-based eviction) |
| Timer start | On staleness (`invalidate()`, action invalidation, `staleTime` expiry) |
| Timer cancel | Successful `load()`/`reload()`, or explicit `load()`/`reload()` start |
| Active eviction | Clear entry state, notify subscribers |
| Inactive eviction | Remove entry from Map, no notification |
| Failed reload | Does NOT start cacheTime (preserves Phase 1/2 failure behavior) |
| In-flight promise | Left unchanged on eviction; resolves to no-op if entry removed |
| `dispose()` | Clears all cacheTime timers and all entries |
| Cross-navigation survival | No — runtime disposal clears everything |
| New exports | None (additive option on existing type) |

### Phase 4+ (future, not yet implemented)

- **Phase 4:** `swr` — stale-while-revalidate background refetching (requires cacheTime + cache.key)
- **Phase 5+:** Cross-navigation cache store — `ResourceCacheStore` interface, `InMemoryResourceCache`, runtime integration
- **Phase 6+:** Dependency-tracked keys — reactive key functions
- **Future (separate proposals):** Streaming resources, SSR hydration, Suspense integration, Optimistic updates, Server resources
