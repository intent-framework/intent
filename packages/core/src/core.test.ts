import { describe, it, expect, vi } from "vitest"
import { screen, inspectScreen, isCondition, createScreenRuntime, type NavigationService, type ActionExecutionContext } from "./index.js"

async function loginUser(_params: { email: string; password: string }) {
  await Promise.resolve()
}

describe("screen", () => {
  it("creates a screen definition with all node types", () => {
    const LoginScreen = screen("Login", $ => {
      const email = $.state.text("email")
      const password = $.state.text("password")

      const emailAsk = $.ask("Email", email)
        .asContact("email")
        .required()
        .private()

      const passwordAsk = $.ask("Password", password)
        .asSecret()
        .required()
        .private()

      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid)
        .when(passwordAsk.valid)
        .does(async () => {
          await loginUser({ email: email.value, password: password.value })
        })
        .feedback({
          pending: "Logging in...",
          success: "Logged in.",
          failure: "Could not log in.",
        })

      $.flow("login")
        .startsWith(emailAsk)
        .then(passwordAsk)
        .then(login)

      $.surface("main")
        .contains(emailAsk, passwordAsk, login)
    })

    expect(LoginScreen.name).toBe("Login")
    expect(LoginScreen.asks).toHaveLength(2)
    expect(LoginScreen.acts).toHaveLength(1)
    expect(LoginScreen.flows).toHaveLength(1)
    expect(LoginScreen.surfaces).toHaveLength(1)
  })

  it("creates state with correct initial values", () => {
    screen("StateTest", $ => {
      const email = $.state.text("email")

      expect(email.value).toBe("")
      expect(email.valid.current).toBe(false)

      email.set("test@example.com")
      expect(email.value).toBe("test@example.com")
      expect(email.valid.current).toBe(true)

      email.clear()
      expect(email.value).toBe("")
      expect(email.valid.current).toBe(false)
    })
  })

  it("boolean state works correctly", () => {
    screen("BoolTest", $ => {
      const accepted = $.state.boolean("accepted", { initial: false })

      expect(accepted.value).toBe(false)
      expect(accepted.valid.current).toBe(true)

      accepted.set(true)
      expect(accepted.value).toBe(true)

      accepted.toggle()
      expect(accepted.value).toBe(false)
    })
  })

  it("choice state preserves literal types", () => {
    screen("ChoiceTest", $ => {
      const role = $.state.choice("role", {
        initial: "viewer",
        options: ["viewer", "editor", "admin"] as const,
      })

      expect(role.value).toBe("viewer")
      expect(role.options).toEqual(["viewer", "editor", "admin"])
      expect(role.valid.current).toBe(true)

      role.set("editor")
      expect(role.value).toBe("editor")

      expect(role.valid.current).toBe(true)
    })
  })
})

describe("condition", () => {
  it("email.valid is a reactive condition", () => {
    screen("ConditionTest", $ => {
      const email = $.state.text("email")

      expect(isCondition(email.valid)).toBe(true)
      expect(email.valid.current).toBe(false)

      email.set("a")
      expect(email.valid.current).toBe(true)

      email.clear()
      expect(email.valid.current).toBe(false)
    })
  })

  it("condition.current updates after state changes", () => {
    screen("ConditionUpdate", $ => {
      const email = $.state.text("email")

      email.set("test@example.com")
      expect(email.valid.current).toBe(true)

      email.clear()
      expect(email.valid.current).toBe(false)
    })
  })

  it("condition.subscribe notifies on value changes", () => {
    screen("ConditionSubscribe", $ => {
      const email = $.state.text("email")
      let notified = false

      const unsub = email.valid.subscribe(() => {
        notified = true
      })

      email.set("hello")
      expect(notified).toBe(true)

      unsub()
      notified = false
      email.clear()
      // after unsub, notifications stop
      expect(notified).toBe(false)
    })
  })

  it("boolean state has always-true condition", () => {
    screen("BoolCondition", $ => {
      const flag = $.state.boolean("flag", { initial: false })
      expect(flag.valid.current).toBe(true)
      flag.set(true)
      expect(flag.valid.current).toBe(true)
    })
  })
})

describe("type safety", () => {
  it("email.valid is a Condition object", () => {
    screen("TypeStateCondition", $ => {
      const email = $.state.text("email")
      expect(isCondition(email.valid)).toBe(true)
      // .current yields the boolean value
      expect(typeof email.valid.current).toBe("boolean")
    })
  })

  it("ask.valid is a Condition object", () => {
    screen("TypeAskCondition", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      expect(isCondition(emailAsk.valid)).toBe(true)
      expect(typeof emailAsk.valid.current).toBe("boolean")
    })
  })

  it("choice state accepts valid options and rejects invalid options at type level", () => {
    screen("TypeChoice", $ => {
      const role = $.state.choice("role", {
        initial: "viewer",
        options: ["viewer", "editor", "admin"] as const,
      })
      role.set("editor")
      expect(role.value).toBe("editor")
      // @ts-expect-error - invalid choice assignment must fail typechecking
      role.set("owner")
    })
  })
})

describe("ask", () => {
  it("requires required fields to be valid", () => {
    screen("AskValidation", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email)
        .asContact("email")
        .required()
        .private()

      expect(emailAsk.toNode().valid.current).toBe(false)
      expect(emailAsk.toNode().error).toBe("This field is required.")

      email.set("test@example.com")
      expect(emailAsk.toNode().valid.current).toBe(true)
      expect(emailAsk.toNode().error).toBeNull()
    })
  })

  it("supports custom validation", () => {
    screen("CustomValidation", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email)
        .validate(value => {
          if (!value.includes("@")) {
            return "Email must contain @."
          }
          return true
        })

      email.set("invalid")
      expect(emailAsk.toNode().valid.current).toBe(false)
      expect(emailAsk.toNode().error).toBe("Email must contain @.")

      email.set("valid@example.com")
      expect(emailAsk.toNode().valid.current).toBe(true)
    })
  })
})

describe("act", () => {
  it("is blocked when conditions are not met", () => {
    screen("ActBlocked", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid)

      expect(login.toNode().enabled.current).toBe(false)

      email.set("test@example.com")
      expect(login.toNode().enabled.current).toBe(true)
    })
  })

  it("re-evaluates when condition changes", () => {
    screen("ActReevaluate", $ => {
      const email = $.state.text("email")
      const password = $.state.text("password")
      const emailAsk = $.ask("Email", email).required()
      const passwordAsk = $.ask("Password", password).required()

      const login = $.act("Log in")
        .when(emailAsk.valid)
        .when(passwordAsk.valid)

      expect(login.toNode().enabled.current).toBe(false)

      email.set("a@b.com")
      expect(login.toNode().enabled.current).toBe(false) // password still empty

      password.set("secret")
      expect(login.toNode().enabled.current).toBe(true)

      email.clear()
      expect(login.toNode().enabled.current).toBe(false)
    })
  })

  it("tracks lifecycle states", async () => {
    let resolved = false
    const LoginScreen = screen("ActLifecycle", $ => {
      const login = $.act("Log in")
        .when(true)
        .does(async () => {
          await Promise.resolve()
          resolved = true
        })
        .feedback({
          pending: "Loading...",
          success: "Done.",
        })

      expect(login.toNode().status).toBe("idle")
    })

    const actNode = LoginScreen.acts[0]
    if (!actNode) throw new Error("no act node")
    await actNode.execute()
    expect(resolved).toBe(true)
    expect(actNode.status).toBe("success")
    expect(actNode.statusMessage).toBe("Done.")
  })

  it("exposes enabled via ActBuilder", () => {
    screen("BuilderEnabled", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      const login = $.act("Log in")
        .when(emailAsk.valid)

      expect(login.enabled.current).toBe(false)
      email.set("test@example.com")
      expect(login.enabled.current).toBe(true)
    })
  })

  it("caches enabled Condition on ActNode", () => {
    screen("CachedEnabled", $ => {
      const ask = $.ask("Email", $.state.text("email")).required()
      const login = $.act("Log in").when(ask.valid)

      const node = login.toNode()
      const first = node.enabled
      const second = node.enabled
      expect(first).toBe(second)
    })
  })

  it("act.enabled.subscribe fires on state change", () => {
    screen("EnabledSubscribe", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in").when(emailAsk.valid)

      const values: boolean[] = []
      const unsub = login.enabled.subscribe(() => {
        values.push(login.enabled.current)
      })

      expect(values).toEqual([])
      email.set("test@example.com")
      expect(values).toEqual([true])
      email.clear()
      expect(values).toEqual([true, false])
      unsub()
    })
  })

  it("caches valid Condition on AskNode", () => {
    screen("CachedValid", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      const node = emailAsk.toNode()
      const first = node.valid
      const second = node.valid
      expect(first).toBe(second)
    })
  })

  it("exposes blocked reasons from failing conditions", () => {
    screen("BlockedReasons", $ => {
      const email = $.state.text("email")
      const password = $.state.text("password")
      const emailAsk = $.ask("Email", email).required()
      const passwordAsk = $.ask("Password", password).required()

      const login = $.act("Log in")
        .when(emailAsk.valid, "Enter your email.")
        .when(passwordAsk.valid, "Enter your password.")

      const node = login.toNode()

      // Both conditions fail
      expect(node.blockedReasons).toEqual(["Enter your email.", "Enter your password."])

      // One condition passes
      email.set("test@example.com")
      expect(node.blockedReasons).toEqual(["Enter your password."])

      // Both conditions pass
      password.set("secret")
      expect(node.blockedReasons).toEqual([])
    })
  })

  it("excludes conditions without message from blocked reasons", () => {
    screen("BlockedReasonsNoMessage", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      const login = $.act("Log in")
        .when(emailAsk.valid)

      expect(login.toNode().blockedReasons).toEqual([])
    })
  })

  it("updates blocked reasons when conditions change", () => {
    screen("BlockedReasonsUpdate", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      const login = $.act("Log in")
        .when(emailAsk.valid, "Enter your email.")

      const node = login.toNode()
      expect(node.blockedReasons).toEqual(["Enter your email."])

      email.set("a@b.com")
      expect(node.blockedReasons).toEqual([])

      email.clear()
      expect(node.blockedReasons).toEqual(["Enter your email."])
    })
  })
})

describe("flow", () => {
  it("registers steps in order", () => {
    const LoginScreen = screen("FlowTest", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email)
      const login = $.act("Log in")

      $.flow("login")
        .startsWith(emailAsk)
        .then(login)
    })

    expect(LoginScreen.flows).toHaveLength(1)
    expect(LoginScreen.flows[0]?.steps).toHaveLength(2)
    expect(LoginScreen.flows[0]?.steps[0]?.type).toBe("ask")
    expect(LoginScreen.flows[0]?.steps[1]?.type).toBe("act")
  })
})

describe("graph inspection", () => {
  it("inspects all nodes", () => {
    const LoginScreen = screen("InspectTest", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in").primary()
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(LoginScreen)
    expect(inspected.name).toBe("InspectTest")
    expect(inspected.asks).toHaveLength(1)
    expect(inspected.acts).toHaveLength(1)
    expect(inspected.surfaces).toHaveLength(1)
    expect(inspected.surfaces[0]?.itemCount).toBe(2)
  })

  it("includes blocked reasons in inspected acts", () => {
    const EmailScreen = screen("InspectBlocked", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(EmailScreen)
    expect(inspected.acts[0]?.enabled).toBe(false)
    expect(inspected.acts[0]?.blockedReasons).toEqual(["Enter your email."])
  })
})

describe("resource", () => {
  it("registers resource in screen definition", () => {
    const TeamScreen = screen("TeamScreen", $ => {
      $.resource("team", {
        load: async () => ({ id: "team_1", name: "Intent Labs" }),
      })
    })

    expect(TeamScreen.resources).toHaveLength(1)
    expect(TeamScreen.resources[0]?.name).toBe("team")
  })

  it("starts in idle status", () => {
    screen("IdleTest", $ => {
      const team = $.resource("team", {
        load: async () => ({ id: "team_1", name: "Intent Labs" }),
      })

      expect(team.status).toBe("idle")
      expect(team.ready.current).toBe(false)
      expect(team.pending.current).toBe(false)
      expect(team.failed.current).toBe(false)
      expect(team.value).toBeUndefined()
      expect(team.error).toBeUndefined()
    })
  })

  it("transitions to ready on successful load", async () => {
    let loaded = false
    const TeamScreen = screen("LoadTest", $ => {
      $.resource("team", {
        load: async () => {
          loaded = true
          return { id: "team_1", name: "Intent Labs" }
        },
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    expect(resource.status).toBe("idle")
    await resource.load()
    expect(loaded).toBe(true)
    expect(resource.status).toBe("ready")
    expect(resource.value).toEqual({ id: "team_1", name: "Intent Labs" })
    expect(resource.error).toBeUndefined()
  })

  it("transitions to failed on load error", async () => {
    const TeamScreen = screen("FailTest", $ => {
      $.resource("team", {
        load: async () => {
          throw new Error("Network error")
        },
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    await resource.load()
    expect(resource.status).toBe("failed")
    expect(resource.value).toBeUndefined()
    expect(resource.error).toBeInstanceOf(Error)
    expect((resource.error as Error).message).toBe("Network error")
  })

  it("reload resets and re-fetches", async () => {
    let callCount = 0
    const TeamScreen = screen("ReloadTest", $ => {
      $.resource("team", {
        load: async () => {
          callCount++
          return { id: "team_1", name: `Load ${callCount}` }
        },
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    await resource.load()
    expect(callCount).toBe(1)
    expect(resource.value).toEqual({ id: "team_1", name: "Load 1" })

    await resource.reload()
    expect(callCount).toBe(2)
    expect(resource.value).toEqual({ id: "team_1", name: "Load 2" })
  })

  it("exposes ready/pending/failed conditions that update reactively", async () => {
    let resolveLoad!: (value: string) => void
    const loadPromise = new Promise<string>(resolve => {
      resolveLoad = resolve
    })

    const TeamScreen = screen("ConditionTest", $ => {
      $.resource("team", {
        load: async () => loadPromise,
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    expect(resource.ready.current).toBe(false)
    expect(resource.pending.current).toBe(false)
    expect(resource.failed.current).toBe(false)

    const loadDone = resource.load()
    expect(resource.status).toBe("pending")
    expect(resource.ready.current).toBe(false)
    expect(resource.pending.current).toBe(true)
    expect(resource.failed.current).toBe(false)

    resolveLoad("data")
    await loadDone

    expect(resource.status).toBe("ready")
    expect(resource.ready.current).toBe(true)
    expect(resource.pending.current).toBe(false)
    expect(resource.failed.current).toBe(false)
  })

  it("exposes failed condition when load errors", async () => {
    const TeamScreen = screen("FailedCondition", $ => {
      $.resource("team", {
        load: async () => {
          throw new Error("fail")
        },
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    await resource.load()
    expect(resource.failed.current).toBe(true)
    expect(resource.ready.current).toBe(false)
    expect(resource.pending.current).toBe(false)
  })

  it("caches condition identities", () => {
    screen("CachedConditions", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      expect(team.ready).toBe(team.ready)
      expect(team.pending).toBe(team.pending)
      expect(team.failed).toBe(team.failed)
    })
  })

  it("condition.subscribe notifies on status changes", async () => {
    let resolveLoad!: (value: string) => void
    const loadPromise = new Promise<string>(resolve => {
      resolveLoad = resolve
    })

    const TeamScreen = screen("SubscribeTest", $ => {
      $.resource("team", {
        load: async () => loadPromise,
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    const readyValues: boolean[] = []
    const unsubReady = resource.ready.subscribe(() => {
      readyValues.push(resource.ready.current)
    })

    const pendingValues: boolean[] = []
    const unsubPending = resource.pending.subscribe(() => {
      pendingValues.push(resource.pending.current)
    })

    expect(readyValues).toEqual([])
    expect(pendingValues).toEqual([])

    const loadDone = resource.load()
    // load() notifies synchronously when transitioning to pending
    expect(pendingValues).toEqual([true])
    expect(readyValues).toEqual([false])

    resolveLoad("data")
    await loadDone

    expect(readyValues).toEqual([false, true])
    expect(pendingValues).toEqual([true, false])

    unsubReady()
    unsubPending()
  })

  it("action can depend on resource ready condition", async () => {
    let resolveLoad!: (value: string) => void
    const loadPromise = new Promise<string>(resolve => {
      resolveLoad = resolve
    })

    const TeamScreen = screen("ActionResourceDep", $ => {
      const team = $.resource("team", {
        load: async () => loadPromise,
      })

      const invite = $.act("Send invite")
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(invite)
    })

    const actNode = TeamScreen.acts[0]
    const resource = TeamScreen.resources[0]
    if (!actNode || !resource) throw new Error("nodes not found")

    expect(actNode.enabled.current).toBe(false)
    expect(actNode.blockedReasons).toEqual(["Team must load first."])

    const loadDone = resource.load()
    // Still pending, not ready
    expect(actNode.enabled.current).toBe(false)

    resolveLoad("team_data")
    await loadDone

    expect(actNode.enabled.current).toBe(true)
    expect(actNode.blockedReasons).toEqual([])
  })

  it("action blocked reason clears after resource loads", async () => {
    const TeamScreen = screen("BlockedReasonClear", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      const invite = $.act("Send invite")
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(invite)
    })

    const actNode = TeamScreen.acts[0]
    const resource = TeamScreen.resources[0]
    if (!actNode || !resource) throw new Error("nodes not found")

    expect(actNode.blockedReasons).toEqual(["Team must load first."])

    await resource.load()

    expect(actNode.blockedReasons).toEqual([])
  })

  it("inspectScreen includes resource status", async () => {
    let resolveLoad!: (value: string) => void
    const loadPromise = new Promise<string>(resolve => {
      resolveLoad = resolve
    })

    const TeamScreen = screen("InspectResource", $ => {
      $.resource("team", {
        load: async () => loadPromise,
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    // Before load
    let inspected = inspectScreen(TeamScreen)
    expect(inspected.resources).toHaveLength(1)
    expect(inspected.resources[0]?.name).toBe("team")
    expect(inspected.resources[0]?.status).toBe("idle")
    expect(inspected.resources[0]?.hasValue).toBe(false)

    // After successful load
    const loadDone = resource.load()
    resolveLoad("data")
    await loadDone

    inspected = inspectScreen(TeamScreen)
    expect(inspected.resources[0]?.status).toBe("ready")
    expect(inspected.resources[0]?.hasValue).toBe(true)
    expect(inspected.resources[0]?.error).toBeUndefined()
  })

  it("inspectScreen includes error when resource failed", async () => {
    const TeamScreen = screen("InspectError", $ => {
      $.resource("team", {
        load: async () => {
          throw new Error("Fetch failed")
        },
      })
    })

    const resource = TeamScreen.resources[0]
    if (!resource) throw new Error("no resource node")

    await resource.load()

    const inspected = inspectScreen(TeamScreen)
    expect(inspected.resources[0]?.status).toBe("failed")
    expect(inspected.resources[0]?.hasValue).toBe(false)
    expect(inspected.resources[0]?.error).toBe("Fetch failed")
  })
})

describe("resource type inference", () => {
  it("infers value type from loader", () => {
    screen("TypeInference", $ => {
      const team = $.resource("team", {
        load: async () => ({ id: "team_1", name: "Intent Labs" }),
      })

      // Capture value to test type narrowing after guard
      const v = team.value
      if (v) {
        expect(v.id).toBe("team_1")
      } else {
        expect(v).toBeUndefined()
      }
    })
  })
})

describe("action execution context", () => {
  it("does(() => {...}) still works with no args", async () => {
    let called = false
    const TestScreen = screen("NoArgHandler", $ => {
      $.act("Test")
        .when(true)
        .does(() => {
          called = true
        })
    })

    const actNode = TestScreen.acts[0]!
    await actNode.execute()
    expect(called).toBe(true)
  })

  it("does((context) => {...}) receives context when provided", async () => {
    let received: unknown
    const TestScreen = screen("ContextHandler", $ => {
      $.act("Test")
        .when(true)
        .does((context) => {
          received = context
        })
    })

    const actNode = TestScreen.acts[0]!
    const context: ActionExecutionContext = { navigate: (_name: string) => {} }
    await actNode.execute(context)
    expect(received).toBe(context)
  })

  it("does(() => {...}) still works when execute is called with context", async () => {
    let called = false
    const TestScreen = screen("NoArgWithContext", $ => {
      $.act("Test")
        .when(true)
        .does(() => {
          called = true
        })
    })

    const actNode = TestScreen.acts[0]!
    const context: ActionExecutionContext = { navigate: (_name: string) => {} }
    await actNode.execute(context)
    expect(called).toBe(true)
  })

  it("runtime.getExecutionContext() returns navigate service when provided", () => {
    const navigate: NavigationService = (_name: string) => {}
    const TestScreen = screen("RuntimeContext", $ => {
      $.act("Test").when(true)
    })

    const runtime = createScreenRuntime(TestScreen, {
      services: { navigate },
    })

    const ctx = runtime.getExecutionContext()
    expect(ctx.navigate).toBe(navigate)
  })

  it("runtime.getExecutionContext() returns undefined navigate when not provided", () => {
    const TestScreen = screen("NoNavigate", $ => {
      $.act("Test").when(true)
    })

    const runtime = createScreenRuntime(TestScreen)
    const ctx = runtime.getExecutionContext()
    expect(ctx.navigate).toBeUndefined()
  })

  it("action can call navigate through execution context", async () => {
    const navigate: NavigationService = vi.fn() as unknown as NavigationService
    const TestScreen = screen("ActionNavigates", $ => {
      $.act("Go")
        .when(true)
        .does(({ navigate }) => {
          navigate?.("login")
        })
    })

    const actNode = TestScreen.acts[0]!
    await actNode.execute({ navigate })
    expect(navigate).toHaveBeenCalledWith("login")
  })

  it("no-arg does() handler ignores context", async () => {
    const TestScreen = screen("IgnoreContext", $ => {
      $.act("Test")
        .when(true)
        .does(async () => {
          await Promise.resolve()
        })
    })

    const actNode = TestScreen.acts[0]!
    const context: ActionExecutionContext = {}
    await actNode.execute(context)
    expect(actNode.status).toBe("success")
  })

  it("blocked action does not receive context", async () => {
    const navigate: NavigationService = vi.fn() as unknown as NavigationService
    let handlerCalled = false
    const TestScreen = screen("BlockedNoContext", $ => {
      $.act("Test")
        .when(false)
        .does(() => {
          handlerCalled = true
        })
    })

    const actNode = TestScreen.acts[0]!
    await actNode.execute({ navigate })
    expect(handlerCalled).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
  })

  it("failed action does not accidentally navigate after throwing", async () => {
    const navigate: NavigationService = vi.fn() as unknown as NavigationService
    const TestScreen = screen("FailNoNavigate", $ => {
      $.act("Test")
        .when(true)
        .does(() => {
          navigate?.("login")
          throw new Error("fail")
        })
        .feedback({ failure: "Failed." })
    })

    const actNode = TestScreen.acts[0]!
    await actNode.execute({ navigate })
    // navigate was called but action is in failure state
    expect(navigate).toHaveBeenCalledWith("login")
    expect(actNode.status).toBe("failure")
  })
})

describe("screen runtime", () => {
  it("creates a runtime from a screen definition", () => {
    const TestScreen = screen("RuntimeTest", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    expect(runtime.screen).toBe(TestScreen)
    expect(runtime.resources).toHaveLength(1)
    expect(runtime.graph.name).toBe("RuntimeTest")
  })

  it("start() auto-loads resources with autoLoad: true (default)", async () => {
    let loaded = false
    const TestScreen = screen("AutoLoadTest", $ => {
      $.resource("team", {
        load: async () => {
          loaded = true
          return "data"
        },
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    expect(loaded).toBe(false)
    expect(runtime.graph.resources[0]?.status).toBe("idle")

    await runtime.start()

    expect(loaded).toBe(true)
    expect(runtime.graph.resources[0]?.status).toBe("ready")
  })

  it("resources are not loaded during screen() definition", () => {
    let loaded = false
    screen("NoLoadDuringDef", $ => {
      $.resource("team", {
        load: async () => {
          loaded = true
          return "data"
        },
      })
    })

    expect(loaded).toBe(false)
  })

  it("autoLoad: false resources stay idle after start()", async () => {
    let loaded = false
    const TestScreen = screen("ManualLoadTest", $ => {
      $.resource("searchResults", {
        load: async () => {
          loaded = true
          return "results"
        },
        autoLoad: false,
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    expect(loaded).toBe(false)
    expect(runtime.graph.resources[0]?.status).toBe("idle")
  })

  it("failed auto-load sets failed status", async () => {
    const TestScreen = screen("FailedAutoLoad", $ => {
      $.resource("team", {
        load: async () => {
          throw new Error("Load failed")
        },
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    expect(runtime.graph.resources[0]?.status).toBe("failed")
    expect(runtime.graph.resources[0]?.error).toBe("Load failed")
  })

  it("resource conditions update action enabled state after auto-load", async () => {
    const TestScreen = screen("ResourceUpdatesAction", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      $.act("Save")
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(team as unknown as never)
    })

    const actNode = TestScreen.acts[0]!
    expect(actNode.enabled.current).toBe(false)
    expect(actNode.blockedReasons).toEqual(["Team must load first."])

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    expect(actNode.enabled.current).toBe(true)
    expect(actNode.blockedReasons).toEqual([])
  })

  it("start() does not duplicate load for already ready resources", async () => {
    let loadCount = 0
    const TestScreen = screen("NoDuplicateLoad", $ => {
      $.resource("team", {
        load: async () => {
          loadCount++
          return `data${loadCount}`
        },
      })
    })

    const resource = TestScreen.resources[0]!
    await resource.load()
    expect(loadCount).toBe(1)

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    // start() should not re-load already ready resources
    expect(loadCount).toBe(1)
  })

  it("start() guards against double invocation", async () => {
    let loadCount = 0
    const TestScreen = screen("DoubleStart", $ => {
      $.resource("team", {
        load: async () => {
          loadCount++
          await Promise.resolve()
          return "data"
        },
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()
    expect(loadCount).toBe(1)

    await runtime.start()
    expect(loadCount).toBe(1)
  })

  it("dispose() is callable and does not throw", () => {
    const TestScreen = screen("DisposeTest", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    expect(() => runtime.dispose()).not.toThrow()
  })

  it("dispose() can be called multiple times safely", () => {
    const TestScreen = screen("DoubleDispose", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    runtime.dispose()
    expect(() => runtime.dispose()).not.toThrow()
  })

  it("start() then dispose() does not throw", async () => {
    const TestScreen = screen("StartThenDispose", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()
    expect(() => runtime.dispose()).not.toThrow()
  })
})

describe("resource invalidation", () => {
  it("resource starts not stale", () => {
    screen("StaleInit", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      expect(team.status).toBe("idle")
      expect(team.stale.current).toBe(false)
    })
  })

  it("successful load clears stale", async () => {
    const TeamScreen = screen("LoadClearsStale", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    const resource = TeamScreen.resources[0]!
    expect(resource.stale.current).toBe(false)

    resource.invalidate()
    expect(resource.stale.current).toBe(true)

    await resource.load()
    expect(resource.status).toBe("ready")
    expect(resource.stale.current).toBe(false)
  })

  it("resource.invalidate() marks stale", () => {
    screen("MarkStale", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      expect(team.stale.current).toBe(false)
      team.invalidate()
      expect(team.stale.current).toBe(true)
    })
  })

  it("resource.stale is a cached stable Condition", () => {
    screen("CachedStale", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      expect(team.stale).toBe(team.stale)
    })
  })

  it("stale condition subscribers fire on invalidation", () => {
    screen("StaleSubscribe", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      const values: boolean[] = []
      const unsub = team.stale.subscribe(() => {
        values.push(team.stale.current)
      })

      expect(values).toEqual([])

      team.invalidate()
      expect(values).toEqual([true])

      // Second invalidation should not fire since already stale
      team.invalidate()
      expect(values).toEqual([true])

      unsub()
    })
  })

  it("action success invalidates one resource", async () => {
    const TestScreen = screen("InvalidatesOne", $ => {
      const team = $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })

      $.act("Save")
        .when(true)
        .does(async () => {})
        .invalidates(team)

      $.surface("main").contains(team as unknown as never)
    })

    const resource = TestScreen.resources[0]!
    const actNode = TestScreen.acts[0]!

    await resource.load()
    expect(resource.stale.current).toBe(false)

    await actNode.execute()
    expect(actNode.status).toBe("success")
    expect(resource.stale.current).toBe(true)
  })

  it("action success invalidates multiple resources", async () => {
    const TestScreen = screen("InvalidatesMultiple", $ => {
      const team = $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })

      const members = $.resource("members", {
        load: async () => ["a", "b"],
        autoLoad: false,
      })

      $.act("Save")
        .when(true)
        .does(async () => {})
        .invalidates(team, members)

      $.surface("main").contains(team as unknown as never, members as unknown as never)
    })

    const team = TestScreen.resources[0]!
    const members = TestScreen.resources[1]!
    const actNode = TestScreen.acts[0]!

    await team.load()
    await members.load()
    expect(team.stale.current).toBe(false)
    expect(members.stale.current).toBe(false)

    await actNode.execute()
    expect(team.stale.current).toBe(true)
    expect(members.stale.current).toBe(true)
  })

  it("blocked action does not invalidate resources", async () => {
    const TestScreen = screen("BlockedNoInvalidate", $ => {
      const team = $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })

      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      $.act("Save")
        .when(emailAsk.valid)
        .does(async () => {})
        .invalidates(team)

      $.surface("main").contains(team as unknown as never, emailAsk)
    })

    const resource = TestScreen.resources[0]!
    const actNode = TestScreen.acts[0]!

    await resource.load()
    expect(actNode.enabled.current).toBe(false)

    // Act is blocked, executing should do nothing
    await actNode.execute()
    expect(resource.stale.current).toBe(false)
  })

  it("failed action does not invalidate resources", async () => {
    const TestScreen = screen("FailNoInvalidate", $ => {
      const team = $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })

      $.act("Save")
        .when(true)
        .does(async () => {
          throw new Error("Save failed")
        })
        .invalidates(team)
        .feedback({ failure: "Save failed." })

      $.surface("main").contains(team as unknown as never)
    })

    const resource = TestScreen.resources[0]!
    const actNode = TestScreen.acts[0]!

    await resource.load()
    expect(resource.stale.current).toBe(false)

    await actNode.execute()
    expect(actNode.status).toBe("failure")
    expect(resource.stale.current).toBe(false)
  })

  it("graph inspection includes resource stale state", async () => {
    const TestScreen = screen("InspectStale", $ => {
      $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })
    })

    const resource = TestScreen.resources[0]!

    let inspected = inspectScreen(TestScreen)
    expect(inspected.resources[0]?.stale).toBe(false)

    resource.invalidate()
    inspected = inspectScreen(TestScreen)
    expect(inspected.resources[0]?.stale).toBe(true)

    await resource.load()
    inspected = inspectScreen(TestScreen)
    expect(inspected.resources[0]?.stale).toBe(false)
  })

  it("graph inspection includes action invalidates", () => {
    const TestScreen = screen("InspectInvalidates", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      $.act("Save")
        .when(true)
        .invalidates(team)

      $.surface("main").contains(team as unknown as never)
    })

    const inspected = inspectScreen(TestScreen)
    expect(inspected.acts[0]?.invalidates).toEqual(["team"])
  })

  it("reload clears stale after successful load", async () => {
    const TeamScreen = screen("ReloadClearsStale", $ => {
      $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })
    })

    const resource = TeamScreen.resources[0]!

    await resource.load()
    expect(resource.stale.current).toBe(false)

    resource.invalidate()
    expect(resource.stale.current).toBe(true)

    await resource.reload()
    expect(resource.stale.current).toBe(false)
  })
})

// Type-only test helpers — these are verified during pnpm typecheck
type _TypeTestAppServices = {
  analytics: { track(event: "login_clicked"): void }
  navigate: (name: "home" | "login") => void
}

screen<_TypeTestAppServices>("TypeTestScreen", $ => {
  $.act("Track")
    .when(true)
    .does(({ analytics }) => {
      analytics.track("login_clicked")
      // @ts-expect-error wrong event name
      analytics.track("wrong_event")
    })
})

{
  screen<_TypeTestAppServices>("UnknownAccess", $ => {
    $.act("Bad")
      .does((ctx) => {
        // @ts-expect-error unknown property
        ctx.unknownService
      })
  })
}

describe("generic runtime services", () => {
  type AppAnalytics = {
    track(event: string): void
  }

  type AppServices = {
    analytics: AppAnalytics
    navigate: (name: "home" | "login") => void
  }

  it("no-arg does() still compiles and runs", async () => {
    let called = false
    const TestScreen = screen("NoArgGeneric", $ => {
      $.act("Test")
        .when(true)
        .does(() => {
          called = true
        })
    })

    const actNode = TestScreen.acts[0]!
    await actNode.execute()
    expect(called).toBe(true)
  })

  it("does((context) => {...}) receives default services", async () => {
    let received: unknown
    const TestScreen = screen("DefaultContext", $ => {
      $.act("Test")
        .when(true)
        .does((context) => {
          received = context
        })
    })

    const actNode = TestScreen.acts[0]!
    const ctx = { navigate: (_name: string) => {} }
    await actNode.execute(ctx)
    expect(received).toBe(ctx)
  })

  it("custom screen services are visible in action context", async () => {
    let receivedAnalytics: unknown
    const TestScreen = screen<AppServices>("CustomServices", $ => {
      $.act("Track")
        .when(true)
        .does(({ analytics }) => {
          receivedAnalytics = analytics
        })
    })

    const actNode = TestScreen.acts[0]!
    const analytics: AppAnalytics = { track: vi.fn() }
    await actNode.execute({ analytics, navigate: (_name: "home" | "login") => {} })
    expect(receivedAnalytics).toBe(analytics)
  })

  it("custom service method types are enforced", async () => {
    const TestScreen = screen<AppServices>("EnforcedTypes", $ => {
      $.act("Track")
        .when(true)
        .does(({ analytics }) => {
          analytics.track("test_event")
        })
    })

    const actNode = TestScreen.acts[0]!
    const analytics: AppAnalytics = { track: vi.fn() }
    await actNode.execute({ analytics, navigate: (_name: "home" | "login") => {} })
    expect(analytics.track).toHaveBeenCalledWith("test_event")
  })

  it("runtime passes custom service to action", async () => {
    const analytics: AppAnalytics = { track: vi.fn() }
    const TestScreen = screen<AppServices>("RuntimeCustom", $ => {
      $.act("Track")
        .when(true)
        .does(({ analytics: a }) => {
          a.track("event")
        })
    })

    const runtime = createScreenRuntime<AppServices>(TestScreen, {
      services: { analytics, navigate: (_name: "home" | "login") => {} },
    })

    const ctx = runtime.getExecutionContext()
    const actNode = TestScreen.acts[0]!
    await actNode.execute(ctx)
    expect(analytics.track).toHaveBeenCalledWith("event")
  })

  it("runtime.getExecutionContext() returns typed services", () => {
    const analytics: AppAnalytics = { track: vi.fn() }
    const navigate: (name: "home" | "login") => void = vi.fn()
    const TestScreen = screen<AppServices>("TypedRuntimeContext", $ => {
      $.act("Test").when(true)
    })

    const runtime = createScreenRuntime<AppServices>(TestScreen, {
      services: { analytics, navigate },
    })

    const ctx = runtime.getExecutionContext()
    expect(ctx.analytics).toBe(analytics)
    expect(ctx.navigate).toBe(navigate)
  })
})
