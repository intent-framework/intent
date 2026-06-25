import type { ScreenDefinition, NavigationService, DefaultScreenServices } from "@intent/core"
import type { Router, RoutePathArgs } from "@intent/router"
import { renderDom } from "./index.js"

export type RouterDomHandle<Routes extends Record<string, { path: string }>> = {
  navigate<Name extends Extract<keyof Routes, string>>(
    name: Name,
    ...args: RoutePathArgs<Routes[Name]["path"]>
  ): void

  renderPath(pathname: string): void
  dispose(): void
}

export type RenderRouterOptions = {
  target: HTMLElement
  window?: Window
  notFound?: ScreenDefinition | ((pathname: string) => ScreenDefinition)
}

export function renderRouter<Routes extends Record<string, { path: string }>>(
  router: Router<Routes>,
  options: RenderRouterOptions,
): RouterDomHandle<Routes> {
  const win = options.window ?? window
  let currentCleanup: (() => void) | undefined

  function internalNavigate(name: string, params?: Record<string, string>) {
    const path = (router.path as (name: string, params?: Record<string, string>) => string)(name, params)
    win.history.pushState(null, "", path)
    renderPath(path)
  }

  function renderPath(pathname: string) {
    currentCleanup?.()
    currentCleanup = undefined
    options.target.innerHTML = ""

    const match = router.match(pathname)

    const navigateService: NavigationService = internalNavigate

    if (match.found) {
      currentCleanup = renderDom<DefaultScreenServices>(match.screen as ScreenDefinition<DefaultScreenServices>, {
        target: options.target,
        services: { navigate: navigateService },
      })
      return
    }

    if (options.notFound) {
      const screen = typeof options.notFound === "function"
        ? options.notFound(pathname)
        : options.notFound
      currentCleanup = renderDom<DefaultScreenServices>(screen as ScreenDefinition<DefaultScreenServices>, {
        target: options.target,
        services: { navigate: navigateService },
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
    navigate<Name extends Extract<keyof Routes, string>>(
      name: Name,
      ...args: RoutePathArgs<Routes[Name]["path"]>
    ) {
      internalNavigate(name, args[0] as Record<string, string> | undefined)
    },
    renderPath,
    dispose() {
      currentCleanup?.()
      currentCleanup = undefined
      win.removeEventListener("popstate", onPopState)
    },
  }
}
