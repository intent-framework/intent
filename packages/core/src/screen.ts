import type { AnyAskNode } from "./ask.js"
import type { ActNode } from "./act.js"
import type { FlowNode } from "./flow.js"
import type { SurfaceNode } from "./surface.js"
import type { ResourceNode, AnyResourceNode } from "./resource.js"
import { createTextState, createBooleanState, createChoiceState, type TextState, type BooleanState, type ChoiceState } from "./state.js"
import { AskBuilder } from "./ask.js"
import { ActBuilder } from "./act.js"
import { FlowBuilder } from "./flow.js"
import { SurfaceBuilder } from "./surface.js"
import { createResourceNode } from "./resource.js"
import { resetAskRegistry, resetActRegistry, resetFlowRegistry, resetSurfaceRegistry, resetResourceRegistry, getAsks, getActs, getFlows, getSurfaces, getResources, registerResourceNode } from "./registry.js"

export type ScreenBuilder = {
  state: {
    text: (name: string, opts?: { initial?: string }) => TextState
    boolean: (name: string, opts?: { initial?: boolean }) => BooleanState
    choice: <T extends string>(name: string, opts: { initial: T; options: readonly T[] }) => ChoiceState<T>
  }
  ask: <T>(label: string, state: { value: T }) => AskBuilder<T>
  act: (label: string) => ActBuilder
  flow: (name: string) => FlowBuilder
  surface: (name: string) => SurfaceBuilder
  resource: <T>(name: string, config: { load: () => Promise<T>; autoLoad?: boolean }) => ResourceNode<T>
}

export type ScreenDefinition = {
  name: string
  asks: AnyAskNode[]
  acts: ActNode[]
  flows: FlowNode[]
  surfaces: SurfaceNode[]
  resources: AnyResourceNode[]
}

export function screen(name: string, fn: ($: ScreenBuilder) => void): ScreenDefinition {
  resetAskRegistry()
  resetActRegistry()
  resetFlowRegistry()
  resetSurfaceRegistry()
  resetResourceRegistry()

  const builder: ScreenBuilder = {
    state: {
      text: (n, opts) => createTextState(n, opts?.initial),
      boolean: (n, opts) => createBooleanState(n, opts?.initial),
      choice: (n, opts) => createChoiceState(n, opts),
    },
    ask: (label, state) => new AskBuilder(label, state),
    act: (label) => new ActBuilder(label),
    flow: (n) => new FlowBuilder(n),
    surface: (n) => new SurfaceBuilder(n),
    resource: <T>(n: string, config: { load: () => Promise<T>; autoLoad?: boolean }) => {
      const id = `resource_${n}`
      const node = createResourceNode<T>(id, n, config.load, config.autoLoad)
      registerResourceNode(node as AnyResourceNode)
      return node
    },
  }

  fn(builder)

  const asks = getAsks()
  const acts = getActs()
  const flows = getFlows()
  const surfaces = getSurfaces()
  const resources = getResources()

  return {
    name,
    asks: Array.from(asks.values()),
    acts: Array.from(acts.values()),
    flows: Array.from(flows.values()),
    surfaces: Array.from(surfaces.values()),
    resources: Array.from(resources.values()),
  }
}
