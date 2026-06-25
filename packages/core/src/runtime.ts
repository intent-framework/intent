import type { ScreenDefinition } from "./screen.js"
import { inspectScreen, type InspectedScreen } from "./graph.js"
import type { AnyResourceNode } from "./resource.js"
import type { ActionExecutionContext, DefaultScreenServices } from "./act.js"

export class ScreenRuntime<TServices extends object = DefaultScreenServices> {
  private _screen: ScreenDefinition<TServices>
  private _started = false
  private _disposed = false
  private _unsubscribers: Array<() => void> = []
  private _services: TServices

  constructor(screen: ScreenDefinition<TServices>, services: TServices = {} as TServices) {
    this._screen = screen
    this._services = services
  }

  get screen(): ScreenDefinition<TServices> {
    return this._screen
  }

  get graph(): InspectedScreen {
    return inspectScreen(this._screen)
  }

  get resources(): AnyResourceNode[] {
    return [...this._screen.resources]
  }

  get services(): TServices {
    return this._services
  }

  getExecutionContext(): ActionExecutionContext<TServices> {
    return this._services as ActionExecutionContext<TServices>
  }

  async start(): Promise<void> {
    if (this._started) return
    this._started = true

    const toLoad = this._screen.resources.filter(
      r => r.autoLoad && r.status === "idle",
    )
    if (toLoad.length > 0) {
      const ctx = this.getExecutionContext()
      await Promise.all(toLoad.map(r => r.load(ctx)))
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

export function createScreenRuntime<TServices extends object = DefaultScreenServices>(
  screen: ScreenDefinition<TServices>,
  options?: { services?: TServices },
): ScreenRuntime<TServices> {
  return new ScreenRuntime<TServices>(screen, options?.services)
}
