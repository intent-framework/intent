import type { ScreenDefinition } from "./screen.js"
import { inspectScreen, type InspectedScreen } from "./graph.js"
import type { AnyResourceNode } from "./resource.js"
import { createResourceNode } from "./resource.js"
import { kResourceMap } from "./act.js"
import type { ActionExecutionContext, DefaultScreenServices, ActNode } from "./act.js"

export class ScreenRuntime<TServices extends object = DefaultScreenServices> {
  private _screen: ScreenDefinition<TServices>
  private _started = false
  private _disposed = false
  private _unsubscribers: Array<() => void> = []
  private _services: TServices
  private _resourceNodes: AnyResourceNode[] = []
  private _resourceNodeMap: Map<string, AnyResourceNode> | null = null
  private autoloadedResources = new Set<string>()

  constructor(screen: ScreenDefinition<TServices>, services: TServices = {} as TServices) {
    this._screen = screen
    this._services = services
  }

  get screen(): ScreenDefinition<TServices> {
    return this._screen
  }

  get graph(): InspectedScreen {
    return inspectScreen(this._screen, this._resourceNodes)
  }

  get resources(): AnyResourceNode[] {
    return this._resourceNodes
  }

  get services(): TServices {
    return this._services
  }

  getExecutionContext(): ActionExecutionContext<TServices> {
    return this._services as ActionExecutionContext<TServices>
  }

  executeAct(act: ActNode<TServices>, context?: ActionExecutionContext<TServices>): Promise<void> {
    const ctx = context ?? this.getExecutionContext()
    if (this._resourceNodeMap) {
      return act.execute({ ...ctx, [kResourceMap]: this._resourceNodeMap } as ActionExecutionContext<TServices>)
    }
    return act.execute(ctx)
  }

  async start(): Promise<void> {
    if (this._started) return
    this._started = true

    const nodeMap = new Map<string, AnyResourceNode>()
    for (const config of this._screen.resourceConfigs) {
      const node = createResourceNode(config.id, config.name, config.loader, false, config.cache)
      this._resourceNodes.push(node)
      nodeMap.set(config.id, node)
    }
    this._resourceNodeMap = nodeMap

    // Connect ResourceRefs to runtime-scoped nodes
    for (const config of this._screen.resourceConfigs) {
      const node = nodeMap.get(config.id)
      if (node && config.ref) {
        config.ref._connect(node)
      }
    }

    const pureServices = this._services as ActionExecutionContext<TServices>

    const toLoad = this._resourceNodes.filter(r => {
      const config = this._screen.resourceConfigs.find(c => c.id === r.id)
      return (config?.autoLoad ?? false) && !this.autoloadedResources.has(r.id)
    })

    for (const r of toLoad) {
      this.autoloadedResources.add(r.id)
    }

    if (toLoad.length > 0) {
      await Promise.all(toLoad.map(r => r.load(pureServices)))
    }
  }

  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    for (const unsub of this._unsubscribers) {
      unsub()
    }
    this._unsubscribers = []
    for (const node of this._resourceNodes) {
      node.dispose()
    }
    for (const config of this._screen.resourceConfigs) {
      if (config.ref && this._resourceNodeMap) {
        const node = this._resourceNodeMap.get(config.id)
        if (node) {
          config.ref._disconnect(node)
        }
      }
    }
  }

  /** @internal */
  _addUnsubscriber(fn: () => void): void {
    this._unsubscribers.push(fn)
  }
}

export function createScreenRuntime<TServices extends object = DefaultScreenServices>(
  screen: ScreenDefinition<TServices>,
  options?: { services?: TServices },
): ScreenRuntime<TServices> {
  return new ScreenRuntime<TServices>(screen, options?.services)
}
