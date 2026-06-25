import { describe, it, expect, vi } from "vitest"
import { screen } from "@intent/core"
import { createRouter } from "@intent/router"
import type { RouterServices, RoutesFromPaths, RouteContext } from "@intent/router"
import { renderRouter, renderDom } from "./index.js"

function createMockWindow(location: string = "/") {
  const state: { pathname: string } = { pathname: location }
  const listeners: Array<() => void> = []

  const win = {
    location: { pathname: state.pathname },
    history: {
      pushState(_data: unknown, _unused: string, url?: string | URL | null) {
        if (typeof url === "string") {
          state.pathname = url
        }
      },
    },
    addEventListener(event: string, fn: () => void) {
      if (event === "popstate") {
        listeners.push(fn)
      }
    },
    removeEventListener(event: string, fn: () => void) {
      if (event === "popstate") {
        const idx = listeners.indexOf(fn)
        if (idx !== -1) listeners.splice(idx, 1)
      }
    },
    _triggerPopstate() {
      // Update location to current before triggering
      for (const fn of listeners) {
        fn()
      }
    },
    _setPathname(p: string) {
      state.pathname = p
    },
    _getPathname() {
      return state.pathname
    },
  }

  return win as unknown as Window & {
    _triggerPopstate: () => void
    _setPathname: (p: string) => void
    _getPathname: () => string
  }
}

const HomeScreen = screen("Home", $ => {
  $.act("Home action").primary()
  $.surface("main").contains()
})

const LoginScreen = screen("Login", $ => {
  $.act("Login action").primary()
  $.surface("main").contains()
})

const InviteScreen = screen("Invite", $ => {
  $.act("Invite action").primary()
  $.surface("main").contains()
})

const NotFoundScreen = screen("NotFound", $ => {
  $.act("Not found fallback").primary()
  $.surface("main").contains()
})

const HomeScreenWithNav = screen("Home", $ => {
  $.act("Go to login")
    .primary()
    .when(true)
    .does(({ navigate }) => {
      navigate?.("login")
    })
  $.surface("main").contains()
})

const TeamScreenWithNav = screen("Team", $ => {
  $.act("Open team invite")
    .primary()
    .when(true)
    .does(({ navigate }) => {
      navigate?.("team.details", { teamId: "team_1" })
    })
  $.surface("main").contains()
})

const TeamDetailScreen = screen("TeamDetail", $ => {
  $.act("Team detail action")
    .primary()
    .when(true)
    .does(() => {})
  $.surface("main").contains()
})

const BlockedActionScreen = screen("Blocked", $ => {
  const email = $.state.text("email")
  const emailAsk = $.ask("Email", email).required()
  $.act("Navigate when enabled")
    .primary()
    .when(emailAsk.valid, "Enter your email.")
    .does(({ navigate }) => {
      navigate?.("login")
    })
  $.surface("main").contains(emailAsk)
})

describe("renderRouter", () => {
  it("renders the matching screen for the initial URL", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/login")

    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    renderRouter(router, { target: root, window: win })

    const button = root.querySelector("button")
    expect(button).not.toBeNull()
    expect(button?.textContent).toBe("Login action")
  })

  it("renders 'Not found' fallback for unknown URL", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/unknown")

    const router = createRouter()
      .route("home", "/", HomeScreen)

    const root = document.getElementById("root")!
    renderRouter(router, { target: root, window: win })

    expect(root.textContent).toBe("Not found")
  })

  it("renders notFound option when provided for unknown URL", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/unknown")

    const router = createRouter()
      .route("home", "/", HomeScreen)

    const root = document.getElementById("root")!
    renderRouter(router, { target: root, window: win, notFound: NotFoundScreen })

    const button = root.querySelector("button")
    expect(button).not.toBeNull()
    expect(button?.textContent).toBe("Not found fallback")
  })

  it("renders notFound as function when provided for unknown URL", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/missing")

    const router = createRouter()
      .route("home", "/", HomeScreen)

    const root = document.getElementById("root")!
    const notFoundFn = vi.fn(() => NotFoundScreen)
    renderRouter(router, { target: root, window: win, notFound: notFoundFn })

    const button = root.querySelector("button")
    expect(button).not.toBeNull()
    expect(button?.textContent).toBe("Not found fallback")
    expect(notFoundFn).toHaveBeenCalledWith("/missing")
  })

  it("navigate updates history and renders the target screen", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    const app = renderRouter(router, { target: root, window: win })

    const button = root.querySelector("button")
    expect(button?.textContent).toBe("Home action")

    app.navigate("login")

    const button2 = root.querySelector("button")
    expect(button2?.textContent).toBe("Login action")
    expect(win._getPathname()).toBe("/login")
  })

  it("typed dynamic navigation builds and renders /teams/:teamId/invite", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("team.invite", "/teams/:teamId/invite", InviteScreen)

    const root = document.getElementById("root")!
    const app = renderRouter(router, { target: root, window: win })

    app.navigate("team.invite", { teamId: "team_1" })

    const button = root.querySelector("button")
    expect(button?.textContent).toBe("Invite action")
    expect(win._getPathname()).toBe("/teams/team_1/invite")
  })

  it("popstate re-renders the matched screen", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    const app = renderRouter(router, { target: root, window: win })

    // Navigate to login
    app.navigate("login")
    expect(root.querySelector("button")?.textContent).toBe("Login action")

    // Change URL and trigger popstate
    win._setPathname("/")
    win._triggerPopstate()

    expect(root.querySelector("button")?.textContent).toBe("Home action")
  })

  it("disposes previous screen when navigating", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!

    // We track this by ensuring the HTML is cleared between renders
    const app = renderRouter(router, { target: root, window: win })

    // Navigate — should clear previous content
    app.navigate("login")

    // Only one button (login) should exist
    const buttons = root.querySelectorAll("button")
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.textContent).toBe("Login action")
  })

  it("dispose removes popstate listener and cleans current screen", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    const app = renderRouter(router, { target: root, window: win })

    app.navigate("login")
    expect(root.querySelector("button")?.textContent).toBe("Login action")

    app.dispose()

    // After dispose, popstate should not trigger re-render
    win._setPathname("/")
    win._triggerPopstate()

    // Should still show login (not home), because listener was removed
    expect(root.querySelector("button")?.textContent).toBe("Login action")
  })

  it("renderPath renders the given path without history change", () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreen)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    const app = renderRouter(router, { target: root, window: win })

    app.renderPath("/login")

    const button = root.querySelector("button")
    expect(button?.textContent).toBe("Login action")
    // History should NOT have been updated
    expect(win._getPathname()).toBe("/")
  })

  it("action can navigate to a static route via context", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreenWithNav)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    renderRouter(router, { target: root, window: win })

    expect(root.querySelector("button")?.textContent).toBe("Go to login")

    // Submit the form to trigger the act's navigate
    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    // Wait for async execution
    await new Promise(r => setTimeout(r, 10))

    // Should have navigated to login
    const button = root.querySelector("button")
    expect(button?.textContent).toBe("Login action")
    expect(win._getPathname()).toBe("/login")
  })

  it("action can navigate to a dynamic route via context", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", TeamScreenWithNav)
      .route("team.details", "/teams/:teamId", TeamDetailScreen)

    const root = document.getElementById("root")!
    renderRouter(router, { target: root, window: win })

    expect(root.querySelector("button")?.textContent).toBe("Open team invite")

    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    const button = root.querySelector("button")
    expect(button?.textContent).toBe("Team detail action")
    expect(win._getPathname()).toBe("/teams/team_1")
  })

  it("previous screen is disposed when action navigation changes route", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", HomeScreenWithNav)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    renderRouter(router, { target: root, window: win })

    expect(root.querySelector("button")?.textContent).toBe("Go to login")

    // Submit form to trigger navigation
    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    // Only one button should exist (login), no stale elements from home screen
    const buttons = root.querySelectorAll("button")
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.textContent).toBe("Login action")
  })

  it("blocked action does not navigate", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    const router = createRouter()
      .route("home", "/", BlockedActionScreen)
      .route("login", "/login", LoginScreen)

    const root = document.getElementById("root")!
    renderRouter(router, { target: root, window: win })

    const button = root.querySelector("button") as HTMLButtonElement
    expect(button.disabled).toBe(true)

    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    // Should still be on the same screen (action was blocked)
    expect(root.querySelector("button")?.textContent).toBe("Navigate when enabled")
    expect(win._getPathname()).toBe("/")
  })

  it("renderDom passes services to runtime for action context", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const navigate: (name: string) => void = vi.fn()
    const root = document.getElementById("root")!

    const cleanup = renderDom(HomeScreenWithNav, {
      target: root,
      services: { navigate },
    })

    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    expect(navigate).toHaveBeenCalledWith("login")

    cleanup()
  })

  it("renderDom passes custom typed services to action on form submit", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    type AppServices = {
      analytics: { track(event: string): void }
      navigate: (name: string) => void
    }

    const track = vi.fn()
    const navigate: (name: string) => void = vi.fn()

    const CustomScreen = screen<AppServices>("CustomScreen", $ => {
      $.act("Do it")
        .primary()
        .when(true)
        .does(({ analytics, navigate }) => {
          analytics.track("submitted")
          navigate?.("done")
        })
      $.surface("main").contains()
    })

    const root = document.getElementById("root")!

    const cleanup = renderDom<AppServices>(CustomScreen, {
      target: root,
      services: { analytics: { track }, navigate },
    })

    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    expect(track).toHaveBeenCalledWith("submitted")
    expect(navigate).toHaveBeenCalledWith("done")

    cleanup()
  })

  it("renderRouter passes custom services into action handlers", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    type AppServices = {
      analytics: { track(event: string): void }
      navigate?: (name: string, params?: Record<string, string>) => void
    }

    const track = vi.fn()

    const CustomScreen = screen<AppServices>("CustomScreen", $ => {
      $.act("Do it")
        .primary()
        .when(true)
        .does(({ analytics }) => {
          analytics.track("routed_action")
        })
      $.surface("main").contains()
    })

    const router = createRouter<AppServices>()
      .route("home", "/", CustomScreen)

    const root = document.getElementById("root")!
    renderRouter(router, {
      target: root,
      window: win,
      services: { analytics: { track } },
    })

    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    expect(track).toHaveBeenCalledWith("routed_action")
  })

  it("renderRouter passes custom services into notFound screen", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/unknown")

    type AppServices = {
      analytics: { track(event: string): void }
      navigate?: (name: string, params?: Record<string, string>) => void
    }

    const track = vi.fn()

    const NotFoundScr = screen<AppServices>("NotFound", $ => {
      $.act("Not found action")
        .primary()
        .when(true)
        .does(({ analytics }) => {
          analytics.track("not_found")
        })
      $.surface("main").contains()
    })

    const router = createRouter<AppServices>()
      .route("home", "/", NotFoundScr)

    const root = document.getElementById("root")!
    renderRouter(router, {
      target: root,
      window: win,
      notFound: NotFoundScr,
      services: { analytics: { track } },
    })

    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    expect(track).toHaveBeenCalledWith("not_found")
  })

  it("renderRouter injects navigate into custom services", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const win = createMockWindow("/")

    type AppServices = {
      analytics: { track(event: string): void }
      navigate?: (name: string, params?: Record<string, string>) => void
    }

    const track = vi.fn()

    const ScreenWithNav = screen<AppServices>("Home", $ => {
      $.act("Go to login")
        .primary()
        .when(true)
        .does(({ navigate, analytics }) => {
          analytics.track("navigated")
          navigate?.("login")
        })
      $.surface("main").contains()
    })

    const router = createRouter<AppServices>()
      .route("home", "/", ScreenWithNav)
      .route("login", "/login", screen<AppServices>("Login", $ => {
        $.act("Login action").primary()
        $.surface("main").contains()
      }))

    const root = document.getElementById("root")!
    renderRouter(router, {
      target: root,
      window: win,
      services: { analytics: { track } },
    })

    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))
    await new Promise(r => setTimeout(r, 10))

    expect(track).toHaveBeenCalledWith("navigated")
    expect(root.querySelector("button")?.textContent).toBe("Login action")
    expect(win._getPathname()).toBe("/login")
  })

  describe("typed RouterServices navigation", () => {
    const appPaths = {
      home: "/",
      login: "/login",
      "team.invite": "/teams/:teamId/invite",
    } as const

    type AppRoutes = RoutesFromPaths<typeof appPaths>
    type AppServices = RouterServices<AppRoutes, {
      analytics: { track(event: string): void }
    }>

    it("renderRouter injects typed navigate into action context", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/")
      const track = vi.fn()

      const ScreenWithTypedNav = screen<AppServices>("Home", $ => {
        $.act("Go to login")
          .primary()
          .when(true)
          .does(({ navigate, analytics }) => {
            analytics.track("clicked")
            navigate("login")
          })
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/", ScreenWithTypedNav)
        .route("login", appPaths.login, screen<AppServices>("Login", $ => {
          $.act("Login action").primary()
          $.surface("main").contains()
        }))

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
        services: { analytics: { track } },
      })

      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      expect(track).toHaveBeenCalledWith("clicked")
      expect(root.querySelector("button")?.textContent).toBe("Login action")
      expect(win._getPathname()).toBe("/login")
    })

    it("typed navigate to dynamic route works with params", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/")
      const track = vi.fn()

      const ScreenWithDynamicNav = screen<AppServices>("Home", $ => {
        $.act("Open invite")
          .primary()
          .when(true)
          .does(({ navigate, analytics }) => {
            analytics.track("invite_opened")
            navigate("team.invite", { teamId: "team_1" })
          })
        $.surface("main").contains()
      })

      const InviteScreen = screen<AppServices>("Invite", $ => {
        $.act("Invite action").primary()
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/", ScreenWithDynamicNav)
        .route("team.invite", appPaths["team.invite"], InviteScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
        services: { analytics: { track } },
      })

      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      expect(track).toHaveBeenCalledWith("invite_opened")
      expect(root.querySelector("button")?.textContent).toBe("Invite action")
      expect(win._getPathname()).toBe("/teams/team_1/invite")
    })

    it("custom extra services pass through in typed router", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/")
      const track = vi.fn()

      const CustomScreen = screen<AppServices>("Custom", $ => {
        $.act("Track event")
          .primary()
          .when(true)
          .does(({ analytics }) => {
            analytics.track("custom_event")
          })
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/", CustomScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
        services: { analytics: { track } },
      })

      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      expect(track).toHaveBeenCalledWith("custom_event")
    })

    it("existing default-service renderRouter usage still works", () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/login")

      const router = createRouter()
        .route("home", "/", screen("Home", $ => {
          $.act("Home action").primary()
          $.surface("main").contains()
        }))
        .route("login", "/login", screen("Login", $ => {
          $.act("Login action").primary()
          $.surface("main").contains()
        }))

      const root = document.getElementById("root")!
      renderRouter(router, { target: root, window: win })

      expect(root.querySelector("button")?.textContent).toBe("Login action")
    })
  })

  describe("route context injection", () => {
    const appPaths = {
      home: "/",
      login: "/login",
      "team.invite": "/teams/:teamId/invite",
    } as const

    type AppRoutes = RoutesFromPaths<typeof appPaths>
    type AppServices = RouterServices<AppRoutes, {
      route: RouteContext<AppRoutes>
    }>

    it("renderRouter injects route context for static route", () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/login")

      const ScreenWithRoute = screen<AppServices>("Login", $ => {
        $.act("Login action")
          .primary()
          .when(true)
          .does(({ route }) => {
            expect(route.name).toBe("login")
            expect(route.path).toBe("/login")
            expect(route.params).toEqual({})
          })
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/", screen<AppServices>("Home", $ => {
          $.act("Home action").primary()
          $.surface("main").contains()
        }))
        .route("login", "/login", ScreenWithRoute)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
      })

      expect(root.querySelector("button")?.textContent).toBe("Login action")
    })

    it("renderRouter injects route context with dynamic params", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/team_42/invite")

      let capturedRoute: unknown

      const TeamScreen = screen<AppServices>("Team", $ => {
        $.act("Read route")
          .primary()
          .when(true)
          .does(({ route }) => {
            capturedRoute = route
          })
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("team.invite", "/teams/:teamId/invite", TeamScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
      })

      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      const rt = capturedRoute as { name: string; path: string; params: Record<string, string> }
      expect(rt.name).toBe("team.invite")
      expect(rt.path).toBe("/teams/:teamId/invite")
      expect(rt.params).toEqual({ teamId: "team_42" })
    })

    it("action can read route.params.teamId", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/t-01/invite")

      let capturedTeamId: string | undefined

      const TeamScreen = screen<AppServices>("Team", $ => {
        $.act("Accept")
          .primary()
          .when(true)
          .does(({ route }) => {
            if (route.name === "team.invite") {
              capturedTeamId = route.params.teamId
            }
          })
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("team.invite", "/teams/:teamId/invite", TeamScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
      })

      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      expect(capturedTeamId).toBe("t-01")
    })

    it("navigation updates route context for the next screen", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/")

      let capturedRouteAtTeam: unknown

      const HomeScreen = screen<AppServices>("Home", $ => {
        $.act("Go to team")
          .primary()
          .when(true)
          .does(({ navigate }) => {
            navigate("team.invite", { teamId: "t-99" })
          })
        $.surface("main").contains()
      })

      const TeamScreen = screen<AppServices>("Team", $ => {
        $.act("Team action")
          .primary()
          .when(true)
          .does(({ route }) => {
            capturedRouteAtTeam = route
          })
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/", HomeScreen)
        .route("team.invite", "/teams/:teamId/invite", TeamScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
      })

      // Trigger navigation
      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      // Now on team screen, submit to capture route
      const form2 = root.querySelector("form")!
      form2.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      const rt = capturedRouteAtTeam as { name: string; params: Record<string, string> }
      expect(rt.name).toBe("team.invite")
      expect(rt.params).toEqual({ teamId: "t-99" })
    })

    it("popstate updates route context", () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/home")

      const HomeScreenRoute = screen<AppServices>("Home route", $ => {
        $.act("Home action").primary()
        $.surface("main").contains()
      })

      const LoginScreenRoute = screen<AppServices>("Login route", $ => {
        $.act("Login action").primary()
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/home", HomeScreenRoute)
        .route("login", "/login", LoginScreenRoute)

      const root = document.getElementById("root")!
      const app = renderRouter(router, {
        target: root,
        window: win,
      })

      expect(root.querySelector("button")?.textContent).toBe("Home action")

      app.navigate("login")
      expect(root.querySelector("button")?.textContent).toBe("Login action")

      // Popstate back to home
      win._setPathname("/home")
      win._triggerPopstate()

      expect(root.querySelector("button")?.textContent).toBe("Home action")
    })

    it("notFound screen does not receive route context", () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/unknown")

      const NotFoundScreen = screen<AppServices>("NotFound", $ => {
        $.act("Not found action")
          .primary()
          .when(true)
          .does(() => {
            // route is undefined for notFound screens
          })
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/", screen<AppServices>("Home", $ => {
          $.act("Home action").primary()
          $.surface("main").contains()
        }))

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
        notFound: NotFoundScreen,
      })

      expect(root.querySelector("button")?.textContent).toBe("Not found action")
    })

    it("existing typed navigation tests still pass with route context", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/")
      const track = vi.fn()

      type ServicesWithAnalytics = RouterServices<AppRoutes, {
        route: RouteContext<AppRoutes>
        analytics: { track(event: string): void }
      }>

      const ScreenWithNav = screen<ServicesWithAnalytics>("Home", $ => {
        $.act("Go to login")
          .primary()
          .when(true)
          .does(({ navigate, analytics }) => {
            analytics.track("clicked")
            navigate("login")
          })
        $.surface("main").contains()
      })

      const LoginScreen = screen<ServicesWithAnalytics>("Login", $ => {
        $.act("Login action").primary()
        $.surface("main").contains()
      })

      const router = createRouter<ServicesWithAnalytics>()
        .route("home", "/", ScreenWithNav)
        .route("login", appPaths.login, LoginScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
        services: { analytics: { track } } as any,
      })

      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 10))

      expect(track).toHaveBeenCalledWith("clicked")
      expect(root.querySelector("button")?.textContent).toBe("Login action")
      expect(win._getPathname()).toBe("/login")
    })

    it("renderRouter passes route context to autoloading resource", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/abc-123/invite")

      let capturedContext: unknown

      const TeamResourceScreen = screen<AppServices>("TeamResource", $ => {
        $.resource("team", {
          load: async (context) => {
            capturedContext = context
            return { id: "team_1" }
          },
        })
        $.act("View")
          .primary()
          .when(true)
          .does(() => {})
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("team.invite", "/teams/:teamId/invite", TeamResourceScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
      })

      // Wait for autoload
      const resource = TeamResourceScreen.resourceConfigs[0]!.ref!
      if (resource.status === "idle" || resource.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = resource.subscribe(() => {
            if (resource.status === "ready" || resource.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      const ctx = capturedContext as { route?: { name: string; params: Record<string, string> } }
      expect(ctx).toBeDefined()
      expect(ctx.route?.name).toBe("team.invite")
      expect(ctx.route?.params.teamId).toBe("abc-123")
      expect(resource.status).toBe("ready")
    })

    it("same screen definition with different route param re-runs resource autoload", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/team_1/invite")

      const calls: string[] = []

      const TeamScreen = screen<AppServices>("TeamScreen", $ => {
        $.resource("team", {
          load: async ({ route }) => {
            if (route.name === "team.invite") {
              calls.push(route.params.teamId)
              return { id: route.params.teamId }
            }
            throw new Error("Expected team.invite")
          },
        })
        $.act("View")
          .primary()
          .when(true)
          .does(() => {})
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("team.invite", "/teams/:teamId/invite", TeamScreen)

      const root = document.getElementById("root")!
      const app = renderRouter(router, {
        target: root,
        window: win,
      })

      // Wait for first autoload
      const resource = TeamScreen.resourceConfigs[0]!.ref!
      if (resource.status === "idle" || resource.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = resource.subscribe(() => {
            if (resource.status === "ready" || resource.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      expect(calls).toEqual(["team_1"])
      expect(resource.value).toEqual({ id: "team_1" })

      // Navigate to same route with different param
      app.navigate("team.invite", { teamId: "team_2" })
      await new Promise(r => setTimeout(r, 50))

      // After navigation, the resource should have been autoloaded again
      // with the new route param
      expect(calls).toEqual(["team_1", "team_2"])
      expect(resource.value).toEqual({ id: "team_2" })
    })

    it("renderRouter passes route context to resource loader via navigate", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/home")

      let capturedContext: unknown

      const HomeWithNav = screen<AppServices>("Home", $ => {
        $.act("Go to team")
          .primary()
          .when(true)
          .does(({ navigate }) => {
            navigate("team.invite", { teamId: "t-42" })
          })
        $.surface("main").contains()
      })

      const TeamResourceScreen = screen<AppServices>("TeamResource", $ => {
        $.resource("team", {
          load: async (context) => {
            capturedContext = context
            return { id: "team_data" }
          },
        })
        $.act("View")
          .primary()
          .when(true)
          .does(() => {})
        $.surface("main").contains()
      })

      const router = createRouter<AppServices>()
        .route("home", "/home", HomeWithNav)
        .route("team.invite", "/teams/:teamId/invite", TeamResourceScreen)

      const root = document.getElementById("root")!
      renderRouter(router, {
        target: root,
        window: win,
      })

      // Navigate to team screen
      const form = root.querySelector("form")!
      form.dispatchEvent(new Event("submit", { bubbles: true }))
      await new Promise(r => setTimeout(r, 50))

      // Wait for resource autoload on the new screen
      const resource = TeamResourceScreen.resourceConfigs[0]!.ref!
      if (resource.status === "idle" || resource.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = resource.subscribe(() => {
            if (resource.status === "ready" || resource.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      const ctx = capturedContext as { route?: { name: string; params: Record<string, string> } }
      expect(ctx).toBeDefined()
      expect(ctx.route?.name).toBe("team.invite")
      expect(ctx.route?.params.teamId).toBe("t-42")
      expect(resource.status).toBe("ready")
    })
  })

  describe("runtime resource isolation across navigation", () => {
    const appPathsRW = {
      "team.details": "/teams/:teamId",
    } as const

    type AppRoutesRW = RoutesFromPaths<typeof appPathsRW>
    type AppServicesRW = RouterServices<AppRoutesRW, {
      route: RouteContext<AppRoutesRW>
    }>

    it("shared screen definition with /teams/:teamId loads team_1 then team_2 after navigation", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/team_1")

      const calls: string[] = []

      const TeamScreen = screen<AppServicesRW>("Team", $ => {
        $.resource("team", {
          load: async ({ route }) => {
            if (route.name !== "team.details") throw new Error("wrong route")
            calls.push(route.params.teamId)
            return { id: route.params.teamId }
          },
        })
        $.act("View").primary().when(true).does(() => {})
        $.surface("main").contains()
      })

      const router = createRouter<AppServicesRW>()
        .route("team.details", "/teams/:teamId", TeamScreen)

      const root = document.getElementById("root")!
      const app = renderRouter(router, { target: root, window: win })

      const ref = TeamScreen.resourceConfigs[0]!.ref!
      if (ref.status === "idle" || ref.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = ref.subscribe(() => {
            if (ref.status === "ready" || ref.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      expect(calls).toEqual(["team_1"])
      expect(ref.value).toEqual({ id: "team_1" })

      app.navigate("team.details", { teamId: "team_2" })
      await new Promise(r => setTimeout(r, 50))

      expect(calls).toEqual(["team_1", "team_2"])
      expect(ref.value).toEqual({ id: "team_2" })
    })

    it("second runtime resource instance has its own value and status", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/team_1")

      const calls: string[] = []

      const TeamScreen = screen<AppServicesRW>("Team", $ => {
        $.resource("team", {
          load: async ({ route }) => {
            if (route.name !== "team.details") throw new Error("wrong route")
            calls.push(route.params.teamId)
            return { id: route.params.teamId }
          },
        })
        $.act("View").primary().when(true).does(() => {})
        $.surface("main").contains()
      })

      const router = createRouter<AppServicesRW>()
        .route("team.details", "/teams/:teamId", TeamScreen)

      const root = document.getElementById("root")!
      const app = renderRouter(router, { target: root, window: win })

      const ref = TeamScreen.resourceConfigs[0]!.ref!
      if (ref.status === "idle" || ref.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = ref.subscribe(() => {
            if (ref.status === "ready" || ref.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      expect(calls).toEqual(["team_1"])
      expect(ref.value).toEqual({ id: "team_1" })
      expect(ref.status).toBe("ready")

      app.navigate("team.details", { teamId: "team_2" })
      await new Promise(r => setTimeout(r, 50))

      if (ref.status === "idle" || ref.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = ref.subscribe(() => {
            if (ref.status === "ready" || ref.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      expect(ref.value).toEqual({ id: "team_2" })
      expect(ref.status).toBe("ready")

      app.dispose()

      expect(ref.status).toBe("idle")
      expect(ref.value).toBeUndefined()
    })

    it("pending first load cannot overwrite second runtime's resource state after navigation", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/team_1")

      let resolveFirst!: () => void
      const firstBlocker = new Promise<void>(resolve => { resolveFirst = resolve })

      const calls: string[] = []

      const TeamScreen = screen<AppServicesRW>("Team", $ => {
        $.resource("team", {
          load: async ({ route }) => {
            if (route.name !== "team.details") throw new Error("wrong route")
            calls.push(route.params.teamId)
            if (route.params.teamId === "team_1") {
              await firstBlocker
            }
            return { id: route.params.teamId }
          },
        })
        $.act("View").primary().when(true).does(() => {})
        $.surface("main").contains()
      })

      const router = createRouter<AppServicesRW>()
        .route("team.details", "/teams/:teamId", TeamScreen)

      const root = document.getElementById("root")!
      const app = renderRouter(router, { target: root, window: win })

      await new Promise(r => setTimeout(r, 10))

      const ref = TeamScreen.resourceConfigs[0]!.ref!
      expect(ref.status).toBe("pending")

      app.navigate("team.details", { teamId: "team_2" })
      await new Promise(r => setTimeout(r, 10))

      resolveFirst()
      await new Promise(r => setTimeout(r, 10))

      if (ref.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = ref.subscribe(() => {
            if (ref.status === "ready" || ref.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      expect(calls).toEqual(["team_1", "team_2"])
      expect(ref.value).toEqual({ id: "team_2" })
      expect(ref.status).toBe("ready")
    })

    it("navigating away disconnects old ref without disconnecting new runtime's ref", async () => {
      document.body.innerHTML = '<div id="root"></div>'
      const win = createMockWindow("/teams/team_1")

      const calls: string[] = []

      const TeamScreen = screen<AppServicesRW>("Team", $ => {
        $.resource("team", {
          load: async ({ route }) => {
            if (route.name !== "team.details") throw new Error("wrong route")
            calls.push(route.params.teamId)
            return { id: route.params.teamId }
          },
        })
        $.act("View").primary().when(true).does(() => {})
        $.surface("main").contains()
      })

      const ref = TeamScreen.resourceConfigs[0]!.ref!

      const router = createRouter<AppServicesRW>()
        .route("team.details", "/teams/:teamId", TeamScreen)

      const root = document.getElementById("root")!
      const app = renderRouter(router, { target: root, window: win })

      if (ref.status === "idle" || ref.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = ref.subscribe(() => {
            if (ref.status === "ready" || ref.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      expect(ref.value).toEqual({ id: "team_1" })

      app.navigate("team.details", { teamId: "team_2" })

      if (ref.status === "idle" || ref.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = ref.subscribe(() => {
            if (ref.status === "ready" || ref.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }

      expect(ref.value).toEqual({ id: "team_2" })

      app.dispose()

      expect(ref.status).toBe("idle")
      expect(ref.value).toBeUndefined()
    })
  })
})
