import { describe, it, expect, vi } from "vitest"
import { screen } from "@intent-framework/core"
import { createRouter } from "./router.js"
import type { RouteParams, RoutesFromPaths, RouterNavigate, RouterServices, RouteParamsFor, RouteContextFor, RouteContext } from "./router.js"

const HomeScreen = screen("Home", () => {})
const LoginScreen = screen("Login", () => {})
const InviteMemberScreen = screen("InviteMember", () => {})

describe("createRouter", () => {
  it("creates a router", () => {
    const router = createRouter()
    expect(router).toBeDefined()
    expect(router.routes()).toEqual([])
  })

  it("registers a route and returns the router for chaining", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    expect(router.routes()).toHaveLength(1)
    expect(router.routes()[0]!.name).toBe("home")
  })

  it("allows chaining route registrations", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)
    expect(router.routes()).toHaveLength(2)
  })
})

describe("route matching", () => {
  it("matches a static root route", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    const match = router.match("/")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.name).toBe("home")
      expect(match.screen).toBe(HomeScreen)
      expect(match.params).toEqual({})
    }
  })

  it("matches a static route", () => {
    const router = createRouter().route("login", "/login", LoginScreen)
    const match = router.match("/login")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.name).toBe("login")
      expect(match.screen).toBe(LoginScreen)
      expect(match.params).toEqual({})
    }
  })

  it("does not match a nonexistent route", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    const match = router.match("/nonexistent")
    expect(match.found).toBe(false)
    if (!match.found) {
      expect(match.pathname).toBe("/nonexistent")
    }
  })

  it("matches a route with one dynamic param", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen)
    const match = router.match("/users/abc123")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.name).toBe("user")
      expect(match.params).toEqual({ userId: "abc123" })
      expect(match.screen).toBe(HomeScreen)
    }
  })

  it("matches a route with multiple dynamic params", () => {
    const router = createRouter().route("invite", "/teams/:teamId/invite", InviteMemberScreen)
    const match = router.match("/teams/team_1/invite")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.name).toBe("invite")
      expect(match.params).toEqual({ teamId: "team_1" })
      expect(match.screen).toBe(InviteMemberScreen)
    }
  })

  it("extracts multiple params correctly", () => {
    const router = createRouter().route("org", "/orgs/:orgId/repos/:repoId", HomeScreen)
    const match = router.match("/orgs/acme/repos/foo")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.params).toEqual({ orgId: "acme", repoId: "foo" })
    }
  })

  it("does not match a dynamic route with wrong segment count", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen)
    expect(router.match("/users").found).toBe(false)
    expect(router.match("/users/a/b").found).toBe(false)
  })

  it("prefers the first matching route", () => {
    const router = createRouter()
      .route("a", "/:slug", HomeScreen)
      .route("b", "/login", LoginScreen)
    const match = router.match("/login")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.name).toBe("a")
      expect(match.params).toEqual({ slug: "login" })
    }
  })

  it("handles routes registered after earlier match calls", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)
    expect(router.match("/").found).toBe(true)
    expect(router.match("/login").found).toBe(true)
  })
})

describe("trailing slash behavior", () => {
  it("matches with trailing slash the same as without", () => {
    const router = createRouter().route("login", "/login", LoginScreen)
    const withSlash = router.match("/login/")
    expect(withSlash.found).toBe(true)
    if (withSlash.found) {
      expect(withSlash.name).toBe("login")
    }
  })

  it("normalizes trailing slash in route path", () => {
    const router = createRouter().route("login", "/login/", LoginScreen)
    expect(router.match("/login").found).toBe(true)
  })

  it("does not strip trailing slash for root path", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    const match = router.match("/")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.path).toBe("/")
    }
  })
})

describe("path building", () => {
  it("builds a static path", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    expect(router.path("home")).toBe("/")
  })

  it("builds a static path with a leading slash", () => {
    const router = createRouter().route("login", "/login", LoginScreen)
    expect(router.path("login")).toBe("/login")
  })

  it("builds a dynamic path with params", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen)
    expect(router.path("user", { userId: "abc123" })).toBe("/users/abc123")
  })

  it("builds a path with multiple params", () => {
    const router = createRouter().route("invite", "/teams/:teamId/invite", InviteMemberScreen)
    expect(router.path("invite", { teamId: "team_1" })).toBe("/teams/team_1/invite")
  })

  it("builds a path with multiple different params", () => {
    const router = createRouter().route("org", "/orgs/:orgId/repos/:repoId", HomeScreen)
    expect(router.path("org", { orgId: "acme", repoId: "foo" })).toBe("/orgs/acme/repos/foo")
  })

  it("throws for an unknown route name", () => {
    const router = createRouter() as any
    expect(() => router.path("nonexistent")).toThrow('Route "nonexistent" not found')
  })

  it("throws when a required param is missing", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen) as any
    expect(() => router.path("user", {})).toThrow('Missing params for route "user": :userId')
  })

  it("throws when some required params are missing", () => {
    const router = createRouter().route("org", "/orgs/:orgId/repos/:repoId", HomeScreen) as any
    expect(() => router.path("org", { orgId: "acme" })).toThrow(
      'Missing params for route "org": :repoId'
    )
  })

  it("ignores extra params not in the path pattern", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen) as any
    const result = router.path("user", { userId: "abc", extra: "ignored" })
    expect(result).toBe("/users/abc")
  })
})

describe("route listing", () => {
  it("lists all registered routes", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const routes = router.routes()
    expect(routes).toHaveLength(2)
    expect(routes[0]).toEqual({ name: "home", path: "/", screen: HomeScreen })
    expect(routes[1]).toEqual({ name: "login", path: "/login", screen: LoginScreen })
  })

  it("returns a new array each time", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    const first = router.routes()
    const router2 = router.route("login", "/login", LoginScreen)
    const second = router2.routes()
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(2)
  })

  it("route objects are not mutable through the listing", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    const routes = router.routes()
    routes[0]!.name = "hacked"
    routes[0]!.path = "/hacked"
    expect(router.routes()[0]!.name).toBe("home")
    expect(router.routes()[0]!.path).toBe("/")
  })
})

describe("route name uniqueness", () => {
  it("throws when registering the same route name twice", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    expect(() => router.route("home", "/home", LoginScreen)).toThrow(
      'Route name "home" is already registered.'
    )
  })

  it("throws when registering the same route path twice", () => {
    const router = createRouter().route("home", "/home", HomeScreen)
    expect(() => router.route("alt", "/home", LoginScreen)).toThrow(
      'Route path "/home" is already registered.'
    )
  })

  it("path() resolves a unique route name deterministically", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)
    expect(router.path("home")).toBe("/")
    expect(router.path("login")).toBe("/login")
  })

  it("route listing cannot mutate router internals", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)
    const list = router.routes()
    // Mutating the returned array
    list.length = 0
    list.push({ name: "injected", path: "/evil", screen: HomeScreen })
    expect(router.routes()).toHaveLength(2)
    expect(router.routes()[0]!.name).toBe("home")
    expect(router.routes()[1]!.name).toBe("login")
  })

  it("route listing returns routes in registration order", () => {
    const router = createRouter()
      .route("login", "/login", LoginScreen)
      .route("home", "/", HomeScreen)
    const routes = router.routes()
    expect(routes[0]!.name).toBe("login")
    expect(routes[1]!.name).toBe("home")
  })
})

describe("edge cases", () => {
  it("matches route with path that has a dot", () => {
    const router = createRouter().route("page", "/page/:name", HomeScreen)
    const match = router.match("/page/index.html")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.params).toEqual({ name: "index.html" })
    }
  })

  it("matches route with dashes and underscores in params", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen)
    const match = router.match("/users/user_name-123")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.params).toEqual({ userId: "user_name-123" })
    }
  })

  it("ensures a leading slash is added if missing", () => {
    const router = createRouter().route("home", "home", HomeScreen)
    expect(router.match("/home").found).toBe(true)
    expect(router.path("home")).toBe("/home")
  })
})

describe("type-safe path params", () => {
  it("RouteParams produces {} for static routes", () => {
    const r: RouteParams<"/"> = {}
    expect(r).toEqual({})
  })

  it("RouteParams extracts single param", () => {
    const r: RouteParams<"/users/:userId"> = { userId: "abc" }
    expect(r.userId).toBe("abc")
  })

  it("RouteParams extracts multiple params", () => {
    const r: RouteParams<"/teams/:teamId/members/:memberId"> = { teamId: "a", memberId: "b" }
    expect(r.teamId).toBe("a")
    expect(r.memberId).toBe("b")
  })

  it("static route accepts no params", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)

    router.path("home")

    // @ts-expect-error - static route rejects params
    router.path("home", {} as any)
  })

  it("dynamic route requires params", () => {
    const router = createRouter()
      .route("user", "/users/:userId", HomeScreen)

    router.path("user", { userId: "abc" })

    // @ts-expect-error - dynamic route requires params (runtime throws)
    expect(() => router.path("user")).toThrow()
  })

  it("missing params fail typechecking", () => {
    const router = createRouter()
      .route("org", "/orgs/:orgId/repos/:repoId", HomeScreen)

    router.path("org", { orgId: "a", repoId: "b" })

    // @ts-expect-error - missing repoId (runtime throws)
    expect(() => router.path("org", { orgId: "a" })).toThrow()
  })

  it("wrong params fail typechecking", () => {
    const router = createRouter()
      .route("user", "/users/:userId", HomeScreen)

    // @ts-expect-error - wrong param name (runtime throws)
    expect(() => router.path("user", { wrong: "x" })).toThrow()
  })

  it("extra params fail typechecking", () => {
    const router = createRouter()
      .route("user", "/users/:userId", HomeScreen)

    // @ts-expect-error - extra param (typecheck catches, runtime silently ignores)
    router.path("user", { userId: "abc", extra: "x" })
  })

  it("valid route names only", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("team.invite", "/teams/:teamId/invite", InviteMemberScreen)

    router.path("home")
    router.path("team.invite", { teamId: "t1" })

    // @ts-expect-error - unknown route name (runtime throws)
    expect(() => router.path("nonexistent")).toThrow()
  })

  it("match returns typed route name union", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const match = router.match("/")
    if (match.found) {
      const name: "home" | "login" = match.name
      expect(name).toBe("home")
    }
  })
})

describe("generic services", () => {
  it("createRouter<AppServices>() accepts ScreenDefinition<AppServices>", () => {
    type AppServices = {
      analytics: { track(event: "home_clicked"): void }
    }

    const Screen = screen<AppServices>("Screen", $ => {
      $.act("Track")
        .does(({ analytics }) => {
          analytics.track("home_clicked")
          // @ts-expect-error wrong event
          analytics.track("wrong")
        })
      $.surface("main").contains()
    })

    const router = createRouter<AppServices>()
      .route("screen", "/", Screen)

    expect(router.routes()).toHaveLength(1)
    if (router.routes()[0]) {
      expect(router.routes()[0]!.name).toBe("screen")
    }
  })

  it("rejects a screen with incompatible required services", () => {
    type ServicesA = {
      analytics: { track(event: "a"): void }
    }

    type ServicesB = {
      flags: { enabled(name: string): boolean }
    }

    const ScreenA = screen<ServicesA>("A", $ => {
      $.surface("main")
    })

    // @ts-expect-error screen services do not match router services
    createRouter<ServicesB>().route("a", "/", ScreenA)
  })

  it("router.match() returns a screen typed with AppServices", () => {
    type AppServices = {
      analytics: { track(event: string): void }
    }

    const Screen = screen<AppServices>("Screen", $ => {
      $.act("Go").does(({ analytics }) => {
        analytics.track("test")
      })
      $.surface("main").contains()
    })

    const router = createRouter<AppServices>()
      .route("screen", "/", Screen)

    const match = router.match("/")
    expect(match.found).toBe(true)
    if (match.found) {
      expect(match.screen.acts[0]).toBeDefined()
    }
  })

  it("existing typed path tests still work", () => {
    const router = createRouter()
      .route("home", "/", screen("Home", () => {}))
      .route("user", "/users/:userId", screen("User", () => {}))

    expect(router.path("home")).toBe("/")
    expect(router.path("user", { userId: "abc" })).toBe("/users/abc")
  })

  it("default-service usage still works without generics", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const match = router.match("/home")
    expect(match.found).toBe(false)

    expect(router.match("/").found).toBe(true)
  })
})

describe("typed navigation service", () => {
  const appPaths = {
    home: "/",
    login: "/login",
    "team.invite": "/teams/:teamId/invite",
  } as const

  type AppRoutes = RoutesFromPaths<typeof appPaths>

  it("RoutesFromPaths produces expected route map shape", () => {
    const r: AppRoutes = {} as AppRoutes
    expect(r).toBeDefined()
  })

  it("RouterNavigate<AppRoutes> accepts static route with no params", () => {
    const n = vi.fn() as RouterNavigate<AppRoutes>
    n("home")
    n("login")
    expect(n).toHaveBeenCalledTimes(2)
  })

  it("static route rejects params", () => {
    const n = vi.fn() as RouterNavigate<AppRoutes>
    n("home")
    // @ts-expect-error - static route rejects params
    n("home", {} as Record<string, string>)
    expect(n).toBeDefined()
  })

  it("dynamic route requires params", () => {
    const n = vi.fn() as RouterNavigate<AppRoutes>
    n("team.invite", { teamId: "t1" })
    expect(n).toBeDefined()
  })

  it("dynamic route rejects missing params", () => {
    const n = vi.fn() as RouterNavigate<AppRoutes>
    // @ts-expect-error - dynamic route requires params
    n("team.invite")
    expect(n).toBeDefined()
  })

  it("dynamic route rejects wrong params", () => {
    const n = vi.fn() as RouterNavigate<AppRoutes>
    // @ts-expect-error - wrong param name
    n("team.invite", { wrong: "x" })
    expect(n).toBeDefined()
  })

  it("dynamic route rejects extra params", () => {
    const n = vi.fn() as RouterNavigate<AppRoutes>
    // @ts-expect-error - extra params not allowed
    n("team.invite", { teamId: "t1", extra: "x" })
    expect(n).toBeDefined()
  })

  it("unknown route name is rejected", () => {
    const n = vi.fn() as RouterNavigate<AppRoutes>
    const bad: string = "missing"
    // @ts-expect-error - unknown route
    n(bad)
    expect(n).toBeDefined()
  })

  it("RouterServices exposes both navigate and extra services", () => {
    type Extra = { analytics: { track(event: string): void } }
    type Svc = RouterServices<AppRoutes, Extra>

    const svc: Svc = {
      navigate: vi.fn() as RouterNavigate<AppRoutes>,
      analytics: { track: vi.fn() },
    }
    svc.navigate("home")
    svc.analytics.track("test")
    expect(svc.navigate).toHaveBeenCalledWith("home")
    expect(svc.analytics.track).toHaveBeenCalledWith("test")
  })

  it("RouterServices without extras exposes only navigate", () => {
    type Svc = RouterServices<AppRoutes>

    const svc: Svc = {
      navigate: vi.fn() as RouterNavigate<AppRoutes>,
    }
    svc.navigate("home")
    expect(svc.navigate).toHaveBeenCalledWith("home")
  })

  it("screen<RouterServices> gets typed navigate in action context", () => {
    type Svc = RouterServices<AppRoutes, { analytics: { track(event: string): void } }>

    const Scr = screen<Svc>("Test", $ => {
      $.act("Go")
        .does(({ navigate, analytics }) => {
          navigate("home")
          navigate("team.invite", { teamId: "t1" })
          analytics.track("test")

          // @ts-expect-error missing required params
          navigate("team.invite")

          const bad: string = "missing"
          // @ts-expect-error unknown route name
          navigate(bad)
        })
      $.surface("main").contains()
    })

    expect(Scr).toBeDefined()
  })

  it("existing router .path() type tests still pass", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("user", "/users/:userId", HomeScreen)

    router.path("home")
    router.path("user", { userId: "abc" })

    expect(router).toBeDefined()
  })
})

describe("route context types", () => {
  const appPaths = {
    home: "/",
    login: "/login",
    "team.invite": "/teams/:teamId/invite",
  } as const

  type AppRoutes = RoutesFromPaths<typeof appPaths>

  it("RouteParamsFor extracts params for dynamic route", () => {
    const r: RouteParamsFor<AppRoutes, "team.invite"> = { teamId: "abc" }
    expect(r.teamId).toBe("abc")
  })

  it("RouteParamsFor produces {} for static route", () => {
    const r: RouteParamsFor<AppRoutes, "home"> = {}
    expect(r).toEqual({})
  })

  it("RouteContextFor has name, path, and typed params", () => {
    const r: RouteContextFor<AppRoutes, "team.invite"> = {
      name: "team.invite",
      path: "/teams/:teamId/invite",
      params: { teamId: "t1" },
    }
    expect(r.name).toBe("team.invite")
    expect(r.path).toBe("/teams/:teamId/invite")
    expect(r.params.teamId).toBe("t1")
  })

  it("RouteContextFor rejects unknown params", () => {
    // @ts-expect-error - unknown param should fail
    const r: RouteParamsFor<AppRoutes, "team.invite"> = { unknown: "x" }
    expect(r).toBeDefined()
  })

  it("RouteContext is a discriminated union by name", () => {
    function handleRoute(route: RouteContext<AppRoutes>) {
      if (route.name === "team.invite") {
        const teamId: string = route.params.teamId
        expect(typeof teamId).toBe("string")
      }
    }
    handleRoute({ name: "home", path: "/", params: {} })
    expect(true).toBe(true)
  })

  it("narrowing route.name gives typed params", () => {
    function handleRoute(route: RouteContext<AppRoutes>) {
      if (route.name === "team.invite") {
        expect(route.params.teamId).toBeDefined()
      }
    }
    handleRoute({
      name: "team.invite",
      path: "/teams/:teamId/invite",
      params: { teamId: "t1" },
    })
  })

  it("cannot access unknown param without narrowing", () => {
    const route = { name: "team.invite" as const, path: "/teams/:teamId/invite" as const, params: { teamId: "t1" } }
    const r: RouteContext<AppRoutes> = route
    // @ts-expect-error - nonexistent param not on any route
    r.params.nonexistent
  })

  it("unknown route name fails", () => {
    // @ts-expect-error - unknown route name
    const r: RouteContextFor<AppRoutes, "nonexistent"> = null as never
    expect(r).toBeNull()
  })

  it("RouterServices with route context exposes both navigate and route", () => {
    type Extra = { route: RouteContext<AppRoutes> }
    type Svc = RouterServices<AppRoutes, Extra>

    const svc: Svc = {
      navigate: vi.fn() as RouterNavigate<AppRoutes>,
      route: { name: "home", path: "/", params: {} },
    }

    svc.navigate("home")
    svc.route.params = {}

    expect(svc.navigate).toHaveBeenCalledWith("home")
  })

  it("screen<RouterServices> with route context gets typed route in action context", () => {
    type Svc = RouterServices<AppRoutes, { route: RouteContext<AppRoutes> }>

    const Scr = screen<Svc>("Test", $ => {
      $.act("Use route")
        .does(({ route, navigate }) => {
          if (route.name === "team.invite") {
            route.params.teamId
          }

          // @ts-expect-error must narrow before accessing dynamic param
          route.params.teamId

          navigate("home")
        })
      $.surface("main").contains()
    })

    expect(Scr).toBeDefined()
  })
})
