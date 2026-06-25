import { registerAskNode } from "./registry.js"

export type AskKind = "text" | "contact" | "secret" | "choice"

export type AskNode<T> = {
  id: string
  label: string
  kind: AskKind
  contactKind?: string
  required: boolean
  requiredMessage?: string
  isPrivate: boolean
  hintText?: string
  validators: Array<(value: T) => string | boolean>
  state: { value: T }
  valid: boolean
  error: string | null
}

export type AnyAskNode = AskNode<unknown>

export function createAskNode<T>(
  id: string,
  label: string,
  stateRef: { value: T },
): AskNode<T> {
  const node: AskNode<T> = {
    id,
    label,
    kind: "text",
    required: false,
    isPrivate: false,
    validators: [],
    state: stateRef,
    get valid() {
      return computeAskValidity(node)
    },
    get error() {
      return computeAskError(node)
    },
  }
  return node
}

function computeAskValidity<T>(node: AskNode<T>): boolean {
  const value = node.state.value
  if (node.required && (value === "" || value === undefined || value === null)) {
    return false
  }
  for (const validator of node.validators) {
    const result = validator(value as T)
    if (result !== true) {
      return false
    }
  }
  return true
}

function computeAskError<T>(node: AskNode<T>): string | null {
  const value = node.state.value
  if (node.required && (value === "" || value === undefined || value === null)) {
    return node.requiredMessage ?? "This field is required."
  }
  for (const validator of node.validators) {
    const result = validator(value as T)
    if (result !== true) {
      return typeof result === "string" ? result : "Invalid value."
    }
  }
  return null
}

export class AskBuilder<T> {
  private node: AskNode<T>

  constructor(label: string, stateRef: { value: T }) {
    const id = `ask_${label.toLowerCase().replace(/\s+/g, "_")}`
    this.node = createAskNode(id, label, stateRef)
    registerAskNode(this.node as unknown as AnyAskNode)
  }

  asContact(kind: string): this {
    this.node.kind = "contact"
    this.node.contactKind = kind
    return this
  }

  asSecret(): this {
    this.node.kind = "secret"
    return this
  }

  asChoice(): this {
    this.node.kind = "choice"
    return this
  }

  required(message?: string): this {
    this.node.required = true
    this.node.requiredMessage = message
    return this
  }

  validate(fn: (value: T) => string | boolean): this {
    this.node.validators.push(fn)
    return this
  }

  private(): this {
    this.node.isPrivate = true
    return this
  }

  hint(text: string): this {
    this.node.hintText = text
    return this
  }

  toNode(): AskNode<T> {
    return this.node
  }
}
