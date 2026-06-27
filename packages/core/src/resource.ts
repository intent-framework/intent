import { signal, createCondition, type Signal, type Condition } from "./signal.js"
import type { ActionExecutionContext, DefaultScreenServices } from "./act.js"

export type ResourceStatus = "idle" | "pending" | "ready" | "failed"

export type ResourceKey = string | number | boolean | null | undefined | ResourceKey[]

export type ResourceLoadContext<TServices extends object = DefaultScreenServices> =
  ActionExecutionContext<TServices>

type ResourceLoader<TValue, TServices extends object> =
  | (() => TValue | Promise<TValue>)
  | ((context: ResourceLoadContext<TServices>) => TValue | Promise<TValue>)

export type ResourceNode<TValue, TServices extends object = DefaultScreenServices> = {
  id: string
  name: string
  autoLoad: boolean
  status: ResourceStatus
  value: TValue | undefined
  error: unknown | undefined
  ready: Condition
  pending: Condition
  failed: Condition
  stale: Condition
  load: (context?: ResourceLoadContext<TServices>) => Promise<void>
  reload: (context?: ResourceLoadContext<TServices>) => Promise<void>
  invalidate: () => void
  subscribe: (fn: () => void) => () => void
  dispose: () => void
}

export type AnyResourceNode = ResourceNode<unknown, any>

export type ResourceCacheOptions<TServices extends object = DefaultScreenServices> = {
  key?: (context: ResourceLoadContext<TServices>) => ResourceKey
  staleTime?: number
  deduplicate?: boolean
}

export type ResourceConfig<TValue = unknown, TServices extends object = DefaultScreenServices> = {
  id: string
  name: string
  autoLoad: boolean
  loader: ResourceLoader<TValue, TServices>
  cache?: ResourceCacheOptions<TServices>
  ref?: ResourceRef<TValue, TServices>
}

export function createResourceConfig<TValue, TServices extends object = DefaultScreenServices>(
  id: string,
  name: string,
  loader: ResourceLoader<TValue, TServices>,
  autoLoad = true,
): ResourceConfig<TValue, TServices> {
  return { id, name, autoLoad, loader }
}

export function createResourceNode<TValue, TServices extends object = DefaultScreenServices>(
  id: string,
  name: string,
  loader: ResourceLoader<TValue, TServices>,
  autoLoad = true,
  cache?: ResourceCacheOptions<TServices>,
): ResourceNode<TValue, TServices> {
  const statusSignal: Signal<number> = signal(0)
  const staleSignal: Signal<number> = signal(0)

  const hasKey = typeof cache?.key === "function"
  const DEFAULT_KEY = ""

  type Entry = {
    value: TValue | undefined
    status: ResourceStatus
    error: unknown
    stale: boolean
    staleTimer: ReturnType<typeof setTimeout> | null
    inFlightPromise: Promise<void> | null
  }

  function createEntry(): Entry {
    return {
      value: undefined,
      status: "idle",
      error: undefined,
      stale: false,
      staleTimer: null,
      inFlightPromise: null,
    }
  }

  const entries = new Map<string, Entry>()
  let _activeKey: string = DEFAULT_KEY

  // For non-keyed resources, pre-create the default entry
  if (!hasKey) {
    entries.set(DEFAULT_KEY, createEntry())
  }

  // Sync-target variables read by public getters and conditions
  let currentStatus: ResourceStatus = "idle"
  let currentValue: TValue | undefined = undefined
  let currentError: unknown = undefined
  let currentStale = false
  let lastContext: ResourceLoadContext<TServices> | undefined = undefined

  const notify = () => statusSignal.set(statusSignal.get() + 1)
  const staleNotify = () => staleSignal.set(staleSignal.get() + 1)

  const shouldDeduplicate = cache ? cache.deduplicate !== false : false

  let _ready: Condition | undefined
  let _pending: Condition | undefined
  let _failed: Condition | undefined
  let _stale: Condition | undefined

  // --- Entry helpers ---
  function getActiveEntry(): Entry {
    let entry = entries.get(_activeKey)
    if (!entry) {
      entry = createEntry()
      entries.set(_activeKey, entry)
    }
    return entry
  }

  function syncFromEntry(entry: Entry): void {
    currentStatus = entry.status
    currentValue = entry.value
    currentError = entry.error
    if (currentStale !== entry.stale) {
      currentStale = entry.stale
      staleNotify()
    }
    notify()
  }

  function syncFromActiveEntry(): void {
    syncFromEntry(getActiveEntry())
  }

  function encodeResourceKey(key: ResourceKey): unknown {
    if (Array.isArray(key)) {
      return ["array", key.map(encodeResourceKey)]
    }

    if (key === null) {
      return ["null"]
    }

    if (key === undefined) {
      return ["undefined"]
    }

    if (typeof key === "string") {
      return ["string", key]
    }

    if (typeof key === "boolean") {
      return ["boolean", key]
    }

    if (typeof key === "number") {
      if (Number.isNaN(key)) return ["number", "NaN"]
      if (key === Infinity) return ["number", "Infinity"]
      if (key === -Infinity) return ["number", "-Infinity"]
      if (Object.is(key, -0)) return ["number", "-0"]
      return ["number", key]
    }

    const exhaustive: never = key
    return exhaustive
  }

  function normalizeKey(key: ResourceKey): string {
    return JSON.stringify(encodeResourceKey(key))
  }

  function resolveKey(ctx?: ResourceLoadContext<TServices>): string {
    if (!hasKey) return DEFAULT_KEY
    const context = ctx ?? lastContext ?? ({} as ResourceLoadContext<TServices>)
    return normalizeKey(cache!.key!(context))
  }

  // --- Stale timer helpers ---
  function _clearEntryStaleTimer(entry: Entry): void {
    if (entry.staleTimer != null) {
      clearTimeout(entry.staleTimer)
      entry.staleTimer = null
    }
  }

  function _startEntryStaleTimer(entry: Entry): void {
    _clearEntryStaleTimer(entry)
    if (cache?.staleTime != null && isFinite(cache.staleTime)) {
      entry.staleTimer = setTimeout(() => {
        if (!entry.stale) {
          entry.stale = true
          if (entry === getActiveEntry()) {
            currentStale = true
            staleNotify()
          }
        }
      }, cache.staleTime)
    }
  }

  // Condition getters (read from synced variables)
  function getReady(): Condition {
    if (!_ready) {
      _ready = createCondition(
        () => currentStatus === "ready",
        notify => statusSignal.subscribe(() => notify()),
      )
    }
    return _ready
  }

  function getPending(): Condition {
    if (!_pending) {
      _pending = createCondition(
        () => currentStatus === "pending",
        notify => statusSignal.subscribe(() => notify()),
      )
    }
    return _pending
  }

  function getFailed(): Condition {
    if (!_failed) {
      _failed = createCondition(
        () => currentStatus === "failed",
        notify => statusSignal.subscribe(() => notify()),
      )
    }
    return _failed
  }

  function getStale(): Condition {
    if (!_stale) {
      _stale = createCondition(
        () => currentStale,
        notify => staleSignal.subscribe(() => notify()),
      )
    }
    return _stale
  }

  function executeLoad(context?: ResourceLoadContext<TServices>): Promise<void> {
    const key = resolveKey(context)
    _activeKey = key

    let entry = entries.get(key)
    if (!entry) {
      entry = createEntry()
      entries.set(key, entry)
    }

    if (shouldDeduplicate && entry.inFlightPromise) {
      return entry.inFlightPromise
    }

    if (context !== undefined) {
      lastContext = context
    }
    const loadContext = context ?? lastContext ?? ({} as ResourceLoadContext<TServices>)

    entry.stale = false
    entry.status = "pending"
    entry.value = undefined
    entry.error = undefined
    syncFromActiveEntry()

    const promise = (async (): Promise<void> => {
      try {
        const result = await Promise.resolve(
          (loader as (ctx: ResourceLoadContext<TServices>) => TValue | Promise<TValue>)(loadContext)
        )
        entry!.value = result
        entry!.status = "ready"
        entry!.stale = false
        if (entry === getActiveEntry()) syncFromEntry(entry!)
        staleNotify()
        _startEntryStaleTimer(entry!)
      } catch (e: unknown) {
        entry!.error = e
        entry!.status = "failed"
        entry!.stale = false
        if (entry === getActiveEntry()) syncFromEntry(entry!)
        staleNotify()
      } finally {
        entry!.inFlightPromise = null
      }
    })()

    entry.inFlightPromise = promise
    return promise
  }

  function invalidate(): void {
    const entry = getActiveEntry()
    if (!entry.stale) {
      entry.stale = true
      if (entry === getActiveEntry()) {
        currentStale = true
        staleNotify()
      }
    }
  }

  function dispose(): void {
    for (const entry of entries.values()) {
      _clearEntryStaleTimer(entry)
      entry.inFlightPromise = null
    }
  }

  const node: ResourceNode<TValue, TServices> = {
    id,
    name,
    autoLoad,
    get status() { return currentStatus },
    get value() { return currentValue },
    get error() { return currentError },
    get ready() { return getReady() },
    get pending() { return getPending() },
    get failed() { return getFailed() },
    get stale() { return getStale() },
    load: executeLoad,
    reload: executeLoad,
    invalidate,
    subscribe(fn: () => void) { return statusSignal.subscribe(fn) },
    dispose,
  }

  return node
}

export class ResourceRef<TValue, TServices extends object = DefaultScreenServices> {
  readonly id: string
  readonly name: string
  readonly autoLoad: boolean
  readonly loader: ResourceLoader<TValue, TServices>

  private _connected: ResourceNode<TValue, TServices> | null = null
  private _connSignal: Signal<number> = signal(0)
  private _nodeSub: (() => void) | null = null
  private _readyCache: Condition | undefined
  private _pendingCache: Condition | undefined
  private _failedCache: Condition | undefined
  private _staleCache: Condition | undefined

  constructor(
    id: string,
    name: string,
    loader: ResourceLoader<TValue, TServices>,
    autoLoad: boolean,
  ) {
    this.id = id
    this.name = name
    this.loader = loader
    this.autoLoad = autoLoad
  }

  get status(): ResourceStatus {
    return this._connected?.status ?? "idle"
  }

  get value(): TValue | undefined {
    return this._connected?.value as TValue | undefined
  }

  get error(): unknown | undefined {
    return this._connected?.error
  }

  get ready(): Condition {
    if (!this._readyCache) {
      this._readyCache = createCondition(
        () => this._connected?.status === "ready",
        notify => {
          const unsubs: (() => void)[] = []
          unsubs.push(this._connSignal.subscribe(notify))
          const node = this._connected
          if (node) unsubs.push(node.ready.subscribe(notify))
          return () => { for (const u of unsubs) u() }
        },
      )
    }
    return this._readyCache
  }

  get pending(): Condition {
    if (!this._pendingCache) {
      this._pendingCache = createCondition(
        () => this._connected?.status === "pending",
        notify => {
          const unsubs: (() => void)[] = []
          unsubs.push(this._connSignal.subscribe(notify))
          const node = this._connected
          if (node) unsubs.push(node.pending.subscribe(notify))
          return () => { for (const u of unsubs) u() }
        },
      )
    }
    return this._pendingCache
  }

  get failed(): Condition {
    if (!this._failedCache) {
      this._failedCache = createCondition(
        () => this._connected?.status === "failed",
        notify => {
          const unsubs: (() => void)[] = []
          unsubs.push(this._connSignal.subscribe(notify))
          const node = this._connected
          if (node) unsubs.push(node.failed.subscribe(notify))
          return () => { for (const u of unsubs) u() }
        },
      )
    }
    return this._failedCache
  }

  get stale(): Condition {
    if (!this._staleCache) {
      this._staleCache = createCondition(
        () => this._connected?.stale.current ?? false,
        notify => {
          const unsubs: (() => void)[] = []
          unsubs.push(this._connSignal.subscribe(notify))
          const node = this._connected
          if (node) unsubs.push(node.stale.subscribe(notify))
          return () => { for (const u of unsubs) u() }
        },
      )
    }
    return this._staleCache
  }

  load(context?: ResourceLoadContext<TServices>): Promise<void> {
    return this._connected?.load(context) ?? Promise.resolve()
  }

  reload(context?: ResourceLoadContext<TServices>): Promise<void> {
    return this._connected?.reload(context) ?? Promise.resolve()
  }

  invalidate(): void {
    this._connected?.invalidate()
  }

  subscribe(fn: () => void): () => void {
    return this._connSignal.subscribe(fn)
  }

  _connect(node: ResourceNode<TValue, TServices>): void {
    this._disconnect()
    this._connected = node
    this._nodeSub = node.subscribe(() => {
      this._connSignal.set(this._connSignal.get() + 1)
    })
    this._connSignal.set(this._connSignal.get() + 1)
  }

  _disconnect(expectedNode?: ResourceNode<TValue, TServices>): void {
    if (expectedNode && this._connected !== expectedNode) return
    this._nodeSub?.()
    this._nodeSub = null
    this._connected = null
    this._connSignal.set(this._connSignal.get() + 1)
  }
}
