import { describe, it, expect, vi } from "vitest"
import { screen } from "@intent/core"
import { createRouter } from "@intent/router"
import { renderRouter } from "./dom-router.js"

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
})
