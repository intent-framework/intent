import type { ScreenDefinition, DefaultScreenServices } from "@intent/core"

export type RouteDefinition<TServices extends object = DefaultScreenServices> = {
  name: string
  path: string
  screen: ScreenDefinition<TServices>
}

export type RouteParamNames<Path extends string> =
  string extends Path
    ? string
    : Path extends `${string}/:${infer Param}/${infer Rest}`
      ? Param | RouteParamNames<`/${Rest}`>
      : Path extends `${string}/:${infer Param}`
        ? Param
        : never

export type RouteParams<Path extends string> =
  [RouteParamNames<Path>] extends [never]
    ? {}
    : { [Key in RouteParamNames<Path>]: string }

export type RoutePathArgs<Path extends string> =
  [RouteParamNames<Path>] extends [never]
    ? []
    : [params: RouteParams<Path>]

export type RouteMatch<
  Routes extends Record<string, { path: string }> = Record<string, { path: string }>,
  TServices extends object = DefaultScreenServices
> =
  | {
      found: true
      name: keyof Routes
      path: string
      params: Record<string, string>
      screen: ScreenDefinition<TServices>
    }
  | {
      found: false
      pathname: string
    }

type InternalRoute<TServices extends object = DefaultScreenServices> = RouteDefinition<TServices> & {
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

export type Router<
  Routes extends Record<string, { path: string }> = {},
  TServices extends object = DefaultScreenServices
> = {
  route<Name extends string, Path extends string>(
    name: Name,
    path: Path,
    screen: ScreenDefinition<TServices>,
  ): Router<Routes & Record<Name, { path: Path }>, TServices>

  match(pathname: string): RouteMatch<Routes, TServices>

  path<Name extends Extract<keyof Routes, string>>(
    name: Name,
    ...args: RoutePathArgs<Routes[Name]["path"]>
  ): string

  routes(): RouteDefinition<TServices>[]
}

export function createRouter<TServices extends object = DefaultScreenServices>(): Router<{}, TServices> {
  const build = <Routes extends Record<string, { path: string }>>(
    currentRoutes: InternalRoute<TServices>[],
    currentByName: Map<string, InternalRoute<TServices>>,
    currentByPath: Map<string, true>,
  ): Router<Routes, TServices> => {
    const router: Router<Routes, TServices> = {
      route<Name extends string, Path extends string>(
        name: Name,
        path: Path,
        screen: ScreenDefinition<TServices>,
      ) {
        if (currentByName.has(name)) {
          throw new Error(`Route name "${name}" is already registered.`)
        }
        const normalized = normalizePath(path)
        if (currentByPath.has(normalized)) {
          throw new Error(`Route path "${normalized}" is already registered.`)
        }
        const { pattern, paramNames } = compilePattern(normalized)
        const route: InternalRoute<TServices> = { name, path: normalized, pattern, paramNames, screen }
        const newByName = new Map(currentByName).set(name, route)
        const newByPath = new Map(currentByPath).set(normalized, true)
        const newRoutes = [...currentRoutes, route]
        return build<Routes & Record<Name, { path: Path }>>(newRoutes, newByName, newByPath)
      },

      match(pathname: string) {
        const normalized = normalizePath(pathname)
        for (const route of currentRoutes) {
          const m = normalized.match(route.pattern)
          if (m) {
            const params: Record<string, string> = {}
            for (let i = 0; i < route.paramNames.length; i++) {
              const value = m[i + 1]
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
            } as any
          }
        }
        return { found: false, pathname: normalized }
      },

      path(name: string, params: Record<string, string> = {}) {
        const route = currentByName.get(name)
        if (!route) {
          throw new Error(`Route "${name}" not found`)
        }

        let result = route.path
        for (const [key, value] of Object.entries(params)) {
          result = result.replace(`:${key}`, value)
        }

        const unresolved = result.match(/:(\w+)/g)
        if (unresolved) {
          throw new Error(
            `Missing params for route "${name}": ${unresolved.join(", ")}`,
          )
        }

        return result
      },

      routes() {
        return currentRoutes.map((r) => ({
          name: r.name,
          path: r.path,
          screen: r.screen,
        }))
      },
    }

    return router
  }

  return build<{}>([], new Map(), new Map())
}
