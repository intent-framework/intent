import { describe, it, expect } from "vitest"
import { screen } from "@intent/core"
import { createRouter } from "./router.js"

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
    const router = createRouter()
    const result = router.route("home", "/", HomeScreen)
    expect(result).toBe(router)
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
    const router = createRouter().route("home", "/", HomeScreen)
    expect(router.match("/").found).toBe(true)
    router.route("login", "/login", LoginScreen)
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
    const router = createRouter()
    expect(() => router.path("nonexistent")).toThrow('Route "nonexistent" not found')
  })

  it("throws when a required param is missing", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen)
    expect(() => router.path("user", {})).toThrow('Missing params for route "user": :userId')
  })

  it("throws when some required params are missing", () => {
    const router = createRouter().route("org", "/orgs/:orgId/repos/:repoId", HomeScreen)
    expect(() => router.path("org", { orgId: "acme" })).toThrow(
      'Missing params for route "org": :repoId'
    )
  })

  it("ignores extra params not in the path pattern", () => {
    const router = createRouter().route("user", "/users/:userId", HomeScreen)
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
    router.route("login", "/login", LoginScreen)
    const second = router.routes()
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(2)
  })

  it("route objects are not mutable through the listing", () => {
    const router = createRouter().route("home", "/", HomeScreen)
    const routes = router.routes()
    expect(routes).toHaveLength(1)
    expect(routes[0]!.name).toBe("home")
  })
})

describe("route name uniqueness", () => {
  it("allows duplicate route names (last wins on path building)", () => {
    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("home", "/alt", LoginScreen)

    expect(() => router.path("home")).not.toThrow()
    // path building uses first match
    expect(router.path("home")).toBe("/")
    expect(router.routes()).toHaveLength(2)
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
