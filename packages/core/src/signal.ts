export type Condition = {
  readonly current: boolean
  readonly reason?: string
  subscribe(fn: () => void): () => void
}

export function isCondition(value: unknown): value is Condition {
  return typeof value === "object" && value !== null && "current" in value && "subscribe" in value
}

export function createCondition(
  compute: () => boolean,
  subscribeToChanges: (onChange: () => void) => () => void,
  reason?: string,
): Condition {
  return {
    get current() {
      return compute()
    },
    reason,
    subscribe(fn: () => void) {
      return subscribeToChanges(() => fn())
    },
  }
}

export type Signal<T> = {
  get(): T
  set(value: T): void
  subscribe(fn: (value: T) => void): () => void
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial
  const listeners = new Set<(value: T) => void>()

  return {
    get() {
      return value
    },
    set(newValue: T) {
      if (newValue !== value) {
        value = newValue
        for (const fn of listeners) {
          fn(value)
        }
      }
    },
    subscribe(fn: (value: T) => void) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}

export type Computed<T> = {
  get(): T
  subscribe(fn: (value: T) => void): () => void
}

export function derive<T>(
  dependencies: Array<{ subscribe: (fn: (...args: unknown[]) => void) => () => void; get(): unknown }>,
  compute: () => T,
): Computed<T> {
  let value = compute()
  const listeners = new Set<(value: T) => void>()

  const notify = () => {
    value = compute()
    for (const fn of listeners) {
      fn(value)
    }
  }

  for (const dep of dependencies) {
    dep.subscribe(notify)
  }

  return {
    get() {
      return value
    },
    subscribe(fn: (value: T) => void) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}
