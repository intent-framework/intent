---
"@intent-framework/core": patch
---

feat(core): resource cacheTime — single-runtime stale-value eviction

Adds `cache.cacheTime` option to ResourceCacheOptions. When set, a stale entry's
value is retained for the specified milliseconds before being evicted. Active
entry eviction resets status to idle, clears value/error/stale, and notifies
subscribers. Inactive keyed entry eviction silently removes the entry. Works per
key, per ResourceNode, within a single ScreenRuntime. No cross-navigation
survival. No SWR.
