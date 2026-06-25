import type { AnyAskNode } from "./ask.js"
import type { ActNode, DefaultScreenServices } from "./act.js"
import type { FlowNode } from "./flow.js"
import type { SurfaceNode } from "./surface.js"
import type { AnyResourceNode } from "./resource.js"

const askMap = new Map<string, AnyAskNode>()
const actMap = new Map<string, ActNode<any>>()
const flowMap = new Map<string, FlowNode>()
const surfaceMap = new Map<string, SurfaceNode>()
const resourceMap = new Map<string, AnyResourceNode>()

export function registerAskNode(node: AnyAskNode): void {
  askMap.set(node.id, node)
}

export function unregisterAskNode(id: string): void {
  askMap.delete(id)
}

export function registerActNode<TServices extends object = DefaultScreenServices>(node: ActNode<TServices>): void {
  actMap.set(node.id, node)
}

export function unregisterActNode(id: string): void {
  actMap.delete(id)
}

export function registerFlowNode(node: FlowNode): void {
  flowMap.set(node.id, node)
}

export function unregisterFlowNode(id: string): void {
  flowMap.delete(id)
}

export function registerSurfaceNode(node: SurfaceNode): void {
  surfaceMap.set(node.id, node)
}

export function unregisterSurfaceNode(id: string): void {
  surfaceMap.delete(id)
}

export function registerResourceNode(node: AnyResourceNode): void {
  resourceMap.set(node.id, node)
}

export function unregisterResourceNode(id: string): void {
  resourceMap.delete(id)
}

export function resetAskRegistry(): void {
  askMap.clear()
}

export function resetActRegistry(): void {
  actMap.clear()
}

export function resetFlowRegistry(): void {
  flowMap.clear()
}

export function resetSurfaceRegistry(): void {
  surfaceMap.clear()
}

export function resetResourceRegistry(): void {
  resourceMap.clear()
}

export function getAsks(): Map<string, AnyAskNode> {
  return askMap
}

export function getActs(): Map<string, ActNode<any>> {
  return actMap
}

export function getFlows(): Map<string, FlowNode> {
  return flowMap
}

export function getSurfaces(): Map<string, SurfaceNode> {
  return surfaceMap
}

export function getResources(): Map<string, AnyResourceNode> {
  return resourceMap
}
