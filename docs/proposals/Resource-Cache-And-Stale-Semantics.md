# Resource Cache and Stale Semantics — Design Proposal

**Status:** Proposal  
**Date:** 2026-06-26  
**Author:** Big Pickle  
**Affected package:** `@intent-framework/core`  
**Related docs:** `docs/Resources.md`, `docs/Specification.md`

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
7. Do **not** implement any of this. This is a design-only proposal.

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
  key: ({ route }) => route.params.teamId,
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
cacheTime?: number  // milliseconds, default 0
```

`cacheTime` controls how long a resource value is retained after it becomes
stale or after its runtime is disposed:

```
load() succeeds → value cached
  ... staleTime elapses → stale: true
  ... cacheTime elapses → value evicted, status → "idle" (or "pending" if SWR)
```

If `cacheTime` is `0` (default), the value is kept while `stale` is true but
evicted immediately when the resource is removed (runtime disposal) or when a
new load needs to run.

**Effect on status:**
- While a resource is stale and within `cacheTime`: `.status` remains `"ready"`,
  `.value` returns data.
- After `cacheTime` elapses without a successful reload: `.status` transitions
  to `"idle"` (or starts reloading automatically, see SWR below).
- A new `load()` call always starts fresh: status → `"pending"`, value →
  `undefined`, cache timer cancelled.

**Rationale:** `cacheTime` exists as a separate concern from `staleTime`
to support patterns like:
- "Consider data stale after 5 minutes, but keep showing it for up to 30
  minutes while the user is on the screen."
- "After navigating away, keep the data in memory for 10 minutes in case
  the user navigates back."

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
   * Time in milliseconds that a stale or disposed resource's value is
   * retained before eviction. Default: 0 (evict immediately on stale
   * transition or disposal).
   * During cacheTime, .status remains "ready" and .value is available.
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
| unset | `10m` | unset | Value survives runtime disposal for up to 10 min (cross-navigation cache) |
| `5m` | `0` | `true` | Stale after 5 min → background reload; no retention if reload fails |
| unset | unset | unset | with `deduplicate: true`: concurrent loads share one promise |

---

## Open Questions

1. **Should `ResourceConfig.cache` be a flat object on the config, or should
   each option (key, staleTime, cacheTime, swr) be a top-level config key?**
   This proposal groups them under `cache` for clarity, but they could also
   be flat. Example: `$.resource("team", { load, key, staleTime: 300000 })`.

2. **Should the in-memory cache store be part of `@intent-framework/core` or
   a separate `@intent-framework/cache` package?** The store interface could
   live in core; the default `InMemoryResourceCache` implementation could be
   in core or a separate package. A separate package would allow alternative
   implementations (e.g. `@intent-framework/cache-redis`, LRU-only, etc.).

3. **How should `cacheTime` interact with runtime disposal during navigation?**
   This proposal says the cache store holds entries after disposal. But who
   owns the cache store? A global singleton, or per-app-tree? A global store
   could cause memory leaks if the user navigates through many screens. A
   per-tree store (owned by the router) is safer.

4. **Should `swr: true` imply `deduplicate: true`** when not set? It seems
   intuitive that background revalidation would deduplicate. If the user
   calls `reload()` manually while an SWR background reload is in flight,
   should it deduplicate or force a fresh load?

5. **How should the SWR background reload handle errors?** Current behavior
   on load failure: status → "failed", error set. With SWR, a background
   reload failure should probably keep the old value and leave stale: true,
   rather than transitioning to "failed". The UI would see "stale data
   available, background refresh failed".

6. **Should `key` support dependency tracking** (like a derived signal) so
   that when the key's dependencies change, the resource automatically
   reloads? For example, if `key: ({ route }) => route.params.teamId`, and
   the route param changes, the resource auto-reloads with the new key.
   This is powerful but adds complexity — the key function would need to
   be reactive.

7. **What about resource status?** The current four states (idle, pending,
   ready, failed) may need a fifth: `"stale-while-revalidate"` to distinguish
   "showing fresh data" from "showing stale data while refetching". However,
   this can also be derived from `.status === "ready" && .stale === true`.

8. **Should `cacheTime` extend beyond the screen's lifetime?** If a user
   navigates from Screen A to Screen B and back, should Screen A's resources
   still be cached? This requires the cache store to survive screen disposal.
   With a per-route-tree cache store, navigating back to a previously visited
   screen within the same tree would find the cached entry.

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
