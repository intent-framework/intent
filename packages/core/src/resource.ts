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
  load: () => Promise<void>
  reload: () => Promise<void>
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

  let currentStatus: ResourceStatus = "idle"
  let currentValue: T | undefined = undefined
  let currentError: unknown = undefined

  const notify = () => statusSignal.set(statusSignal.get() + 1)

  let _ready: Condition | undefined
  let _pending: Condition | undefined
  let _failed: Condition | undefined

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

  async function executeLoad(): Promise<void> {
    currentStatus = "pending"
    currentValue = undefined
    currentError = undefined
    notify()

    try {
      const result = await loader()
      currentValue = result
      currentStatus = "ready"
      notify()
    } catch (e: unknown) {
      currentError = e
      currentStatus = "failed"
      notify()
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
    load: executeLoad,
    reload: executeLoad,
    subscribe(fn: () => void) {
      return statusSignal.subscribe(fn)
    },
  }

  return node
}
