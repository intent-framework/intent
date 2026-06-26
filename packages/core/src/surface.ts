import { registerSurfaceNode, getSurfaces, nextSuffix } from "./registry.js"
import type { AnyAskNode } from "./ask.js"
import type { ActNode } from "./act.js"
import { AskBuilder } from "./ask.js"
import { ActBuilder } from "./act.js"

export type SurfaceNode = {
  id: string
  name: string
  items: Array<AnyAskNode | ActNode>
}

export class SurfaceBuilder {
  private node: SurfaceNode

  constructor(name: string) {
    const baseId = `surface_${name}`
    const existing = getSurfaces()
    const id = existing.has(baseId)
      ? nextSuffix(baseId, (id) => existing.has(id))
      : baseId
    this.node = {
      id,
      name,
      items: [],
    }
    registerSurfaceNode(this.node)
  }

  contains(...items: Array<AnyAskNode | ActNode | AskBuilder<any> | ActBuilder<any>>): this {
    for (const item of items) {
      if (item instanceof ActBuilder) {
        this.node.items.push(item.toNode())
      } else if (item instanceof AskBuilder) {
        this.node.items.push((item as AskBuilder<any>).toNode() as unknown as AnyAskNode)
      } else {
        this.node.items.push(item as unknown as AnyAskNode | ActNode)
      }
    }
    return this
  }

  toNode(): SurfaceNode {
    return this.node
  }
}
