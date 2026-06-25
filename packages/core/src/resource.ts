import { signal, createCondition, type Signal, type Condition } from "./signal.js"

export type ResourceStatus = "idle" | "pending" | "ready" | "failed"

export type ResourceNode<T> = {
  id: string
  name: string
  autoLoad: boolean
  status: ResourceStatus
  value: T | undefined
  error: unknown | undefined
  ready: Condition
  pending: Condition
  failed: Condition
  stale: Condition
  load: () => Promise<void>
  reload: () => Promise<void>
  invalidate: () => void
  subscribe: (fn: () => void) => () => void
}

export type AnyResourceNode = ResourceNode<unknown>

export function createResourceNode<T>(
  id: string,
  name: string,
  loader: () => Promise<T>,
  autoLoad = true,
): ResourceNode<T> {
  const statusSignal: Signal<number> = signal(0)
  const staleSignal: Signal<number> = signal(0)

  let currentStatus: ResourceStatus = "idle"
  let currentValue: T | undefined = undefined
  let currentError: unknown = undefined
  let currentStale = false

  const notify = () => statusSignal.set(statusSignal.get() + 1)
  const staleNotify = () => staleSignal.set(staleSignal.get() + 1)

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

  async function executeLoad(): Promise<void> {
    currentStale = false
    staleNotify()
    currentStatus = "pending"
    currentValue = undefined
    currentError = undefined
    notify()

    try {
      const result = await loader()
      currentValue = result
      currentStatus = "ready"
      currentStale = false
      notify()
      staleNotify()
    } catch (e: unknown) {
      currentError = e
      currentStatus = "failed"
      currentStale = false
      notify()
      staleNotify()
    }
  }

  function invalidate(): void {
    if (!currentStale) {
      currentStale = true
      staleNotify()
    }
  }

  const node: ResourceNode<T> = {
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
  }

  return node
}
