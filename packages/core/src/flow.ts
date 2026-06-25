import { registerFlowNode } from "./registry.js"
import type { AnyAskNode } from "./ask.js"
import type { ActNode } from "./act.js"
import { AskBuilder } from "./ask.js"
import { ActBuilder } from "./act.js"

export type FlowStep = { type: "ask"; node: AnyAskNode } | { type: "act"; node: ActNode }

export type FlowNode = {
  id: string
  name: string
  steps: FlowStep[]
}

export class FlowBuilder {
  private node: FlowNode

  constructor(name: string) {
    const id = `flow_${name}`
    this.node = {
      id,
      name,
      steps: [],
    }
    registerFlowNode(this.node)
  }

  startsWith(ask: AnyAskNode | AskBuilder<any>): this {
    const node = ask instanceof AskBuilder ? (ask as AskBuilder<any>).toNode() : ask
    this.node.steps.push({ type: "ask", node: node as unknown as AnyAskNode })
    return this
  }

  then(item: AnyAskNode | ActNode | AskBuilder<any> | ActBuilder): this {
    if (item instanceof ActBuilder) {
      this.node.steps.push({ type: "act", node: item.toNode() })
    } else if (item instanceof AskBuilder) {
      this.node.steps.push({ type: "ask", node: (item as AskBuilder<any>).toNode() as unknown as AnyAskNode })
    } else if ("validators" in (item as AnyAskNode)) {
      this.node.steps.push({ type: "ask", node: item as unknown as AnyAskNode })
    } else {
      this.node.steps.push({ type: "act", node: item as unknown as ActNode })
    }
    return this
  }

  toNode(): FlowNode {
    return this.node
  }
}
