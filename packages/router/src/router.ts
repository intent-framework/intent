import type { ScreenDefinition } from "@intent/core"

export type RouteDefinition = {
  name: string
  path: string
  screen: ScreenDefinition
}

export type RouteMatch =
  | {
      found: true
      name: string
      path: string
      params: Record<string, string>
      screen: ScreenDefinition
    }
  | {
      found: false
      pathname: string
    }

type InternalRoute = RouteDefinition & {
  pattern: RegExp
  paramNames: string[]
}

function normalizePath(path: string): string {
  let normalized = path
  if (!normalized.startsWith("/")) normalized = "/" + normalized
  if (normalized.length > 1 && normalized.endsWith("/")) normalized = normalized.slice(0, -1)
  return normalized
}

function compilePattern(path: string): { pattern: RegExp; paramNames: string[] } {
  const segments = path.split("/")
  const paramNames: string[] = []
  const regexParts: string[] = []

  for (const segment of segments) {
    if (segment.startsWith(":")) {
      paramNames.push(segment.slice(1))
      regexParts.push("([^/]+)")
    } else if (segment.length > 0) {
      regexParts.push(segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    }
  }

  const pattern = new RegExp(`^/${regexParts.join("/")}$`)
  return { pattern, paramNames }
}

export interface Router {
  route(name: string, path: string, screen: ScreenDefinition): Router
  match(pathname: string): RouteMatch
  path(name: string, params?: Record<string, string>): string
  routes(): RouteDefinition[]
}

export function createRouter(): Router {
  const routes: InternalRoute[] = []
  const byName = new Map<string, InternalRoute>()
  const byPath = new Map<string, true>()

  const api: Router = {
    route(name, path, screen) {
      if (byName.has(name)) {
        throw new Error(`Route name "${name}" is already registered.`)
      }
      const normalized = normalizePath(path)
      if (byPath.has(normalized)) {
        throw new Error(`Route path "${normalized}" is already registered.`)
      }
      const { pattern, paramNames } = compilePattern(normalized)
      const route: InternalRoute = { name, path: normalized, pattern, paramNames, screen }
      byName.set(name, route)
      byPath.set(normalized, true)
      routes.push(route)
      return api
    },

    match(pathname) {
      const normalized = normalizePath(pathname)

      for (const route of routes) {
        const match = normalized.match(route.pattern)
        if (match) {
          const params: Record<string, string> = {}
          for (let i = 0; i < route.paramNames.length; i++) {
            const value = match[i + 1]
            if (value !== undefined) {
              params[route.paramNames[i]!] = value
            }
          }
          return {
            found: true,
            name: route.name,
            path: route.path,
            params,
            screen: route.screen,
          }
        }
      }

      return { found: false, pathname: normalized }
    },

    path(name, params = {}) {
      const route = byName.get(name)
      if (!route) {
        throw new Error(`Route "${name}" not found`)
      }

      let result = route.path
      for (const [key, value] of Object.entries(params)) {
        result = result.replace(`:${key}`, value)
      }

      // Check for unresolved params
      const unresolved = result.match(/:(\w+)/g)
      if (unresolved) {
        throw new Error(
          `Missing params for route "${name}": ${unresolved.join(", ")}`
        )
      }

      return result
    },

    routes() {
      return routes.map((r) => ({
        name: r.name,
        path: r.path,
        screen: r.screen,
      }))
    },
  }

  return api
}
