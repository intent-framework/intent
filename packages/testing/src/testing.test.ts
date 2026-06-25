import { describe, it, expect, vi } from "vitest"
import { screen } from "@intent-framework/core"
import { testScreen } from "./index.js"

async function loginUser(_params: { email: string; password: string }) {
  await Promise.resolve()
}

describe("testScreen", () => {
  it("checks action blocked/enabled state", async () => {
    const LoginScreen = screen("Login", $ => {
      const email = $.state.text("email")
      const password = $.state.text("password")

      const emailAsk = $.ask("Email", email)
        .asContact("email")
        .required()

      const passwordAsk = $.ask("Password", password)
        .asSecret()
        .required()

      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid)
        .when(passwordAsk.valid)
        .does(async () => {
          await loginUser({ email: email.value, password: password.value })
        })

      $.flow("login")
        .startsWith(emailAsk)
        .then(passwordAsk)
        .then(login)

      $.surface("main")
        .contains(emailAsk, passwordAsk, login)
    })

    await testScreen(LoginScreen, async screen => {
      expect(() => screen.act("Log in").toBeBlocked()).not.toThrow()

      await screen.answer("Email", "mahyar@example.com")
      await screen.answer("Password", "secret")

      expect(() => screen.act("Log in").toBeEnabled()).not.toThrow()
    })
  })

  it("throws when act not found", async () => {
    const LoginScreen = screen("NotFound", $ => {
      const login = $.act("Log in")
      $.surface("main").contains(login)
    })

    await testScreen(LoginScreen, async screen => {
      expect(() => screen.act("Nonexistent")).toThrow('Act "Nonexistent" not found.')
    })
  })

  it("throws when ask not found", async () => {
    const LoginScreen = screen("AskNotFound", $ => {
      const login = $.act("Log in")
      $.surface("main").contains(login)
    })

    await testScreen(LoginScreen, async screen => {
      await expect(screen.answer("Fake", "value")).rejects.toThrow('Ask "Fake" not found.')
    })
  })

  it("checks blocked reasons via toBeBlockedBy", async () => {
    const LoginScreen = screen("BlockedByTest", $ => {
      const email = $.state.text("email")
      const password = $.state.text("password")
      const emailAsk = $.ask("Email", email).required()
      const passwordAsk = $.ask("Password", password).required()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
        .when(passwordAsk.valid, "Enter your password.")
        .does(async () => {})
      $.surface("main").contains(emailAsk, passwordAsk, login)
    })

    await testScreen(LoginScreen, async screen => {
      // Both conditions fail: both reasons present
      expect(() => screen.act("Log in").toBeBlockedBy("Enter your email.")).not.toThrow()
      expect(() => screen.act("Log in").toBeBlockedBy("Enter your password.")).not.toThrow()
      expect(() => screen.act("Log in").toBeBlockedBy("Enter your email.", "Enter your password.")).not.toThrow()

      // Answer email — only password reason remains
      await screen.answer("Email", "mahyar@example.com")
      expect(() => screen.act("Log in").toBeBlockedBy("Enter your password.")).not.toThrow()
      expect(() => screen.act("Log in").toBeBlockedBy("Enter your email.")).toThrow()

      // Answer password — act is enabled
      await screen.answer("Password", "secret")
      expect(() => screen.act("Log in").toBeEnabled()).not.toThrow()
      expect(() => screen.act("Log in").toBeBlockedBy("Enter your email.")).toThrow()
    })
  })

  it("checks resource status via screen handle", async () => {
    let resolveLoad!: (value: string) => void
    const loadPromise = new Promise<string>(resolve => { resolveLoad = resolve })

    const TeamScreen = screen("ResourceTest", $ => {
      $.resource("team", {
        load: async () => loadPromise,
        autoLoad: false,
      })
    })

    await testScreen(TeamScreen, async screen => {
      expect(screen.resource("team").status()).toBe("idle")

      const loadDone = screen.resource("team").load()
      expect(screen.resource("team").status()).toBe("pending")

      resolveLoad("team_data")
      await loadDone
      expect(screen.resource("team").status()).toBe("ready")
    })
  })

  it("throws when resource not found", async () => {
    const TeamScreen = screen("NotFound", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    await testScreen(TeamScreen, async screen => {
      expect(() => screen.resource("nonexistent")).toThrow('Resource "nonexistent" not found.')
    })
  })

  it("supports resource.reload via screen handle", async () => {
    let callCount = 0
    const TeamScreen = screen("ReloadTest", $ => {
      $.resource("team", {
        load: async () => {
          callCount++
          return `data${callCount}`
        },
        autoLoad: false,
      })
    })

    await testScreen(TeamScreen, async screen => {
      await screen.resource("team").load()
      expect(screen.resource("team").status()).toBe("ready")

      await screen.resource("team").reload()
      expect(screen.resource("team").status()).toBe("ready")

      // reload called the loader again
      expect(callCount).toBe(2)
    })
  })

  it("auto-loads resources on testScreen start", async () => {
    let loaded = false
    const TeamScreen = screen("AutoLoad", $ => {
      $.resource("team", {
        load: async () => {
          loaded = true
          return "team_data"
        },
      })
    })

    await testScreen(TeamScreen, async screen => {
      expect(loaded).toBe(true)
      expect(screen.resource("team").status()).toBe("ready")
    })
  })

  it("autoLoad: false resources stay idle after auto-start", async () => {
    let loaded = false
    const TeamScreen = screen("ManualLoad", $ => {
      $.resource("searchResults", {
        load: async () => {
          loaded = true
          return "results"
        },
        autoLoad: false,
      })
    })

    await testScreen(TeamScreen, async screen => {
      expect(loaded).toBe(false)
      expect(screen.resource("searchResults").status()).toBe("idle")
    })
  })

  it("exposes start() for manual runtime control", async () => {
    let loaded = false
    const TeamScreen = screen("ManualStart", $ => {
      $.resource("team", {
        load: async () => {
          loaded = true
          return "data"
        },
        autoLoad: false,
      })
    })

    // autoLoad: false means testScreen won't load it on auto-start
    await testScreen(TeamScreen, async screen => {
      expect(loaded).toBe(false)

      // Manually start the runtime (already started, but start guards against double)
      await screen.start()
      expect(loaded).toBe(false) // still false because autoLoad: false

      // Manually load
      await screen.resource("team").load()
      expect(loaded).toBe(true)
      expect(screen.resource("team").status()).toBe("ready")
    })
  })

  it("resource conditions update act state after auto-load in testScreen", async () => {
    const TeamScreen = screen("TestResourceUpdatesAct", $ => {
      const team = $.resource("team", {
        load: async () => ({ id: "team_1" }),
      })

      $.act("Save")
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(team as unknown as never)
    })

    await testScreen(TeamScreen, async screen => {
      // After auto-load, resource is ready and act should be enabled
      expect(() => screen.act("Save").toBeEnabled()).not.toThrow()
    })
  })

  it("testing harness can observe stale state", async () => {
    const TeamScreen = screen("HarnessStale", $ => {
      $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })
    })

    await testScreen(TeamScreen, async screen => {
      expect(screen.resource("team").stale()).toBe(false)

      screen.resource("team").invalidate()
      expect(screen.resource("team").stale()).toBe(true)
    })
  })

  it("act.run() executes the action with runtime context", async () => {
    let contextReceived = false
    const TestScreen = screen("ActRun", $ => {
      $.act("Run me")
        .when(true)
        .does((context) => {
          contextReceived = true
          expect(context).toBeDefined()
        })
      $.surface("main").contains()
    })

    await testScreen(TestScreen, async screen => {
      await screen.act("Run me").run()
      expect(contextReceived).toBe(true)
    })
  })

  it("testScreen passes services to runtime", async () => {
    const navigate: (name: string) => void = vi.fn()
    const TestScreen = screen("Services", $ => {
      $.act("Navigate")
        .when(true)
        .does(({ navigate }) => {
          navigate?.("login")
        })
      $.surface("main").contains()
    })

    await testScreen(TestScreen, async screen => {
      await screen.act("Navigate").run()
      expect(navigate).toHaveBeenCalledWith("login")
    }, { services: { navigate } })
  })

  it("mock navigate service can be asserted in testing", async () => {
    const navigate: (name: string, params?: Record<string, string>) => void = vi.fn()
    const TestScreen = screen("MockNav", $ => {
      $.act("Go")
        .when(true)
        .does(({ navigate }) => {
          navigate?.("team.details", { teamId: "t1" })
        })
      $.surface("main").contains()
    })

    await testScreen(TestScreen, async screen => {
      await screen.act("Go").run()
      expect(navigate).toHaveBeenCalledWith("team.details", { teamId: "t1" })
    }, { services: { navigate } })
  })

  it("act.run() on blocked action does not navigate", async () => {
    const navigate: (name: string) => void = vi.fn()
    const TestScreen = screen("BlockedNav", $ => {
      const email = $.state.text("email")
      const ask = $.ask("Email", email).required()
      $.act("Go")
        .when(ask.valid)
        .does(({ navigate }) => {
          navigate?.("somewhere")
        })
      $.surface("main").contains(ask)
    })

    await testScreen(TestScreen, async screen => {
      await screen.act("Go").run()
      expect(navigate).not.toHaveBeenCalled()
    }, { services: { navigate } })
  })

  it("failed action does not accidentally navigate after throwing", async () => {
    const navigate: (name: string) => void = vi.fn()
    const TestScreen = screen("FailNav", $ => {
      $.act("Go")
        .when(true)
        .does(({ navigate }) => {
          navigate?.("somewhere")
          throw new Error("fail")
        })
        .feedback({ failure: "Failed." })
      $.surface("main").contains()
    })

    await testScreen(TestScreen, async screen => {
      await screen.act("Go").run()
      expect(navigate).toHaveBeenCalledWith("somewhere")
    }, { services: { navigate } })
  })

  it("testScreen passes custom typed services to action", async () => {
    type AppAnalytics = {
      track(event: string): void
    }

    type AppServices = {
      analytics: AppAnalytics
      navigate: (name: string) => void
    }

    const analytics: AppAnalytics = { track: vi.fn() }
    const navigate: (name: string) => void = vi.fn()

    const TestScreen = screen<AppServices>("CustomServices", $ => {
      $.act("Track and go")
        .when(true)
        .does(({ analytics: a, navigate: n }) => {
          a.track("click")
          n?.("home")
        })
      $.surface("main").contains()
    })

    await testScreen<AppServices>(TestScreen, async screen => {
      await screen.act("Track and go").run()
      expect(analytics.track).toHaveBeenCalledWith("click")
      expect(navigate).toHaveBeenCalledWith("home")
    }, { services: { analytics, navigate } })
  })

  it("resource.load() through harness passes services to loader", async () => {
    let received: unknown
    type TestServices = { route: string }
    const TestScreen = screen<TestServices>("HarnessResourceLoad", $ => {
      $.resource("team", {
        load: async (context) => {
          received = context
          return "data"
        },
        autoLoad: false,
      })
    })

    await testScreen<TestServices>(TestScreen, async screen => {
      await screen.resource("team").load()
      expect(received).toEqual({ route: "/teams/team_1" })
    }, { services: { route: "/teams/team_1" } })
  })

  it("resource.reload() through harness passes services to loader", async () => {
    let callCount = 0
    let received: unknown
    type TestServices = { route: string }
    const TestScreen = screen<TestServices>("HarnessResourceReload", $ => {
      $.resource("team", {
        load: async (context) => {
          callCount++
          received = context
          return `data${callCount}`
        },
        autoLoad: false,
      })
    })

    await testScreen<TestServices>(TestScreen, async screen => {
      await screen.resource("team").load()
      expect(received).toEqual({ route: "/teams/team_1" })
      expect(callCount).toBe(1)

      await screen.resource("team").reload()
      expect(received).toEqual({ route: "/teams/team_1" })
      expect(callCount).toBe(2)
    }, { services: { route: "/teams/team_1" } })
  })

  it("resource autoload on testScreen start receives services", async () => {
    let received: unknown
    type TestServices = { route: string }
    const TestScreen = screen<TestServices>("HarnessAutoloadServices", $ => {
      $.resource("team", {
        load: async (context) => {
          received = context
          return "data"
        },
      })
    })

    await testScreen<TestServices>(TestScreen, async screen => {
      expect(received).toEqual({ route: "/dashboard" })
      expect(screen.resource("team").status()).toBe("ready")
    }, { services: { route: "/dashboard" } })
  })
})
