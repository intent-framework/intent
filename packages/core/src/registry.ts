import type { AnyAskNode } from "./ask.js"
import type { ActNode } from "./act.js"
import type { FlowNode } from "./flow.js"
import type { SurfaceNode } from "./surface.js"

const askMap = new Map<string, AnyAskNode>()
const actMap = new Map<string, ActNode>()
const flowMap = new Map<string, FlowNode>()
const surfaceMap = new Map<string, SurfaceNode>()

export function registerAskNode(node: AnyAskNode): void {
  askMap.set(node.id, node)
}

export function unregisterAskNode(id: string): void {
  askMap.delete(id)
}

export function registerActNode(node: ActNode): void {
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

export function getAsks(): Map<string, AnyAskNode> {
  return askMap
}

export function getActs(): Map<string, ActNode> {
  return actMap
}

export function getFlows(): Map<string, FlowNode> {
  return flowMap
}

export function getSurfaces(): Map<string, SurfaceNode> {
  return surfaceMap
}
