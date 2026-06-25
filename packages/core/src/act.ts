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
}

export function createActNode(
  id: string,
  label: string,
  conditions: ActCondition[],
  handler: (() => Promise<void> | void) | null,
  feedback: FeedbackConfig | undefined,
  primary: boolean,
): ActNode {
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
      await executeAct(node)
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

async function executeAct(node: ActNode): Promise<void> {
  if (!node.enabled || !node.handler) {
    return
  }

  node.status = "pending"
  node.statusMessage = node.feedback?.pending ?? null

  try {
    await node.handler()
    node.status = "success"
    node.statusMessage = node.feedback?.success ?? null
  } catch (error: unknown) {
    node.status = "failure"
    const fb = node.feedback?.failure
    if (typeof fb === "function") {
      node.statusMessage = fb(error instanceof Error ? error : new Error(String(error)))
    } else {
      node.statusMessage = fb ?? null
    }
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

  when(condition: boolean | (() => boolean) | { valid: boolean }, message?: string): this {
    let check: () => boolean
    if (typeof condition === "function") {
      check = condition as () => boolean
    } else if (typeof condition === "object" && condition !== null && "valid" in condition) {
      const state = condition as { valid: boolean }
      check = () => state.valid
    } else {
      const val = condition as boolean
      check = () => val
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
