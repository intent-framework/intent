---
"@intent-framework/core": patch
---

Implement resource cache semantics phase 1: `cache.staleTime` for time-based staleness and `cache.deduplicate` for in-flight load/reload deduplication. Resources without `cache` options behave exactly as before.
