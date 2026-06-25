import type { ScreenDefinition } from "@intent/core"
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

  function renderPath(pathname: string) {
    currentCleanup?.()
    currentCleanup = undefined
    options.target.innerHTML = ""

    const match = router.match(pathname)

    if (match.found) {
      currentCleanup = renderDom(match.screen, { target: options.target })
      return
    }

    if (options.notFound) {
      const screen = typeof options.notFound === "function"
        ? options.notFound(pathname)
        : options.notFound
      currentCleanup = renderDom(screen, { target: options.target })
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
      const path = router.path(name, ...args)
      win.history.pushState(null, "", path)
      renderPath(path)
    },
    renderPath,
    dispose() {
      currentCleanup?.()
      currentCleanup = undefined
      win.removeEventListener("popstate", onPopState)
    },
  }
}
