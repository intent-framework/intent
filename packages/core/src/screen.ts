import type { AnyAskNode } from "./ask.js"
import type { ActNode, DefaultScreenServices } from "./act.js"
import type { FlowNode } from "./flow.js"
import type { SurfaceNode } from "./surface.js"
import type { ResourceCacheOptions, ResourceConfig, ResourceLoadContext } from "./resource.js"
import { ResourceRef } from "./resource.js"
import { createTextState, createBooleanState, createChoiceState, type TextState, type BooleanState, type ChoiceState } from "./state.js"
import { AskBuilder } from "./ask.js"
import { ActBuilder } from "./act.js"
import { FlowBuilder } from "./flow.js"
import { SurfaceBuilder } from "./surface.js"
import { resetAskRegistry, resetActRegistry, resetFlowRegistry, resetSurfaceRegistry, resetResourceRegistry, getAsks, getActs, getFlows, getSurfaces, nextSuffix } from "./registry.js"

export type ScreenBuilder<TServices extends object = DefaultScreenServices> = {
  state: {
    text: (name: string, opts?: { initial?: string }) => TextState
    boolean: (name: string, opts?: { initial?: boolean }) => BooleanState
    choice: <T extends string>(name: string, opts: { initial: T; options: readonly T[] }) => ChoiceState<T>
  }
  ask: <T>(label: string, state: { value: T }) => AskBuilder<T>
  act: (label: string) => ActBuilder<TServices>
  flow: (name: string) => FlowBuilder
  surface: (name: string) => SurfaceBuilder
  resource: <T>(
    name: string,
    config: {
      load: (() => Promise<T>) | ((context: ResourceLoadContext<TServices>) => Promise<T>)
      autoLoad?: boolean
      cache?: ResourceCacheOptions
    },
  ) => ResourceRef<T, TServices>
}

export type ScreenDefinition<TServices extends object = DefaultScreenServices> = {
  name: string
  asks: AnyAskNode[]
  acts: ActNode<TServices>[]
  flows: FlowNode[]
  surfaces: SurfaceNode[]
  resourceConfigs: ResourceConfig[]
}

export function screen<TServices extends object = DefaultScreenServices>(
  name: string,
  fn: ($: ScreenBuilder<TServices>) => void
): ScreenDefinition<TServices> {
  resetAskRegistry()
  resetActRegistry()
  resetFlowRegistry()
  resetSurfaceRegistry()
  resetResourceRegistry()

  const configs: ResourceConfig<any, any>[] = []

  const builder: ScreenBuilder<TServices> = {
    state: {
      text: (n, opts) => createTextState(n, opts?.initial),
      boolean: (n, opts) => createBooleanState(n, opts?.initial),
      choice: (n, opts) => createChoiceState(n, opts),
    },
    ask: (label, state) => new AskBuilder(label, state),
    act: (label) => new ActBuilder<TServices>(label),
    flow: (n) => new FlowBuilder(n),
    surface: (n) => new SurfaceBuilder(n),
    resource: <T>(n: string, config: { load: (() => Promise<T>) | ((context: ResourceLoadContext<TServices>) => Promise<T>); autoLoad?: boolean; cache?: ResourceCacheOptions }) => {
      const baseId = `resource_${n}`
      const id = configs.some(c => c.id === baseId)
        ? nextSuffix(baseId, (id) => configs.some(c => c.id === id))
        : baseId
      const ref = new ResourceRef<T, TServices>(id, n, config.load, config.autoLoad ?? true)
      configs.push({ id, name: n, autoLoad: config.autoLoad ?? true, loader: config.load, cache: config.cache, ref })
      return ref
    },
  }

  fn(builder)

  const asks = getAsks()
  const acts = getActs()
  const flows = getFlows()
  const surfaces = getSurfaces()

  return {
    name,
    asks: Array.from(asks.values()),
    acts: Array.from(acts.values()) as ActNode<TServices>[],
    flows: Array.from(flows.values()),
    surfaces: Array.from(surfaces.values()),
    resourceConfigs: configs,
  }
}
