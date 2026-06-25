import { describe, it, expect, vi } from "vitest"
import { screen } from "@intent/core"
import { createRouter } from "@intent/router"
import type { RouterServices, RoutesFromPaths } from "@intent/router"
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
})
