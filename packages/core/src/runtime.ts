import type { ScreenDefinition } from "./screen.js"
import { inspectScreen, type InspectedScreen } from "./graph.js"
import type { AnyResourceNode } from "./resource.js"
import type { ActionExecutionContext, NavigationService } from "./act.js"

export type ScreenRuntimeServices = {
  navigate?: NavigationService
}

export class ScreenRuntime {
  private _screen: ScreenDefinition
  private _started = false
  private _disposed = false
  private _unsubscribers: Array<() => void> = []
  private _services: ScreenRuntimeServices

  constructor(screen: ScreenDefinition, services: ScreenRuntimeServices = {}) {
    this._screen = screen
    this._services = services
  }

  get screen(): ScreenDefinition {
    return this._screen
  }

  get graph(): InspectedScreen {
    return inspectScreen(this._screen)
  }

  get resources(): AnyResourceNode[] {
    return [...this._screen.resources]
  }

  get services(): ScreenRuntimeServices {
    return this._services
  }

  getExecutionContext(): ActionExecutionContext {
    return {
      navigate: this._services.navigate,
    }
  }

  async start(): Promise<void> {
    if (this._started) return
    this._started = true

    const toLoad = this._screen.resources.filter(
      r => r.autoLoad && r.status === "idle",
    )
    if (toLoad.length > 0) {
      await Promise.all(toLoad.map(r => r.load()))
    }
  }

  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    for (const unsub of this._unsubscribers) {
      unsub()
    }
    this._unsubscribers = []
  }

  /** @internal */
  _addUnsubscriber(fn: () => void): void {
    this._unsubscribers.push(fn)
  }
}

export function createScreenRuntime(
  screen: ScreenDefinition,
  options?: { services?: ScreenRuntimeServices },
): ScreenRuntime {
  return new ScreenRuntime(screen, options?.services)
}
