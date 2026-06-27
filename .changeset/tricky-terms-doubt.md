---
"@intent-framework/core": patch
---

feat(core): resource cache phase 2 - cache.key

Adds `ResourceKey` type and `cache.key` option for resource cache keying.

- `cache.key` derives a resource entry key from the current load context
- One ResourceNode holds multiple internal entries, one per key
- Each entry independently tracks value, error, status, stale flag, staleTime timer, and in-flight promise
- ResourceRef proxies the active key entry
- cache.staleTime timers are per key
- cache.deduplicate deduplicates per active key
- Resources without cache.key behave exactly as before
