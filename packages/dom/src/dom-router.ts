import type { ScreenDefinition, DefaultScreenServices } from "@intent/core"
import type { Router, RoutePathArgs, RouterNavigate } from "@intent/router"
import { renderDom } from "./index.js"

export type RouterDomHandle<Routes extends Record<string, { path: string }>> = {
  navigate<Name extends Extract<keyof Routes, string>>(
    name: Name,
    ...args: RoutePathArgs<Routes[Name]["path"]>
  ): void

  renderPath(pathname: string): void
  dispose(): void
}

export type RenderRouterOptions<TServices extends object = DefaultScreenServices> = {
  target: HTMLElement
  window?: Window
  notFound?: ScreenDefinition<TServices> | ((pathname: string) => ScreenDefinition<TServices>)
  services?: Omit<TServices, "navigate">
}

export function renderRouter<
  Routes extends Record<string, { path: string }>,
  TServices extends object = DefaultScreenServices
>(
  router: Router<Routes, TServices>,
  options: RenderRouterOptions<TServices>,
): RouterDomHandle<Routes> {
  const win = options.window ?? window
  let currentCleanup: (() => void) | undefined

  const navigate: RouterNavigate<Routes> = (name, ...args) => {
    const routerPath = router.path as (name: string, params?: Record<string, string>) => string
    const path = routerPath(name, args[0])
    win.history.pushState(null, "", path)
    renderPath(path)
  }

  function renderPath(pathname: string) {
    currentCleanup?.()
    currentCleanup = undefined
    options.target.innerHTML = ""

    const match = router.match(pathname)

    const mergedServices = {
      ...options.services,
      navigate,
    } as TServices

    if (match.found) {
      currentCleanup = renderDom<TServices>(match.screen as ScreenDefinition<TServices>, {
        target: options.target,
        services: mergedServices,
      })
      return
    }

    if (options.notFound) {
      const screen = typeof options.notFound === "function"
        ? options.notFound(pathname)
        : options.notFound
      currentCleanup = renderDom<TServices>(screen as ScreenDefinition<TServices>, {
        target: options.target,
        services: mergedServices,
      })
    } else {
      options.target.textContent = "Not found"
    }
  }

  renderPath(win.location.pathname)

  function onPopState() {
    renderPath(win.location.pathname)
  }
  win.addEventListener("popstate", onPopState)

  return {
    navigate,
    renderPath,
    dispose() {
      currentCleanup?.()
      currentCleanup = undefined
      win.removeEventListener("popstate", onPopState)
    },
  }
}
