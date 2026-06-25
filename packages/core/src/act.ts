import { signal, type Signal, isCondition, type Condition } from "./signal.js"
import { registerActNode } from "./registry.js"

export type FeedbackConfig = {
  pending?: string
  success?: string
  failure?: string | ((error: Error) => string)
}

export type ActStatus = "idle" | "pending" | "success" | "failure"

export type ActCondition = {
  check: () => boolean
  message?: string
}

export type ActNode = {
  id: string
  label: string
  primary: boolean
  conditions: ActCondition[]
  handler: (() => Promise<void> | void) | null
  feedback?: FeedbackConfig
  status: ActStatus
  statusMessage: string | null
  enabled: boolean
  execute: () => Promise<void>
  onStatusChange: (fn: () => void) => () => void
}

export function createActNode(
  id: string,
  label: string,
  conditions: ActCondition[],
  handler: (() => Promise<void> | void) | null,
  feedback: FeedbackConfig | undefined,
  primary: boolean,
): ActNode {
  const statusSignal: Signal<number> = signal(0)

  const notifyStatus = () => statusSignal.set(statusSignal.get() + 1)

  const node: ActNode = {
    id,
    label,
    primary,
    conditions,
    handler,
    feedback,
    status: "idle",
    statusMessage: null,
    get enabled() {
      return computeActEnabled(node)
    },
    execute: async () => {
      await executeAct(node, notifyStatus)
    },
    onStatusChange(fn: () => void) {
      return statusSignal.subscribe(fn)
    },
  }
  return node
}

function computeActEnabled(node: ActNode): boolean {
  for (const cond of node.conditions) {
    if (!cond.check()) {
      return false
    }
  }
  return true
}

async function executeAct(node: ActNode, notify: () => void): Promise<void> {
  if (!node.enabled || !node.handler) {
    return
  }

  node.status = "pending"
  node.statusMessage = node.feedback?.pending ?? null
  notify()

  try {
    await node.handler()
    node.status = "success"
    node.statusMessage = node.feedback?.success ?? null
    notify()
  } catch (error: unknown) {
    node.status = "failure"
    const fb = node.feedback?.failure
    if (typeof fb === "function") {
      node.statusMessage = fb(error instanceof Error ? error : new Error(String(error)))
    } else {
      node.statusMessage = fb ?? null
    }
    notify()
  }
}

export class ActBuilder {
  private node: ActNode

  constructor(label: string) {
    const id = `act_${label.toLowerCase().replace(/\s+/g, "_")}`
    this.node = createActNode(id, label, [], null, undefined, false)
    registerActNode(this.node)
  }

  primary(): this {
    this.node.primary = true
    return this
  }

  when(condition: Condition | boolean | (() => boolean) | { valid: Condition | boolean }, message?: string): this {
    let check: () => boolean
    if (typeof condition === "function") {
      check = condition as () => boolean
    } else if (typeof condition === "object" && condition !== null && "valid" in condition) {
      const state = condition as { valid: Condition | boolean }
      if (isCondition(state.valid)) {
        const cond = state.valid
        check = () => cond.current
      } else {
        const val = state.valid
        check = () => val
      }
    } else if (isCondition(condition)) {
      check = () => condition.current
    } else {
      check = () => condition as boolean
    }
    this.node.conditions.push({ check, message })
    return this
  }

  does(fn: () => Promise<void> | void): this {
    this.node.handler = fn
    return this
  }

  feedback(fb: FeedbackConfig): this {
    this.node.feedback = fb
    return this
  }

  toNode(): ActNode {
    return this.node
  }
}
