import { signal, createCondition, type Signal, type Condition } from "./signal.js"
import type { ActionExecutionContext, DefaultScreenServices } from "./act.js"

export type ResourceStatus = "idle" | "pending" | "ready" | "failed"

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

export type ResourceCacheOptions = {
  staleTime?: number
  deduplicate?: boolean
}

export type ResourceConfig<TValue = unknown, TServices extends object = DefaultScreenServices> = {
  id: string
  name: string
  autoLoad: boolean
  loader: ResourceLoader<TValue, TServices>
  cache?: ResourceCacheOptions
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
  cache?: ResourceCacheOptions,
): ResourceNode<TValue, TServices> {
  const statusSignal: Signal<number> = signal(0)
  const staleSignal: Signal<number> = signal(0)

  let currentStatus: ResourceStatus = "idle"
  let currentValue: TValue | undefined = undefined
  let currentError: unknown = undefined
  let currentStale = false
  let lastContext: ResourceLoadContext<TServices> | undefined = undefined

  let _staleTimer: ReturnType<typeof setTimeout> | null = null
  let _inFlightPromise: Promise<void> | null = null

  const notify = () => statusSignal.set(statusSignal.get() + 1)
  const staleNotify = () => staleSignal.set(staleSignal.get() + 1)

  const shouldDeduplicate = cache ? cache.deduplicate !== false : false

  let _ready: Condition | undefined
  let _pending: Condition | undefined
  let _failed: Condition | undefined
  let _stale: Condition | undefined

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

  function _clearStaleTimer(): void {
    if (_staleTimer != null) {
      clearTimeout(_staleTimer)
      _staleTimer = null
    }
  }

  function _startStaleTimer(): void {
    _clearStaleTimer()
    if (cache?.staleTime != null && isFinite(cache.staleTime)) {
      _staleTimer = setTimeout(() => {
        if (!currentStale) {
          currentStale = true
          staleNotify()
        }
      }, cache.staleTime)
    }
  }

  function executeLoad(context?: ResourceLoadContext<TServices>): Promise<void> {
    if (shouldDeduplicate && _inFlightPromise) {
      return _inFlightPromise
    }

    currentStale = false
    staleNotify()
    currentStatus = "pending"
    currentValue = undefined
    currentError = undefined
    notify()

    if (context !== undefined) {
      lastContext = context
    }
    const loadContext = context ?? lastContext ?? ({} as ResourceLoadContext<TServices>)

    const promise = (async (): Promise<void> => {
      try {
        const result = await Promise.resolve(
          (loader as (ctx: ResourceLoadContext<TServices>) => TValue | Promise<TValue>)(
            loadContext
          )
        )
        currentValue = result
        currentStatus = "ready"
        currentStale = false
        notify()
        staleNotify()
        _startStaleTimer()
      } catch (e: unknown) {
        currentError = e
        currentStatus = "failed"
        currentStale = false
        notify()
        staleNotify()
      } finally {
        _inFlightPromise = null
      }
    })()

    _inFlightPromise = promise
    return promise
  }

  function invalidate(): void {
    if (!currentStale) {
      currentStale = true
      staleNotify()
    }
  }

  function dispose(): void {
    _clearStaleTimer()
    _inFlightPromise = null
  }

  const node: ResourceNode<TValue, TServices> = {
    id,
    name,
    autoLoad,
    get status() {
      return currentStatus
    },
    get value() {
      return currentValue
    },
    get error() {
      return currentError
    },
    get ready() {
      return getReady()
    },
    get pending() {
      return getPending()
    },
    get failed() {
      return getFailed()
    },
    get stale() {
      return getStale()
    },
    load: executeLoad,
    reload: executeLoad,
    invalidate,
    subscribe(fn: () => void) {
      return statusSignal.subscribe(fn)
    },
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
