import { signal, createCondition, type Signal, type Condition } from "./signal.js"

export interface TextState {
  value: string
  valid: Condition
  set(value: string): void
  onChange(fn: (value: string) => void): () => void
  clear(): void
}

export interface BooleanState {
  value: boolean
  valid: Condition
  set(value: boolean): void
  toggle(): void
  onChange(fn: (value: boolean) => void): () => void
}

export interface ChoiceState<T extends string> {
  value: T
  valid: Condition
  set(value: T): void
  options: readonly T[]
  onChange(fn: (value: T) => void): () => void
}

export function createTextState(_name: string, initial = ""): TextState {
  const sig: Signal<string> = signal(initial)

  const validCondition = createCondition(
    () => sig.get().length > 0,
    notify => sig.subscribe(() => notify()),
  )

  return {
    get value() {
      return sig.get()
    },
    get valid() {
      return validCondition
    },
    set(value: string) {
      sig.set(value)
    },
    onChange(fn: (value: string) => void) {
      return sig.subscribe(fn)
    },
    clear() {
      sig.set("")
    },
  }
}

export function createBooleanState(_name: string, initial = false): BooleanState {
  const sig: Signal<boolean> = signal(initial)

  const validCondition = createCondition(
    () => true,
    notify => sig.subscribe(() => notify()),
  )

  return {
    get value() {
      return sig.get()
    },
    get valid() {
      return validCondition
    },
    set(value: boolean) {
      sig.set(value)
    },
    toggle() {
      sig.set(!sig.get())
    },
    onChange(fn: (value: boolean) => void) {
      return sig.subscribe(fn)
    },
  }
}

export function createChoiceState<T extends string>(
  _name: string,
  opts: { initial: T; options: readonly T[] },
): ChoiceState<T> {
  if (!opts.options.includes(opts.initial)) {
    throw new Error(
      `state.choice initial value "${opts.initial}" must be one of the provided options`,
    )
  }

  const sig: Signal<T> = signal(opts.initial)

  const validCondition = createCondition(
    () => opts.options.includes(sig.get()),
    notify => sig.subscribe(() => notify()),
  )

  return {
    get value() {
      return sig.get()
    },
    get valid() {
      return validCondition
    },
    set(value: T) {
      sig.set(value)
    },
    get options() {
      return opts.options
    },
    onChange(fn: (value: T) => void) {
      return sig.subscribe(fn)
    },
  }
}
