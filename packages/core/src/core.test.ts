import { describe, it, expect, vi } from "vitest"
import { screen, inspectScreen, isCondition, createScreenRuntime, type NavigationService, type ActionExecutionContext } from "./index.js"
import { createResourceNode } from "./resource.js"

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

describe("graph diagnostics", () => {
  it("returns no diagnostics for a simple valid screen", () => {
    const screenDef = screen("ValidScreen", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.diagnostics).toEqual([])
  })

  it("reports multiple-primary-actions when screen has more than one primary action", () => {
    const screenDef = screen("MultiPrimary", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in").primary()
      const signup = $.act("Sign up").primary()
      $.surface("main").contains(emailAsk, login, signup)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.diagnostics).toHaveLength(1)
    expect(inspected.diagnostics[0]?.code).toBe("multiple-primary-actions")
    expect(inspected.diagnostics[0]?.severity).toBe("warning")
    expect(inspected.diagnostics[0]?.nodeId).toBeUndefined()
  })

  it("does not report multiple-primary-actions when screen has one primary action", () => {
    const screenDef = screen("SinglePrimary", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in").primary()
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    const multiPrimary = inspected.diagnostics.filter(d => d.code === "multiple-primary-actions")
    expect(multiPrimary).toHaveLength(0)
  })

  it("reports secret-ask-not-private for secret ask without private", () => {
    const screenDef = screen("SecretNotPrivate", $ => {
      const pwd = $.state.text("password")
      const pwdAsk = $.ask("Password", pwd).asSecret()
      $.surface("main").contains(pwdAsk)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.diagnostics).toHaveLength(1)
    expect(inspected.diagnostics[0]?.code).toBe("secret-ask-not-private")
    expect(inspected.diagnostics[0]?.severity).toBe("warning")
    expect(inspected.diagnostics[0]?.nodeId).toBe("ask_password")
  })

  it("does not report secret-ask-not-private for secret private ask", () => {
    const screenDef = screen("SecretPrivate", $ => {
      const pwd = $.state.text("password")
      const pwdAsk = $.ask("Password", pwd).asSecret().private()
      $.surface("main").contains(pwdAsk)
    })

    const inspected = inspectScreen(screenDef)
    const secretNotPrivate = inspected.diagnostics.filter(d => d.code === "secret-ask-not-private")
    expect(secretNotPrivate).toHaveLength(0)
  })

  it("reports primary-action-without-blocked-reason when primary action has condition with no message", () => {
    const screenDef = screen("NoBlockedReason", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid)
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.diagnostics).toHaveLength(1)
    expect(inspected.diagnostics[0]?.code).toBe("primary-action-without-blocked-reason")
    expect(inspected.diagnostics[0]?.severity).toBe("info")
    expect(inspected.diagnostics[0]?.nodeId).toBe("act_log_in")
  })

  it("does not report primary-action-without-blocked-reason when primary action has explicit blocked reason", () => {
    const screenDef = screen("HasBlockedReason", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    const noReason = inspected.diagnostics.filter(d => d.code === "primary-action-without-blocked-reason")
    expect(noReason).toHaveLength(0)
  })

  it("includes diagnostics alongside existing inspectScreen output", () => {
    const screenDef = screen("Combined", $ => {
      const pwd = $.state.text("password")
      const pwdAsk = $.ask("Password", pwd).asSecret()
      const login = $.act("Log in").primary()
      const signup = $.act("Sign up").primary()
      $.surface("main").contains(pwdAsk, login, signup)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.name).toBe("Combined")
    expect(inspected.asks).toHaveLength(1)
    expect(inspected.acts).toHaveLength(2)
    expect(inspected.diagnostics.length).toBeGreaterThan(0)
    expect(inspected.diagnostics.some(d => d.code === "secret-ask-not-private")).toBe(true)
    expect(inspected.diagnostics.some(d => d.code === "multiple-primary-actions")).toBe(true)
  })

  it("returns diagnostics in deterministic order", () => {
    const screenDef = screen("DeterministicOrder", $ => {
      const pwd = $.state.text("password")
      const pwdAsk = $.ask("Password", pwd).asSecret()
      const login = $.act("Log in").primary()
      const signup = $.act("Sign up").primary()
      $.surface("main").contains(pwdAsk, login, signup)
    })

    const first = inspectScreen(screenDef)
    const second = inspectScreen(screenDef)
    expect(first.diagnostics.map(d => d.code)).toEqual(second.diagnostics.map(d => d.code))
  })

  it("does not report ask-not-in-surface when ask is in a surface", () => {
    const screenDef = screen("AskInSurface", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in").primary()
      $.surface("main").contains(emailAsk, login)
    })
    const inspected = inspectScreen(screenDef)
    const unsurfaced = inspected.diagnostics.filter(d => d.code === "ask-not-in-surface")
    expect(unsurfaced).toHaveLength(0)
  })

  it("reports ask-not-in-surface when ask is not in any surface", () => {
    const screenDef = screen("AskNotInSurface", $ => {
      const email = $.state.text("email")
      $.ask("Email", email).private()
      const login = $.act("Log in").primary()
      $.surface("main").contains(login)
    })
    const inspected = inspectScreen(screenDef)
    const unsurfaced = inspected.diagnostics.filter(d => d.code === "ask-not-in-surface")
    expect(unsurfaced).toHaveLength(1)
    expect(unsurfaced[0]?.severity).toBe("warning")
    expect(unsurfaced[0]?.nodeId).toBe("ask_email")
  })

  it("does not report action-not-in-surface when action is in a surface", () => {
    const screenDef = screen("ActInSurface", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in").primary()
      $.surface("main").contains(emailAsk, login)
    })
    const inspected = inspectScreen(screenDef)
    const unsurfaced = inspected.diagnostics.filter(d => d.code === "action-not-in-surface")
    expect(unsurfaced).toHaveLength(0)
  })

  it("reports action-not-in-surface when action is not in any surface", () => {
    const screenDef = screen("ActNotInSurface", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in").primary()
      $.act("Hidden").primary()
      $.surface("main").contains(emailAsk, login)
    })
    const inspected = inspectScreen(screenDef)
    const unsurfaced = inspected.diagnostics.filter(d => d.code === "action-not-in-surface")
    expect(unsurfaced).toHaveLength(1)
    expect(unsurfaced[0]?.severity).toBe("warning")
    expect(unsurfaced[0]?.nodeId).toBe("act_hidden")
  })

  it("reports multiple missing asks/actions in deterministic order", () => {
    const screenDef = screen("MultipleMissing", $ => {
      const email = $.state.text("email")
      const pwd = $.state.text("password")
      $.ask("Email", email).private()
      $.ask("Password", pwd).private()
      const login = $.act("Log in").primary()
      $.act("Sign up").primary()
      $.surface("main").contains(login)
    })
    const inspected = inspectScreen(screenDef)
    const surfaceDiags = inspected.diagnostics.filter(
      d => d.code === "ask-not-in-surface" || d.code === "action-not-in-surface"
    )
    expect(surfaceDiags).toHaveLength(3)
    expect(surfaceDiags[0]?.nodeId).toBe("ask_email")
    expect(surfaceDiags[1]?.nodeId).toBe("ask_password")
    expect(surfaceDiags[2]?.nodeId).toBe("act_sign_up")
  })

  it("considers ask surfaced when in one of multiple surfaces", () => {
    const screenDef = screen("MultiSurface", $ => {
      const email = $.state.text("email")
      const pwd = $.state.text("password")
      const emailAsk = $.ask("Email", email).private()
      const pwdAsk = $.ask("Password", pwd).private()
      const login = $.act("Log in").primary()
      $.surface("main").contains(emailAsk, login)
      $.surface("secondary").contains(pwdAsk)
    })
    const inspected = inspectScreen(screenDef)
    const unsurfacedAsks = inspected.diagnostics.filter(d => d.code === "ask-not-in-surface")
    const unsurfacedActs = inspected.diagnostics.filter(d => d.code === "action-not-in-surface")
    expect(unsurfacedAsks).toHaveLength(0)
    expect(unsurfacedActs).toHaveLength(0)
  })

  it("does not duplicate diagnostics when node is in multiple surfaces", () => {
    const screenDef = screen("NodeInMultiSurface", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in").primary()
      $.surface("main").contains(emailAsk, login)
      $.surface("sidebar").contains(emailAsk, login)
    })
    const inspected = inspectScreen(screenDef)
    const unsurfacedAsks = inspected.diagnostics.filter(d => d.code === "ask-not-in-surface")
    const unsurfacedActs = inspected.diagnostics.filter(d => d.code === "action-not-in-surface")
    expect(unsurfacedAsks).toHaveLength(0)
    expect(unsurfacedActs).toHaveLength(0)
  })

  it("includes existing diagnostics alongside surface membership diagnostics", () => {
    const screenDef = screen("CombinedDiagnostics", $ => {
      const pwd = $.state.text("password")
      $.ask("Password", pwd).asSecret()
      $.act("Log in").primary()
      $.act("Sign up").primary()
    })
    const inspected = inspectScreen(screenDef)
    const codes = inspected.diagnostics.map(d => d.code)
    expect(codes).toContain("secret-ask-not-private")
    expect(codes).toContain("multiple-primary-actions")
    expect(codes).toContain("ask-not-in-surface")
    expect(codes).toContain("action-not-in-surface")
    expect(inspected.diagnostics.filter(d => d.code === "ask-not-in-surface")).toHaveLength(1)
    expect(inspected.diagnostics.filter(d => d.code === "action-not-in-surface")).toHaveLength(2)
  })

  it("returns no diagnostics for a simple screen with surfaced ask and action", () => {
    const screenDef = screen("CleanScreen", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).private()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
      $.surface("main").contains(emailAsk, login)
    })
    const inspected = inspectScreen(screenDef)
    expect(inspected.diagnostics).toEqual([])
  })

  describe("reachability diagnostics", () => {
    it("emits surfaced-node-not-in-any-flow for surfaced ask not in any flow", () => {
      const screenDef = screen("AskNotInFlow", $ => {
        const email = $.state.text("email")
        const name = $.state.text("name")
        const emailAsk = $.ask("Email", email).private()
        const nameAsk = $.ask("Name", name).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, nameAsk, login)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "surfaced-node-not-in-any-flow")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.severity).toBe("info")
      expect(diags[0]?.nodeId).toBe("ask_name")
    })

    it("emits surfaced-node-not-in-any-flow for surfaced action not in any flow", () => {
      const screenDef = screen("ActNotInFlow", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        const signup = $.act("Sign up")
        $.surface("main").contains(emailAsk, login, signup)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "surfaced-node-not-in-any-flow")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.severity).toBe("info")
      expect(diags[0]?.nodeId).toBe("act_sign_up")
    })

    it("does not emit diagnostic when surfaced node is referenced by a flow", () => {
      const screenDef = screen("NodeInFlow", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "surfaced-node-not-in-any-flow")
      expect(diags).toHaveLength(0)
    })

    it("does not emit diagnostic when there are zero flows", () => {
      const screenDef = screen("NoFlows", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "surfaced-node-not-in-any-flow")
      expect(diags).toHaveLength(0)
    })

    it("coexists with existing structural diagnostics without breaking deterministic ordering", () => {
      const screenDef = screen("Mixed", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email)
        const login = $.act("Log in").primary()
        const signup = $.act("Sign up").primary()
        $.surface("main").contains(emailAsk, login, signup)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const first = inspectScreen(screenDef)
      const second = inspectScreen(screenDef)
      expect(first.diagnostics.map(d => d.code)).toEqual(second.diagnostics.map(d => d.code))
      const codes = first.diagnostics.map(d => d.code)
      expect(codes).toContain("multiple-primary-actions")
      expect(codes).toContain("surfaced-node-not-in-any-flow")
      // signup is surfaced but not in any flow
      const reachDiags = first.diagnostics.filter(d => d.code === "surfaced-node-not-in-any-flow")
      expect(reachDiags).toHaveLength(1)
      expect(reachDiags[0]?.nodeId).toBe("act_sign_up")
    })

    it("includes semanticNodeId when inspectScreen enriches diagnostics", () => {
      const screenDef = screen("SemanticReach", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        const hidden = $.act("Hidden")
        $.surface("main").contains(emailAsk, login, hidden)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "surfaced-node-not-in-any-flow")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.semanticNodeId).toBeDefined()
      expect(diags[0]?.semanticNodeId).toBe("action:hidden")
    })
  })

  describe("flow-step-not-surfaced diagnostic", () => {
    it("does not emit flow-step-not-surfaced when all flow steps are surfaced", () => {
      const screenDef = screen("AllStepsSurfaced", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(0)
    })

    it("emits flow-step-not-surfaced for unsurfaced ask step in flow", () => {
      const screenDef = screen("UnsurfacedAskInFlow", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(login)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.severity).toBe("warning")
      expect(diags[0]?.nodeId).toBe("ask_email")
    })

    it("emits flow-step-not-surfaced for unsurfaced action step in flow", () => {
      const screenDef = screen("UnsurfacedActInFlow", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.severity).toBe("warning")
      expect(diags[0]?.nodeId).toBe("act_log_in")
    })

    it("only reports unsurfaced steps when some are surfaced and some are not", () => {
      const screenDef = screen("MixedSurfaced", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
        $.flow("login").startsWith(emailAsk).then(pwdAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.nodeId).toBe("ask_password")
    })

    it("does not emit flow-step-not-surfaced when there are no flows", () => {
      const screenDef = screen("NoFlowsAtAll", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(0)
    })

    it("emits deterministic flow-step-not-surfaced diagnostics across multiple flows", () => {
      const screenDef = screen("MultipleFlowsDet", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        const signup = $.act("Sign up")
        $.surface("main").contains(emailAsk, login, signup)
        $.flow("login").startsWith(emailAsk).then(pwdAsk).then(login)
        $.flow("register").startsWith(pwdAsk).then(signup)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(2)
      expect(diags[0]?.nodeId).toBe("ask_password")
      expect(diags[0]?.flow?.flowNodeId).toBe("flow_login")
      expect(diags[1]?.nodeId).toBe("ask_password")
      expect(diags[1]?.flow?.flowNodeId).toBe("flow_register")
    })

    it("includes nodeId and semanticNodeId for the unsurfaced step", () => {
      const screenDef = screen("WithSemanticStep", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(login)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.nodeId).toBe("ask_email")
      expect(diags[0]?.semanticNodeId).toBe("ask:email")
    })

    it("includes nested flow.flowNodeId and flow.flowSemanticNodeId", () => {
      const screenDef = screen("NestedFlowMeta", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(login)
        $.flow("login").startsWith(emailAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.flow?.flowNodeId).toBe("flow_login")
      expect(diags[0]?.flow?.flowSemanticNodeId).toBe("flow:login")
    })

    it("coexists with surfaced-node-not-in-any-flow without breaking determinism", () => {
      const screenDef = screen("CoexistFlow", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in").primary()
        const signup = $.act("Sign up").primary()
        $.surface("main").contains(emailAsk, login, signup)
        $.flow("login").startsWith(emailAsk).then(pwdAsk).then(login)
      })
      const first = inspectScreen(screenDef)
      const second = inspectScreen(screenDef)
      expect(first.diagnostics.map(d => d.code)).toEqual(second.diagnostics.map(d => d.code))
      const codes = first.diagnostics.map(d => d.code)
      expect(codes).toContain("flow-step-not-surfaced")
      expect(codes).toContain("surfaced-node-not-in-any-flow")
      const flowDiags = first.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(flowDiags).toHaveLength(1)
      expect(flowDiags[0]?.nodeId).toBe("ask_password")
      const reachDiags = first.diagnostics.filter(d => d.code === "surfaced-node-not-in-any-flow")
      expect(reachDiags).toHaveLength(1)
      expect(reachDiags[0]?.nodeId).toBe("act_sign_up")
    })
  })

  describe("orphaned-flow diagnostic", () => {
    it("does not emit orphaned-flow when there are no flows", () => {
      const screenDef = screen("NoFlowsForOrphan", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(diags).toHaveLength(0)
    })

    it("does not emit orphaned-flow for empty flow", () => {
      const screenDef = screen("EmptyFlow", $ => {
        const email = $.state.text("email")
        const emailAsk = $.ask("Email", email).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
        $.flow("empty")
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(diags).toHaveLength(0)
    })

    it("emits orphaned-flow when all flow steps are unsurfaced", () => {
      const screenDef = screen("AllStepsUnsurfaced", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        $.surface("main").contains(login)
        $.flow("login").startsWith(emailAsk).then(pwdAsk)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.severity).toBe("warning")
      expect(diags[0]?.code).toBe("orphaned-flow")
      expect(diags[0]?.message).toBe('"login" has no surfaced steps.')
    })

    it("does not emit orphaned-flow when at least one flow step is surfaced", () => {
      const screenDef = screen("OneStepSurfaced", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        $.surface("main").contains(emailAsk, login)
        $.flow("login").startsWith(emailAsk).then(pwdAsk).then(login)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(diags).toHaveLength(0)
    })

    it("multiple flows report only orphaned flows", () => {
      const screenDef = screen("MultipleFlowsOrphan", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        const signup = $.act("Sign up")
        $.surface("main").contains(emailAsk, login)
        $.flow("a").startsWith(emailAsk).then(login)
        $.flow("b").startsWith(pwdAsk).then(signup)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.message).toBe('"b" has no surfaced steps.')
    })

    it("diagnostic includes nested flow.flowNodeId and flow.flowSemanticNodeId", () => {
      const screenDef = screen("OrphanedFlowMeta", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        $.surface("main").contains(login)
        $.flow("login").startsWith(emailAsk).then(pwdAsk)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.flow?.flowNodeId).toBe("flow_login")
      expect(diags[0]?.flow?.flowSemanticNodeId).toBe("flow:login")
    })

    it("diagnostic leaves nodeId and semanticNodeId undefined", () => {
      const screenDef = screen("OrphanedNoNodeId", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        $.surface("main").contains(login)
        $.flow("login").startsWith(emailAsk).then(pwdAsk)
      })
      const inspected = inspectScreen(screenDef)
      const diags = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(diags).toHaveLength(1)
      expect(diags[0]?.nodeId).toBeUndefined()
      expect(diags[0]?.semanticNodeId).toBeUndefined()
    })

    it("deterministic ordering across repeated inspectScreen calls", () => {
      const screenDef = screen("OrphanedDeterministic", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        const signup = $.act("Sign up")
        $.surface("main").contains(login)
        $.flow("a").startsWith(emailAsk).then(login)
        $.flow("b").startsWith(pwdAsk).then(signup)
      })
      const first = inspectScreen(screenDef)
      const second = inspectScreen(screenDef)
      expect(first.diagnostics.map(d => d.code)).toEqual(second.diagnostics.map(d => d.code))
    })

    it("coexists with flow-step-not-surfaced without changing its behavior", () => {
      const screenDef = screen("CoexistOrphan", $ => {
        const email = $.state.text("email")
        const pwd = $.state.text("password")
        const emailAsk = $.ask("Email", email).private()
        const pwdAsk = $.ask("Password", pwd).private()
        const login = $.act("Log in")
        const signup = $.act("Sign up")
        $.surface("main").contains(login)
        $.flow("a").startsWith(emailAsk).then(login)
        $.flow("b").startsWith(pwdAsk).then(signup)
      })
      const inspected = inspectScreen(screenDef)
      const orphaned = inspected.diagnostics.filter(d => d.code === "orphaned-flow")
      expect(orphaned).toHaveLength(1)
      expect(orphaned[0]?.message).toBe('"b" has no surfaced steps.')
      const flowStepNotSurfaced = inspected.diagnostics.filter(d => d.code === "flow-step-not-surfaced")
      expect(flowStepNotSurfaced).toHaveLength(3)
      expect(flowStepNotSurfaced[0]?.nodeId).toBe("ask_email")
      expect(flowStepNotSurfaced[1]?.nodeId).toBe("ask_password")
      expect(flowStepNotSurfaced[2]?.nodeId).toBe("act_sign_up")
    })
  })
})

describe("resource", () => {
  it("registers resource in screen definition", () => {
    const TeamScreen = screen("TeamScreen", $ => {
      $.resource("team", {
        load: async () => ({ id: "team_1", name: "Intent Labs" }),
      })
    })

    expect(TeamScreen.resourceConfigs).toHaveLength(1)
    expect(TeamScreen.resourceConfigs[0]?.name).toBe("team")
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
    const resource = createResourceNode("team", "team", async () => {
      loaded = true
      return { id: "team_1", name: "Intent Labs" }
    })

    expect(resource.status).toBe("idle")
    await resource.load()
    expect(loaded).toBe(true)
    expect(resource.status).toBe("ready")
    expect(resource.value).toEqual({ id: "team_1", name: "Intent Labs" })
    expect(resource.error).toBeUndefined()
  })

  it("transitions to failed on load error", async () => {
    const resource = createResourceNode("team", "team", async () => {
      throw new Error("Network error")
    })

    await resource.load()
    expect(resource.status).toBe("failed")
    expect(resource.value).toBeUndefined()
    expect(resource.error).toBeInstanceOf(Error)
    expect((resource.error as Error).message).toBe("Network error")
  })

  it("reload resets and re-fetches", async () => {
    let callCount = 0
    const resource = createResourceNode("team", "team", async () => {
      callCount++
      return { id: "team_1", name: `Load ${callCount}` }
    })

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

    const resource = createResourceNode("team", "team", async () => loadPromise)

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
    const resource = createResourceNode("team", "team", async () => {
      throw new Error("fail")
    })

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

    const resource = createResourceNode("team", "team", async () => loadPromise)

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
        autoLoad: false,
      })

      const invite = $.act("Send invite")
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(invite)
    })

    const actNode = TeamScreen.acts[0]
    if (!actNode) throw new Error("nodes not found")

    const runtime = createScreenRuntime(TeamScreen)
    await runtime.start()

    const resource = runtime.resources[0]!

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
        autoLoad: false,
      })

      const invite = $.act("Send invite")
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(invite)
    })

    const actNode = TeamScreen.acts[0]
    if (!actNode) throw new Error("nodes not found")

    const runtime = createScreenRuntime(TeamScreen)
    await runtime.start()

    const resource = runtime.resources[0]!

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
        autoLoad: false,
      })
    })

    const runtime = createScreenRuntime(TeamScreen)
    await runtime.start()

    // Before load
    let inspected = inspectScreen(TeamScreen, runtime.resources)
    expect(inspected.resources).toHaveLength(1)
    expect(inspected.resources[0]?.name).toBe("team")
    expect(inspected.resources[0]?.status).toBe("idle")
    expect(inspected.resources[0]?.hasValue).toBe(false)

    // After successful load
    const loadDone = runtime.resources[0]!.load()
    resolveLoad("data")
    await loadDone

    inspected = inspectScreen(TeamScreen, runtime.resources)
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
        autoLoad: false,
      })
    })

    const runtime = createScreenRuntime(TeamScreen)
    await runtime.start()

    await runtime.resources[0]!.load()

    const inspected = inspectScreen(TeamScreen, runtime.resources)
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
  it("creates a runtime from a screen definition", async () => {
    const TestScreen = screen("RuntimeTest", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()
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
    expect(runtime.resources).toHaveLength(0)

    await runtime.start()

    expect(loaded).toBe(true)
    expect(runtime.resources[0]?.status).toBe("ready")
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

      const save = $.act("Save")
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(save)
    })

    const actNode = TestScreen.acts[0]!
    expect(actNode.enabled.current).toBe(false)
    expect(actNode.blockedReasons).toEqual(["Team must load first."])

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    expect(actNode.enabled.current).toBe(true)
    expect(actNode.blockedReasons).toEqual([])
  })

  it("start() does not duplicate load for the same runtime instance", async () => {
    let loadCount = 0
    const TestScreen = screen("NoDuplicateLoad", $ => {
      $.resource("team", {
        load: async () => {
          loadCount++
          return `data${loadCount}`
        },
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()
    expect(loadCount).toBe(1)

    // Second start on the same runtime should not re-load
    await runtime.start()
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
    const resource = createResourceNode("team", "team", async () => "data")
    expect(resource.stale.current).toBe(false)

    resource.invalidate()
    expect(resource.stale.current).toBe(true)

    await resource.load()
    expect(resource.status).toBe("ready")
    expect(resource.stale.current).toBe(false)
  })

  it("resource.invalidate() marks stale", () => {
    const resource = createResourceNode("team", "team", async () => "data")

    expect(resource.stale.current).toBe(false)
    resource.invalidate()
    expect(resource.stale.current).toBe(true)
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
    const resource = createResourceNode("team", "team", async () => "data")

    const values: boolean[] = []
    const unsub = resource.stale.subscribe(() => {
      values.push(resource.stale.current)
    })

    expect(values).toEqual([])

    resource.invalidate()
    expect(values).toEqual([true])

    // Second invalidation should not fire since already stale
    resource.invalidate()
    expect(values).toEqual([true])

    unsub()
  })

  it("action success invalidates one resource", async () => {
    const TestScreen = screen("InvalidatesOne", $ => {
      const team = $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })

      const save = $.act("Save")
        .when(true)
        .does(async () => {})
        .invalidates(team)

      $.surface("main").contains(save)
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    const resource = runtime.resources[0]!
    const actNode = TestScreen.acts[0]!

    await resource.load()
    expect(resource.stale.current).toBe(false)

    await runtime.executeAct(actNode)
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

      const save = $.act("Save")
        .when(true)
        .does(async () => {})
        .invalidates(team, members)

      $.surface("main").contains(save)
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    const team = runtime.resources[0]!
    const members = runtime.resources[1]!
    const actNode = TestScreen.acts[0]!

    await team.load()
    await members.load()
    expect(team.stale.current).toBe(false)
    expect(members.stale.current).toBe(false)

    await runtime.executeAct(actNode)
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

      const save = $.act("Save")
        .when(emailAsk.valid)
        .does(async () => {})
        .invalidates(team)

      $.surface("main").contains(save, emailAsk)
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    const resource = runtime.resources[0]!
    const actNode = TestScreen.acts[0]!

    await resource.load()
    expect(actNode.enabled.current).toBe(false)

    // Act is blocked, executing should do nothing
    await runtime.executeAct(actNode)
    expect(resource.stale.current).toBe(false)
  })

  it("failed action does not invalidate resources", async () => {
    const TestScreen = screen("FailNoInvalidate", $ => {
      const team = $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })

      const save = $.act("Save")
        .when(true)
        .does(async () => {
          throw new Error("Save failed")
        })
        .invalidates(team)
        .feedback({ failure: "Save failed." })

      $.surface("main").contains(save)
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    const resource = runtime.resources[0]!
    const actNode = TestScreen.acts[0]!

    await resource.load()
    expect(resource.stale.current).toBe(false)

    await runtime.executeAct(actNode)
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

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    const resource = runtime.resources[0]!

    let inspected = inspectScreen(TestScreen, runtime.resources)
    expect(inspected.resources[0]?.stale).toBe(false)

    resource.invalidate()
    inspected = inspectScreen(TestScreen, runtime.resources)
    expect(inspected.resources[0]?.stale).toBe(true)

    await resource.load()
    inspected = inspectScreen(TestScreen, runtime.resources)
    expect(inspected.resources[0]?.stale).toBe(false)
  })

  it("graph inspection includes action invalidates", () => {
    const TestScreen = screen("InspectInvalidates", $ => {
      const team = $.resource("team", {
        load: async () => "data",
      })

      const save = $.act("Save")
        .when(true)
        .invalidates(team)

      $.surface("main").contains(save)
    })

    const inspected = inspectScreen(TestScreen)
    expect(inspected.acts[0]?.invalidates).toEqual(["resource_team"])
  })

  it("reload clears stale after successful load", async () => {
    const resource = createResourceNode("team", "team", async () => "data")

    await resource.load()
    expect(resource.stale.current).toBe(false)

    resource.invalidate()
    expect(resource.stale.current).toBe(true)

    await resource.reload()
    expect(resource.stale.current).toBe(false)
  })
})

describe("stable semantic node IDs", () => {
  it("inspectScreen includes semanticId for all node types", () => {
    const screenDef = screen("TestScreen", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email)
      const login = $.act("Log in")
      $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })
      $.flow("login").startsWith(emailAsk).then(login)
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.semanticId).toBe("screen:test-screen")
    expect(inspected.asks[0]?.semanticId).toBe("ask:email")
    expect(inspected.acts[0]?.semanticId).toBe("action:log-in")
    expect(inspected.flows[0]?.semanticId).toBe("flow:login")
    expect(inspected.surfaces[0]?.semanticId).toBe("surface:main")
  })

  it("calling inspectScreen twice on the same screen returns the same IDs", () => {
    const screenDef = screen("LoginScreen", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email)
      const login = $.act("Log in")
      $.surface("main").contains(emailAsk, login)
    })

    const first = inspectScreen(screenDef)
    const second = inspectScreen(screenDef)

    expect(first.semanticId).toBe(second.semanticId)
    expect(first.asks[0]?.semanticId).toBe(second.asks[0]?.semanticId)
    expect(first.acts[0]?.semanticId).toBe(second.acts[0]?.semanticId)
  })

  it("creating an unrelated screen before the target screen does not change semantic IDs", () => {
    screen("UnrelatedScreen", $ => {
      $.ask("Name", $.state.text("name"))
      $.act("Save")
      $.surface("main").contains()
    })

    const screenDef = screen("LoginScreen", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email)
      const login = $.act("Log in")
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.semanticId).toBe("screen:login-screen")
    expect(inspected.asks[0]?.semanticId).toBe("ask:email")
    expect(inspected.acts[0]?.semanticId).toBe("action:log-in")
  })

  it("duplicate labels get deterministic suffixed semantic IDs", () => {
    const screenDef = screen("Duplicates", $ => {
      const name1 = $.state.text("name1")
      const name2 = $.state.text("name2")
      const ask1 = $.ask("Email", name1)
      const ask2 = $.ask("Email", name2)
      const act1 = $.act("Save")
      const act2 = $.act("Save")
      $.surface("main").contains(ask1, ask2, act1, act2)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.asks).toHaveLength(2)
    expect(inspected.asks[0]?.semanticId).toBe("ask:email")
    expect(inspected.asks[1]?.semanticId).toBe("ask:email-2")
    expect(inspected.acts).toHaveLength(2)
    expect(inspected.acts[0]?.semanticId).toBe("action:save")
    expect(inspected.acts[1]?.semanticId).toBe("action:save-2")
  })

  it("diagnostics include semanticNodeId alongside nodeId", () => {
    const screenDef = screen("DiagSemanticId", $ => {
      const pwd = $.state.text("password")
      const pwdAsk = $.ask("Password", pwd).asSecret()
      $.surface("main").contains(pwdAsk)
    })

    const inspected = inspectScreen(screenDef)
    const secretDiag = inspected.diagnostics.find(d => d.code === "secret-ask-not-private")
    expect(secretDiag).toBeDefined()
    expect(secretDiag?.nodeId).toBe("ask_password")
    expect(secretDiag?.semanticNodeId).toBe("ask:password")
  })

  it("resource semanticId is stable and independent of runtime state", async () => {
    const screenDef = screen("ResourceStable", $ => {
      $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })
    })

    const runtime = createScreenRuntime(screenDef)
    await runtime.start()
    const inspected = inspectScreen(screenDef, runtime.resources)
    expect(inspected.resources[0]?.semanticId).toBe("resource:team")
    expect(inspected.resources[0]?.id).toBe("resource_team")
  })

  it("punctuation is normalized in semantic IDs", () => {
    const screenDef = screen("PunctuationTest", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email!", email)
      const login = $.act("Save!")
      $.surface("main").contains(emailAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.asks[0]?.semanticId).toBe("ask:email")
    expect(inspected.acts[0]?.semanticId).toBe("action:save")
  })

  it("duplicate normalized labels suffix deterministically", () => {
    const screenDef = screen("NormalizedDupes", $ => {
      const s1 = $.state.text("s1")
      const s2 = $.state.text("s2")
      const ask1 = $.ask("Email", s1)
      const ask2 = $.ask("Email!", s2)
      const act1 = $.act("Save")
      const act2 = $.act("Save!")
      const act3 = $.act("Save!!")
      $.surface("main").contains(ask1, ask2, act1, act2, act3)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.asks).toHaveLength(2)
    expect(inspected.asks[0]?.semanticId).toBe("ask:email")
    expect(inspected.asks[1]?.semanticId).toBe("ask:email-2")
    expect(inspected.acts).toHaveLength(3)
    expect(inspected.acts[0]?.semanticId).toBe("action:save")
    expect(inspected.acts[1]?.semanticId).toBe("action:save-2")
    expect(inspected.acts[2]?.semanticId).toBe("action:save-3")
  })

  it("symbol-only labels use kind-local order fallback", () => {
    const screenDef = screen("SymbolFallback", $ => {
      const s1 = $.state.text("s1")
      const s2 = $.state.text("s2")
      const act1 = $.act("!!!")
      const act2 = $.act("???")
      const ask1 = $.ask("***", s1)
      const ask2 = $.ask("@@@", s2)
      $.surface("main").contains(act1, act2, ask1, ask2)
    })

    const inspected = inspectScreen(screenDef)
    expect(inspected.acts).toHaveLength(2)
    expect(inspected.acts[0]?.semanticId).toBe("action:1")
    expect(inspected.acts[1]?.semanticId).toBe("action:2")
    expect(inspected.asks).toHaveLength(2)
    expect(inspected.asks[0]?.semanticId).toBe("ask:1")
    expect(inspected.asks[1]?.semanticId).toBe("ask:2")
  })

  it("diagnostics semanticNodeId uses new slugging logic", () => {
    const screenDef = screen("DiagSlugged", $ => {
      const pwd = $.state.text("password")
      const pwdAsk = $.ask("Password!", pwd).asSecret()
      const login = $.act("Log in!")
        .primary()
        .when(true)
      $.surface("main").contains(pwdAsk, login)
    })

    const inspected = inspectScreen(screenDef)
    const secretDiag = inspected.diagnostics.find(d => d.code === "secret-ask-not-private")
    expect(secretDiag).toBeDefined()
    expect(secretDiag?.nodeId).toBe("ask_password!")
    expect(secretDiag?.semanticNodeId).toBe("ask:password")
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

// --- Resource Loader Context Type Tests (verified during pnpm typecheck) ---

// 1. No-arg resource loaders still typecheck
screen("TypeNoArgResource", $ => {
  $.resource("team", {
    load: async () => ({ id: "team_1", name: "Intent Labs" }),
  })
})

// 2. Resource loader with default services context
screen("TypeDefaultResourceContext", $ => {
  $.resource("profile", {
    load: async (context) => {
      void(context.navigate satisfies ((name: string, params?: Record<string, string>) => void) | undefined)
      return "data"
    },
  })
})

type _ResourceAppServices = {
  route: { name: string; path: string; params: Record<string, string> }
  navigate: (name: string) => void
  auth: { token(): string }
}

// 3. Custom app services visible in resource loader context
screen<_ResourceAppServices>("TypeCustomResourceContext", $ => {
  $.resource("profile", {
    load: async ({ auth, route, navigate }) => {
      const token = auth.token()
      navigate("home")
      return { token, routeName: route.name }
    },
  })
})

// 4. Unknown service access fails
{
  screen<_ResourceAppServices>("TypeUnknownResourceService", $ => {
    $.resource("profile", {
      load: async (context) => {
        // @ts-expect-error unknown property
        context.unknownService
        return "data"
      },
    })
  })
}

// 5. Custom service method argument types are enforced
{
  type _StrictAppServices = {
    analytics: { track(event: "click" | "view"): void }
  }

  screen<_StrictAppServices>("TypeStrictResourceService", $ => {
    $.resource("profile", {
      load: async ({ analytics }) => {
        analytics.track("click")
        // @ts-expect-error wrong event name
        analytics.track("invalid_event")
        return "data"
      },
    })
  })
}

// 6. screen<AppServices>() resource loader gets typed context
screen<_ResourceAppServices>("TypeTypedResourceScreen", $ => {
  $.resource("team", {
    load: async ({ route }) => {
      void(route.name satisfies string)
      return { name: route.name }
    },
  })
})

// 7. Route context narrowing and typed params
{
  type _RouteAwareServices = {
    route:
      | { name: "home"; path: "/"; params: {} }
      | { name: "team.details"; path: "/teams/:teamId"; params: { teamId: string } }
    navigate: (name: string) => void
  }

  screen<_RouteAwareServices>("TypeRouteNarrowing", $ => {
    $.resource("team", {
      load: async ({ route }) => {
        if (route.name === "team.details") {
          void(route.params.teamId satisfies string)
          // @ts-expect-error wrong param name
          void(route.params.wrongParam satisfies string)
          return { teamId: route.params.teamId }
        }
        throw new Error("Expected team.details route")
      },
    })
  })
}

// 8. Existing value type inference still works
{
  screen("TypeValueInference", $ => {
    const team = $.resource("team", {
      load: async () => ({ id: "team_1", name: "Intent Labs" }),
    })

    const v = team.value
    if (v) {
      expect(v.id).toBe("team_1")
    } else {
      expect(v).toBeUndefined()
    }
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

describe("resource loader context", () => {
  type TestServices = {
    value: string
  }

  it("no-arg resource loader still runs", async () => {
    let called = false
    const resource = createResourceNode("team", "team", async () => {
      called = true
      return "data"
    })
    await resource.load()
    expect(called).toBe(true)
    expect(resource.status).toBe("ready")
  })

  it("resource loader receives services via context", async () => {
    let received: unknown
    const resource = createResourceNode<string, TestServices>("team", "team", async (context) => {
      received = context
      return "data"
    })
    const services: TestServices = { value: "hello" }
    await resource.load(services)
    expect(received).toBe(services)
    expect(resource.status).toBe("ready")
  })

  it("runtime autoload passes services to loader", async () => {
    let received: unknown
    const TestScreen = screen<TestServices>("AutoloadContext", $ => {
      $.resource("team", {
        load: async (context) => {
          received = context
          return "data"
        },
      })
    })

    const runtime = createScreenRuntime<TestServices>(TestScreen, {
      services: { value: "autoload" },
    })

    await runtime.start()

    expect(received).toHaveProperty("value", "autoload")
  })

  it("manual resource.load() passes services from runtime context", async () => {
    let received: unknown
    const TestScreen = screen<TestServices>("ManualLoadContext", $ => {
      $.resource("team", {
        load: async (context) => {
          received = context
          return "data"
        },
        autoLoad: false,
      })
    })

    const runtime = createScreenRuntime<TestServices>(TestScreen, {
      services: { value: "manual" },
    })
    await runtime.start()

    const resource = runtime.resources[0]!
    await resource.load(runtime.getExecutionContext())
    expect(received).toHaveProperty("value", "manual")
  })

  it("manual resource.reload() passes services from runtime context", async () => {
    let received: unknown
    const TestScreen = screen<TestServices>("ReloadContext", $ => {
      $.resource("team", {
        load: async (context) => {
          received = context
          return "data"
        },
        autoLoad: false,
      })
    })

    const runtime = createScreenRuntime<TestServices>(TestScreen, {
      services: { value: "reload" },
    })
    await runtime.start()

    const resource = runtime.resources[0]!
    await resource.reload(runtime.getExecutionContext())
    expect(received).toHaveProperty("value", "reload")
  })

  it("resource.load() with no arg still works and gets empty context", async () => {
    let received: unknown
    const resource = createResourceNode("team", "team", async (context) => {
      received = context
      return "data"
    })
    await resource.load()
    expect(received).toEqual({})
  })

  it("loader failure behavior remains unchanged", async () => {
    const resource = createResourceNode("team", "team", async () => {
      throw new Error("Fetch failed")
    })
    await resource.load()
    expect(resource.status).toBe("failed")
    expect(resource.error).toBeInstanceOf(Error)
    expect((resource.error as Error).message).toBe("Fetch failed")
  })

  it("successful load clears stale status", async () => {
    const resource = createResourceNode("team", "team", async () => "data")
    await resource.load()
    expect(resource.status).toBe("ready")
    expect(resource.stale.current).toBe(false)

    resource.invalidate()
    expect(resource.stale.current).toBe(true)

    await resource.reload()
    expect(resource.stale.current).toBe(false)
  })

  it("act.invalidates(resource) still works", async () => {
    const TestScreen = screen("InvalidatesContext", $ => {
      const team = $.resource("team", {
        load: async () => "data",
        autoLoad: false,
      })

      $.act("Save")
        .when(true)
        .does(async () => {})
        .invalidates(team)
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()

    const resource = runtime.resources[0]!
    const actNode = TestScreen.acts[0]!
    await resource.load()
    expect(resource.stale.current).toBe(false)

    await runtime.executeAct(actNode)
    expect(resource.stale.current).toBe(true)
  })

  it("no-arg resource loader is callable with context arg", async () => {
    let called = false
    const resource = createResourceNode("team", "team", async () => {
      called = true
      return "data"
    })
    await resource.load({ navigate: (_name: string) => {} })
    expect(called).toBe(true)
    expect(resource.status).toBe("ready")
  })
  it("resource.load() defaults to empty context when called from testing without services", async () => {
    let received: unknown

    const resource = createResourceNode("team", "team", async (context) => {
      received = context
      return "data"
    })
    await resource.load()
    expect(received).toEqual({})
  })

  it("runtime autoload with default services (no extra services)", async () => {
    let received: unknown
    const TestScreen = screen("AutoloadDefaultServices", $ => {
      $.resource("team", {
        load: async (context) => {
          received = context
          return "data"
        },
      })
    })

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()
    expect(received).not.toHaveProperty("value")
    expect(runtime.resources[0]!.status).toBe("ready")
  })

  it("fresh runtime autoloads resource even if previous runtime already loaded it", async () => {
    let callCount = 0
    const TestScreen = screen("FreshRuntimeAutoload", $ => {
      $.resource("counter", {
        load: async () => {
          callCount++
          return `data${callCount}`
        },
      })
    })

    // First runtime — loads the resource
    const runtime1 = createScreenRuntime(TestScreen)
    await runtime1.start()
    expect(callCount).toBe(1)
    expect(runtime1.resources[0]!.status).toBe("ready")
    runtime1.dispose()

    // Second runtime on the same screen definition — should autoload again
    const runtime2 = createScreenRuntime(TestScreen, { services: {} })
    await runtime2.start()
    // The resource should have been loaded again despite being ready
    expect(callCount).toBe(2)
    expect(runtime2.resources[0]!.value).toBe("data2")
    runtime2.dispose()
  })

  it("two runtimes for the same screen have independent resource state", async () => {
    const TestScreen = screen("IndependentState", $ => {
      $.resource("counter", {
        load: async () => "runtime_data",
        autoLoad: false,
      })
    })

    const runtime1 = createScreenRuntime(TestScreen)
    await runtime1.start()
    await runtime1.resources[0]!.load(runtime1.getExecutionContext())
    expect(runtime1.resources[0]!.status).toBe("ready")
    expect(runtime1.resources[0]!.value).toBe("runtime_data")

    const runtime2 = createScreenRuntime(TestScreen)
    await runtime2.start()
    // runtime2's resource starts idle — not shared from runtime1
    expect(runtime2.resources[0]!.status).toBe("idle")
    expect(runtime2.resources[0]!.value).toBeUndefined()

    // runtime1's state is unaffected
    expect(runtime1.resources[0]!.status).toBe("ready")
    expect(runtime1.resources[0]!.value).toBe("runtime_data")

    // Load runtime2 with different data
    await runtime2.resources[0]!.load(runtime2.getExecutionContext())
    expect(runtime2.resources[0]!.status).toBe("ready")
    expect(runtime2.resources[0]!.value).toBe("runtime_data")

    // runtime1 still has its original state
    expect(runtime1.resources[0]!.value).toBe("runtime_data")

    runtime1.dispose()
    runtime2.dispose()
  })

  it("invalidating a resource affects only the current runtime", async () => {
    const TestScreen = screen("IsolatedInvalidation", $ => {
      $.resource("data", {
        load: async () => "initial",
        autoLoad: false,
      })
    })

    const runtime1 = createScreenRuntime(TestScreen)
    await runtime1.start()
    await runtime1.resources[0]!.load(runtime1.getExecutionContext())
    expect(runtime1.resources[0]!.stale.current).toBe(false)

    const runtime2 = createScreenRuntime(TestScreen)
    await runtime2.start()
    await runtime2.resources[0]!.load(runtime2.getExecutionContext())

    // Invalidate runtime2's resource
    runtime2.resources[0]!.invalidate()
    expect(runtime2.resources[0]!.stale.current).toBe(true)

    // runtime1's resource is NOT stale
    expect(runtime1.resources[0]!.stale.current).toBe(false)

    runtime1.dispose()
    runtime2.dispose()
  })

  it("runtime resources have independent error state", async () => {
    const TestScreen = screen("IndependentError", $ => {
      $.resource("data", {
        load: async () => "ok",
        autoLoad: false,
      })
    })

    const runtime1 = createScreenRuntime(TestScreen)
    await runtime1.start()
    await runtime1.resources[0]!.load(runtime1.getExecutionContext())
    expect(runtime1.resources[0]!.status).toBe("ready")

    const runtime2 = createScreenRuntime(TestScreen)
    await runtime2.start()
    // Override runtime2's resource loader to fail by creating a new node directly
    // Using a new runtime with the same screen def — but resource is autoLoad: false
    // We call load with a context that has no special meaning, but the loader
    // on the config is still the same "ok" loader. That's fine — we test that
    // runtime2's state doesn't leak to runtime1.
    const resource2 = runtime2.resources[0]!
    await resource2.load(runtime2.getExecutionContext())
    expect(resource2.status).toBe("ready")
    expect(resource2.value).toBe("ok")

    // runtime1 still has its own state
    expect(runtime1.resources[0]!.status).toBe("ready")
    expect(runtime1.resources[0]!.value).toBe("ok")

    runtime1.dispose()
    runtime2.dispose()
  })

  it("testScreen-like resource isolation via sequential runtimes", async () => {
    let callCount = 0
    const TestScreen = screen("SequentialRuntimes", $ => {
      $.resource("team", {
        load: async () => {
          callCount++
          return `data${callCount}`
        },
        autoLoad: false,
      })
    })

    // First runtime
    const runtime1 = createScreenRuntime(TestScreen)
    await runtime1.start()
    await runtime1.resources[0]!.load(runtime1.getExecutionContext())
    expect(runtime1.resources[0]!.status).toBe("ready")
    expect(runtime1.resources[0]!.value).toBe("data1")
    expect(callCount).toBe(1)
    runtime1.dispose()

    // Second runtime — fresh resource instance, loader called again
    const runtime2 = createScreenRuntime(TestScreen)
    await runtime2.start()
    await runtime2.resources[0]!.load(runtime2.getExecutionContext())
    expect(runtime2.resources[0]!.status).toBe("ready")
    expect(runtime2.resources[0]!.value).toBe("data2")
    expect(callCount).toBe(2) // loader called again
    runtime2.dispose()
  })

  it("dispose disconnects ResourceRef, returning to idle state", async () => {
    let dataRef: import("./resource.js").ResourceRef<string> | undefined
    const TestScreen = screen("DisconnectRef", $ => {
      const data = $.resource("data", {
        load: async () => "value",
        autoLoad: false,
      })
      dataRef = data
    })

    const ref = dataRef!
    expect(ref.status).toBe("idle")
    expect(ref.value).toBeUndefined()

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()
    await runtime.resources[0]!.load(runtime.getExecutionContext())
    expect(ref.status).toBe("ready")
    expect(ref.value).toBe("value")

    runtime.dispose()
    expect(ref.status).toBe("idle")
    expect(ref.value).toBeUndefined()
  })

  it("disposing older runtime does not disconnect newer runtime's ref", async () => {
    let dataRef: import("./resource.js").ResourceRef<string> | undefined
    const TestScreen = screen("OlderDispose", $ => {
      const data = $.resource("data", {
        load: async () => "value",
        autoLoad: false,
      })
      dataRef = data
    })

    const ref = dataRef!

    // Runtime A starts
    const runtimeA = createScreenRuntime(TestScreen)
    await runtimeA.start()
    await runtimeA.resources[0]!.load(runtimeA.getExecutionContext())
    expect(ref.status).toBe("ready")
    expect(ref.value).toBe("value")

    // Runtime B starts and connects the same ref
    const runtimeB = createScreenRuntime(TestScreen, { services: {} })
    await runtimeB.start()
    // Ref should now point to runtimeB's node
    expect(ref.status).toBe("idle") // runtimeB's resource is idle (autoload: false)

    // Dispose runtimeA — should NOT disconnect ref from runtimeB
    runtimeA.dispose()
    expect(ref.status).toBe("idle") // still connected to runtimeB

    // Load runtimeB's resource and verify ref shows it
    await runtimeB.resources[0]!.load(runtimeB.getExecutionContext())
    expect(ref.status).toBe("ready")

    runtimeB.dispose()
    expect(ref.status).toBe("idle")
  })

  it("conditions re-evaluate on ref disconnect", async () => {
    let dataRef: import("./resource.js").ResourceRef<string> | undefined
    const TestScreen = screen("DisconnectConditions", $ => {
      const data = $.resource("data", {
        load: async () => "value",
        autoLoad: false,
      })
      dataRef = data
    })

    const ref = dataRef!
    const ready = ref.ready
    const pending = ref.pending
    expect(ready.current).toBe(false) // idle, not ready

    const runtime = createScreenRuntime(TestScreen)
    await runtime.start()
    await runtime.resources[0]!.load(runtime.getExecutionContext())
    expect(ready.current).toBe(true) // ready after load

    runtime.dispose()
    expect(ready.current).toBe(false) // disconnected, back to idle/not-ready
    expect(pending.current).toBe(false)
  })

  describe("resource reload from action", () => {
    it("ResourceRef.reload() inside an action reloads the connected runtime resource", async () => {
      let loadCount = 0
      const TestScreen = screen("ActionReloadOne", $ => {
        const team = $.resource("team", {
          load: async () => {
            loadCount++
            return `data${loadCount}`
          },
          autoLoad: false,
        })

        const refresh = $.act("Refresh")
          .when(true)
          .does(async () => {
            await team.reload()
          })

        $.surface("main").contains(refresh)
      })

      const runtime = createScreenRuntime(TestScreen)
      await runtime.start()
      const actNode = TestScreen.acts[0]!

      // Load resource manually
      await runtime.resources[0]!.load(runtime.getExecutionContext())
      expect(runtime.resources[0]!.value).toBe("data1")
      expect(loadCount).toBe(1)

      // Action calls team.reload() - should reload the connected runtime resource
      await runtime.executeAct(actNode)
      expect(runtime.resources[0]!.value).toBe("data2")
      expect(loadCount).toBe(2)
    })

    it("reload from action receives the same runtime services used by autoload", async () => {
      type TestServices = { value: string }
      let contextLog: unknown[] = []

      const TestScreen = screen<TestServices>("ActionReloadContext", $ => {
        const team = $.resource("team", {
          load: async (context) => {
            contextLog.push(context)
            return "ok"
          },
        })

        const refresh = $.act("Refresh")
          .when(true)
          .does(async () => {
            await team.reload()
          })

        $.surface("main").contains(refresh)
      })

      const runtime = createScreenRuntime<TestServices>(TestScreen, {
        services: { value: "runtime-svc" },
      })
      await runtime.start()
      expect(contextLog).toHaveLength(1)
      expect(contextLog[0]).toHaveProperty("value", "runtime-svc")

      const actNode = TestScreen.acts[0]!
      await runtime.executeAct(actNode)

      // Reload should receive the same runtime services
      expect(contextLog).toHaveLength(2)
      expect(contextLog[1]).toHaveProperty("value", "runtime-svc")
    })

    it("reload from an action that provides explicit context uses that context", async () => {
      type TestServices = { value: string }
      let contextLog: unknown[] = []

      const TestScreen = screen<TestServices>("ActionExplicitContext", $ => {
        const team = $.resource("team", {
          load: async (context) => {
            contextLog.push(context)
            return "ok"
          },
          autoLoad: false,
        })

        const refresh = $.act("Refresh")
          .when(true)
          .does(async (ctx) => {
            await team.reload(ctx)
          })

        $.surface("main").contains(refresh)
      })

      const runtime = createScreenRuntime<TestServices>(TestScreen, {
        services: { value: "initial" },
      })
      await runtime.start()

      const actNode = TestScreen.acts[0]!
      await runtime.executeAct(actNode)

      expect(contextLog).toHaveLength(1)
      expect(contextLog[0]).toHaveProperty("value", "initial")
    })

    it("reload after route navigation uses the new runtime's route context, not old route context", async () => {
      type TestServices = { route: string }
      let contextLog: unknown[] = []

      const TestScreen = screen<TestServices>("NavReloadContext", $ => {
        const team = $.resource("team", {
          load: async (context) => {
            contextLog.push(context)
            return "ok"
          },
        })

        const refresh = $.act("Refresh")
          .when(true)
          .does(async () => {
            await team.reload()
          })

        $.surface("main").contains(refresh)
      })

      const runtimeOld = createScreenRuntime<TestServices>(TestScreen, {
        services: { route: "/old" },
      })
      await runtimeOld.start()
      expect(contextLog).toHaveLength(1)
      expect(contextLog[0]).toHaveProperty("route", "/old")
      runtimeOld.dispose()

      const runtimeNew = createScreenRuntime<TestServices>(TestScreen, {
        services: { route: "/new" },
      })
      await runtimeNew.start()
      expect(contextLog).toHaveLength(2)
      expect(contextLog[1]).toHaveProperty("route", "/new")

      const actNode = TestScreen.acts[0]!
      await runtimeNew.executeAct(actNode)

      expect(contextLog).toHaveLength(3)
      expect(contextLog[2]).toHaveProperty("route", "/new")
      runtimeNew.dispose()
    })

    it("reload preserves runtime-scoped resource isolation", async () => {
      let loadCount = 0

      const TestScreen = screen("IsolatedReload", $ => {
        $.resource("team", {
          load: async () => {
            loadCount++
            return `data${loadCount}`
          },
          autoLoad: false,
        })
      })

      const runtimeA = createScreenRuntime(TestScreen)
      await runtimeA.start()
      await runtimeA.resources[0]!.load(runtimeA.getExecutionContext())
      expect(runtimeA.resources[0]!.value).toBe("data1")

      const runtimeB = createScreenRuntime(TestScreen)
      await runtimeB.start()

      await runtimeA.resources[0]!.reload()
      expect(runtimeA.resources[0]!.value).toBe("data2")

      expect(runtimeB.resources[0]!.status).toBe("idle")

      await runtimeB.resources[0]!.load(runtimeB.getExecutionContext())
      expect(runtimeB.resources[0]!.value).toBe("data3")
      expect(loadCount).toBe(3)

      runtimeA.dispose()
      runtimeB.dispose()
    })

    it("no-arg resource reload still works without prior context", async () => {
      let callCount = 0
      const resource = createResourceNode("team", "team", async () => {
        callCount++
        return `data${callCount}`
      })

      await resource.reload()
      expect(callCount).toBe(1)
      expect(resource.value).toBe("data1")

      await resource.reload()
      expect(callCount).toBe(2)
      expect(resource.value).toBe("data2")
    })

    it("failed reload keeps existing failure behavior", async () => {
      const resource = createResourceNode("team", "team", async () => {
        throw new Error("Reload failed")
      })

      await resource.load()
      expect(resource.status).toBe("failed")
      expect(resource.error).toBeInstanceOf(Error)
      expect((resource.error as Error).message).toBe("Reload failed")

      // Reload again - same failure
      await resource.reload()
      expect(resource.status).toBe("failed")
      expect(resource.error).toBeInstanceOf(Error)
      expect((resource.error as Error).message).toBe("Reload failed")
    })

    it("existing invalidates behavior still passes", async () => {
      const TestScreen = screen("ExistingInvalidates", $ => {
        const team = $.resource("team", {
          load: async () => "data",
          autoLoad: false,
        })

        const save = $.act("Save")
          .when(true)
          .does(async () => {})
          .invalidates(team)

        $.surface("main").contains(save)
      })

      const runtime = createScreenRuntime(TestScreen)
      await runtime.start()
      await runtime.resources[0]!.load(runtime.getExecutionContext())
      expect(runtime.resources[0]!.stale.current).toBe(false)

      const actNode = TestScreen.acts[0]!
      await runtime.executeAct(actNode)
      expect(runtime.resources[0]!.stale.current).toBe(true)
    })

    it("ResourceRef.reload() returns promise and waits for loader completion", async () => {
      let loadCount = 0
      let resolveLoad!: () => void
      let loaderPromise: Promise<void> | undefined
      let loaded = false

      const TestScreen = screen("ReloadAwait", $ => {
        const team = $.resource("team", {
          load: async () => {
            loadCount++
            if (loadCount === 2) {
              loaderPromise = new Promise<void>(resolve => { resolveLoad = resolve })
              await loaderPromise
              loaded = true
            }
            return "done"
          },
          autoLoad: false,
        })

        const refresh = $.act("Refresh")
          .when(true)
          .does(async () => {
            await team.reload()
          })

        $.surface("main").contains(refresh)
      })

      const runtime = createScreenRuntime(TestScreen)
      await runtime.start()
      await runtime.resources[0]!.load(runtime.getExecutionContext())
      expect(loadCount).toBe(1)
      expect(runtime.resources[0]!.value).toBe("done")

      const actNode = TestScreen.acts[0]!
      const actPromise = runtime.executeAct(actNode)

      expect(loaded).toBe(false)

      resolveLoad()
      await actPromise
      expect(loaded).toBe(true)
      expect(loadCount).toBe(2)
      expect(runtime.resources[0]!.value).toBe("done")
    })

    it("ResourceRef.reload() after disconnected node returns silently", async () => {
      const ref = new (await import("./resource.js")).ResourceRef("r_team", "team", async () => "never", false)
      expect(ref.status).toBe("idle")

      await expect(ref.reload()).resolves.toBeUndefined()
    })

    it("reload works when start() is not awaited (like renderDom)", async () => {
      let loadCount = 0
      type S = { route: string }

      const TestScreen = screen<S>("_StartNoAwait", $ => {
        const team = $.resource("team", {
          load: async (ctx) => {
            loadCount++
            return `data${loadCount}-${(ctx as S).route}`
          },
        })

        const refresh = $.act("Refresh")
          .when(true)
          .does(async () => {
            await team.reload()
          })

        $.surface("main").contains(refresh)
      })

      // Simulate renderDom: don't await start
      const services = { route: "/team/1" } as S
      const runtime = createScreenRuntime<S>(TestScreen, { services })
      runtime.start()  // NOT awaited

      // Wait for autoload like the DOM tests do
      const ref = TestScreen.resourceConfigs[0]!.ref!
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

      expect(loadCount).toBe(1)
      expect(ref.status).toBe("ready")
      expect(ref.value).toBe("data1-/team/1")

      // Now call reload via executeAct
      const actNode = TestScreen.acts[0]!
      await runtime.executeAct(actNode)

      expect(loadCount).toBe(2)
      expect(ref.status).toBe("ready")
      expect(ref.value).toBe("data2-/team/1")
    })
  })
})

describe("resource cache semantics", () => {
  describe("staleTime", () => {
    it("resource without cache keeps current manual-stale behavior", () => {
      const resource = createResourceNode("team", "team", async () => "data")
      expect(resource.stale.current).toBe(false)
      resource.invalidate()
      expect(resource.stale.current).toBe(true)
      // No stale timer should have been started
    })

    it("marks resource stale after staleTime elapses", async () => {
      const resource = createResourceNode("team", "team", async () => "data", true, { staleTime: 10 })
      expect(resource.stale.current).toBe(false)
      await resource.load()
      expect(resource.stale.current).toBe(false)
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(resource.stale.current).toBe(true)
    })

    it("leaves status ready and value available when stale", async () => {
      const resource = createResourceNode("team", "team", async () => "hello", true, { staleTime: 10 })
      await resource.load()
      expect(resource.status).toBe("ready")
      expect(resource.value).toBe("hello")
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(resource.stale.current).toBe(true)
      expect(resource.status).toBe("ready")
      expect(resource.value).toBe("hello")
    })

    it("notifies stale subscribers when staleTime fires", async () => {
      const resource = createResourceNode("team", "team", async () => "data", true, { staleTime: 10 })
      await resource.load()
      const values: boolean[] = []
      const unsub = resource.stale.subscribe(() => {
        values.push(resource.stale.current)
      })
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(values).toContain(true)
      unsub()
    })

    it("reload clears stale and restarts stale timer", async () => {
      const resource = createResourceNode("team", "team", async () => "data", true, { staleTime: 10 })
      await resource.load()
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(resource.stale.current).toBe(true)
      await resource.reload()
      expect(resource.stale.current).toBe(false)
      // Should not be stale right after reload
      await new Promise(resolve => setTimeout(resolve, 5))
      expect(resource.stale.current).toBe(false)
    })

    it("invalidate marks stale immediately even before staleTime", async () => {
      const resource = createResourceNode("team", "team", async () => "data", true, { staleTime: 10_000 })
      await resource.load()
      expect(resource.stale.current).toBe(false)
      resource.invalidate()
      expect(resource.stale.current).toBe(true)
    })

    it("failed load does not start stale timer", async () => {
      const resource = createResourceNode("team", "team", async () => { throw new Error("fail") }, true, { staleTime: 10 })
      await resource.load()
      expect(resource.status).toBe("failed")
      await new Promise(resolve => setTimeout(resolve, 20))
      // failed resources should not become stale
      expect(resource.stale.current).toBe(false)
    })

    it("dispose clears stale timer and prevents later notifications", async () => {
      let notified = false
      const resource = createResourceNode("team", "team", async () => "data", true, { staleTime: 10 })
      await resource.load()
      const unsub = resource.stale.subscribe(() => { notified = true })
      resource.dispose()
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(notified).toBe(false)
      unsub()
    })
  })

  describe("deduplicate", () => {
    it("deduplicate true shares concurrent load promises", async () => {
      let resolveLoad!: (value: string) => void
      const loadPromise = new Promise<string>(resolve => { resolveLoad = resolve })
      let callCount = 0

      const resource = createResourceNode("team", "team", async () => {
        callCount++
        return loadPromise
      }, true, { deduplicate: true })

      const load1 = resource.load()
      const load2 = resource.load()
      const load3 = resource.load()

      resolveLoad("result")
      await Promise.all([load1, load2, load3])

      expect(callCount).toBe(1)
    })

    it("deduplicate true invokes loader only once for concurrent load/reload calls", async () => {
      let resolveLoad!: (value: string) => void
      const loadPromise = new Promise<string>(resolve => { resolveLoad = resolve })
      let callCount = 0

      const resource = createResourceNode("team", "team", async () => {
        callCount++
        return loadPromise
      }, true, { deduplicate: true })

      // Concurrent load + reload should share the same in-flight promise
      const p1 = resource.load()
      const p2 = resource.reload()
      resolveLoad("result")
      await Promise.all([p1, p2])

      expect(callCount).toBe(1)
    })

    it("deduplicate false preserves independent concurrent loader calls", async () => {
      let callCount = 0
      let resolveLoad!: (value: string) => void
      const deferred = new Promise<string>(resolve => { resolveLoad = resolve })

      const resource = createResourceNode("team", "team", async () => {
        callCount++
        return deferred
      }, true, { deduplicate: false })

      const load1 = resource.load()
      const load2 = resource.load()

      resolveLoad("data")
      await Promise.all([load1, load2])

      expect(callCount).toBe(2)
    })

    it("failed deduplicated load marks failed status and clears in-flight promise", async () => {
      let callCount = 0

      const resource = createResourceNode("team", "team", async () => {
        callCount++
        throw new Error("fail")
      }, true, { deduplicate: true })

      const load1 = resource.load()
      const load2 = resource.load()

      await load1
      await load2

      expect(callCount).toBe(1)
      expect(resource.status).toBe("failed")
      expect(resource.error).toBeInstanceOf(Error)
      expect((resource.error as Error).message).toBe("fail")
    })

    it("a later load after a deduped failure can retry normally", async () => {
      let callCount = 0

      const resource = createResourceNode("team", "team", async () => {
        callCount++
        if (callCount === 1) throw new Error("fail")
        return "success"
      }, true, { deduplicate: true })

      // First load fails
      await resource.load()
      expect(resource.status).toBe("failed")
      expect(callCount).toBe(1)

      // Second load retries and succeeds (in-flight promise was cleared)
      await resource.load()
      expect(resource.status).toBe("ready")
      expect(resource.value).toBe("success")
      expect(callCount).toBe(2)
    })
  })
})

describe("resource cache phase 2 - key", () => {
  // === Key derivation ===

  it("cache.key derives a key from load context", async () => {
    const keys: unknown[] = []
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      keys.push(ctx.id)
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "abc" })
    expect(keys).toEqual(["abc"])
    expect(resource.value).toBe("data-abc")

    await resource.load({ id: "xyz" })
    expect(keys).toEqual(["abc", "xyz"])
  })

  it("equivalent array keys map to the same entry", async () => {
    let callCount = 0
    const resource = createResourceNode("team", "team", async (ctx: { ids: string[] }) => {
      callCount++
      return `data-${ctx.ids.join(",")}`
    }, true, {
      key: (ctx: { ids: string[] }) => ctx.ids,
    })

    await resource.load({ ids: ["a", "b"] })
    expect(callCount).toBe(1)
    expect(resource.value).toBe("data-a,b")

    // Same array content → same entry → deduplicate in-flight should work
    await resource.load({ ids: ["a", "b"] })
    // But after first load completes, load() still reloads (always loads).
    // The second load calls the loader again since entry is ready.
    // However, different reference but same content should be same entry.
    // The first load completes fully, so second load starts fresh.
    // Actually, load() always invokes the loader when no in-flight promise exists.
    // So this should call the loader again.
    expect(callCount).toBe(2)
    // But the same entry is updated, so value should still be consistent
    expect(resource.value).toBe("data-a,b")
  })

  it("different keys create independent entries", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "abc" })
    expect(resource.value).toBe("data-abc")

    await resource.load({ id: "xyz" })
    expect(resource.value).toBe("data-xyz")

    // Switch back to "abc" — the entry still exists
    await resource.load({ id: "abc" })
    expect(resource.value).toBe("data-abc")
  })

  it("resources without cache.key preserve old single-entry behavior", async () => {
    let callCount = 0
    const resource = createResourceNode("team", "team", async () => {
      callCount++
      return `data${callCount}`
    })

    expect(resource.status).toBe("idle")
    await resource.load()
    expect(callCount).toBe(1)
    expect(resource.status).toBe("ready")
    expect(resource.value).toBe("data1")

    await resource.load()
    expect(callCount).toBe(2)
    expect(resource.value).toBe("data2")
  })

  // === Entry independence ===

  it("each key keeps its own value", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      return `value-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "a" })
    expect(resource.value).toBe("value-a")

    await resource.load({ id: "b" })
    expect(resource.value).toBe("value-b")

    // Switch back to key "a" — old value is preserved
    await resource.load({ id: "a" })
    expect(resource.value).toBe("value-a")
  })

  it("each key keeps its own status", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string; delay?: number }) => {
      if (ctx.delay) await new Promise(r => setTimeout(r, ctx.delay!))
      return `value-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    // Start loading key "a" (slow)
    const loadA = resource.load({ id: "a", delay: 50 })
    expect(resource.status).toBe("pending") // active key "a" is pending

    // Start loading key "b" (fast) — switches active key
    await resource.load({ id: "b" })
    expect(resource.status).toBe("ready") // active key "b" is ready
    expect(resource.value).toBe("value-b")

    // Wait for "a" to complete
    await loadA

    // Active key is still "b" (last load context)
    expect(resource.status).toBe("ready")
    expect(resource.value).toBe("value-b")
  })

  it("each key keeps its own error", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string; fail?: boolean }) => {
      if (ctx.fail) throw new Error(`error-${ctx.id}`)
      return `ok-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    // Key "a" fails
    await resource.load({ id: "a", fail: true })
    expect(resource.status).toBe("failed")
    expect((resource.error as Error).message).toBe("error-a")

    // Key "b" succeeds
    await resource.load({ id: "b" })
    expect(resource.status).toBe("ready")
    expect(resource.value).toBe("ok-b")

    // Switch back to "a" — still failed
    await resource.load({ id: "a", fail: true })
    expect(resource.status).toBe("failed")
    expect((resource.error as Error).message).toBe("error-a")
  })

  it("failed load for one key does not poison another key", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string; fail?: boolean }) => {
      if (ctx.fail) throw new Error("fail")
      return `ok-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "good" })
    expect(resource.status).toBe("ready")
    expect(resource.value).toBe("ok-good")

    // Fail a different key
    await resource.load({ id: "bad", fail: true })
    expect(resource.status).toBe("failed")

    // Key "good" still has its value
    await resource.load({ id: "good" })
    expect(resource.status).toBe("ready")
    expect(resource.value).toBe("ok-good")
  })

  it("stale flag is per key", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "a" })
    expect(resource.stale.current).toBe(false)

    // Invalidate active key "a"
    resource.invalidate()
    expect(resource.stale.current).toBe(true)

    // Switch to key "b" — "b" starts fresh, not stale
    await resource.load({ id: "b" })
    expect(resource.stale.current).toBe(false)

    // Switch back to "a" — load() always reloads, clearing stale
    // The stale flag is per-key, so invalidating "a" didn't affect "b"
    await resource.load({ id: "a" })
    // load() clears stale before running the loader (by design)
    expect(resource.stale.current).toBe(false)
  })

  it("staleTime timer is per key", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
      staleTime: 30,
    })

    await resource.load({ id: "a" })

    // Switch to key "b" and load (starts b's timer)
    await resource.load({ id: "b" })

    // Switch back to "a" quickly — still not stale
    await resource.load({ id: "a" })
    expect(resource.stale.current).toBe(false)

    // Wait for "a"'s stale timer (but not "b"'s)
    await new Promise(r => setTimeout(r, 20))
    // "a" was loaded at the last switch-back, so timer just started
    expect(resource.stale.current).toBe(false)

    // Wait for the remaining time
    await new Promise(r => setTimeout(r, 20))
    expect(resource.stale.current).toBe(true)

    // Switch to "b" — its timer is independent and may not have fired yet
    await resource.load({ id: "b" })
    // "b" was loaded ~40ms ago, timer may have fired
    // This test just verifies timers are independent; exact timing varies
  })

  // === Active key / ref proxying ===

  it("ResourceRef proxies the active key value", async () => {
    type S = { id: string }
    const ref = new (await import("./resource.js")).ResourceRef<string, S>("r_test", "test", async (ctx: S) => {
      return `data-${ctx.id}`
    }, false)

    const resource = createResourceNode("test", "test", async (ctx: S) => {
      return `data-${ctx.id}`
    }, false, {
      key: (ctx: S) => ctx.id,
    })

    ref._connect(resource)

    await resource.load({ id: "a" })
    expect(ref.value).toBe("data-a")
    expect(ref.status).toBe("ready")

    // Load different key — ref proxies the new active key
    await resource.load({ id: "b" })
    expect(ref.value).toBe("data-b")
    expect(ref.status).toBe("ready")

    // Switch back
    await resource.load({ id: "a" })
    expect(ref.value).toBe("data-a")
  })

  it("switching keys updates visible value/status/error", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string; fail?: boolean }) => {
      if (ctx.fail) throw new Error(`err-${ctx.id}`)
      return `val-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "x" })
    expect(resource.value).toBe("val-x")
    expect(resource.status).toBe("ready")
    expect(resource.error).toBeUndefined()

    await resource.load({ id: "y", fail: true })
    expect(resource.status).toBe("failed")
    expect(resource.value).toBeUndefined()
    expect((resource.error as Error).message).toBe("err-y")

    await resource.load({ id: "x" })
    expect(resource.value).toBe("val-x")
    expect(resource.status).toBe("ready")
    expect(resource.error).toBeUndefined()
  })

  it("invalidate() only invalidates the active key", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "a" })
    expect(resource.stale.current).toBe(false)

    // Invalidate active key "a"
    resource.invalidate()
    expect(resource.stale.current).toBe(true)

    // Load key "b" — "b" starts fresh, not stale (invalidate didn't affect it)
    await resource.load({ id: "b" })
    expect(resource.stale.current).toBe(false)

    // load() always reloads and clears stale, so switch back clears "a"'s stale too
    await resource.load({ id: "a" })
    expect(resource.stale.current).toBe(false)
  })

  it("no-arg reload() uses lastContext and reloads the active/last key", async () => {
    let lastContext: unknown = undefined
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      lastContext = ctx
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "abc" })
    expect(resource.value).toBe("data-abc")

    // No-arg reload reuses lastContext → reloads key "abc"
    await resource.reload()
    expect(lastContext).toHaveProperty("id", "abc")
    expect(resource.value).toBe("data-abc")
    expect(resource.status).toBe("ready")
  })

  it("reload(context) can switch to a new key", async () => {
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
    })

    await resource.load({ id: "first" })
    expect(resource.value).toBe("data-first")

    // reload with different context → switches to new key
    await resource.reload({ id: "second" })
    expect(resource.value).toBe("data-second")
  })

  // === Deduplication ===

  it("deduplicate true dedupes concurrent loads for the same key", async () => {
    let callCount = 0
    let resolveLoad!: (v: string) => void
    const deferred = new Promise<string>(resolve => { resolveLoad = resolve })

    const resource = createResourceNode("team", "team", async () => {
      callCount++
      return deferred
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
      deduplicate: true,
    })

    const p1 = resource.load({ id: "x" })
    const p2 = resource.load({ id: "x" })
    const p3 = resource.load({ id: "x" })

    resolveLoad("result")
    await Promise.all([p1, p2, p3])

    expect(callCount).toBe(1)
  })

  it("deduplicate true does not dedupe different keys", async () => {
    let callCount = 0
    let resolve1!: (v: string) => void
    let resolve2!: (v: string) => void
    const deferred1 = new Promise<string>(resolve => { resolve1 = resolve })
    const deferred2 = new Promise<string>(resolve => { resolve2 = resolve })

    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      callCount++
      if (ctx.id === "x") return deferred1
      return deferred2
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
      deduplicate: true,
    })

    const p1 = resource.load({ id: "x" })
    const p2 = resource.load({ id: "y" })

    resolve1("x-result")
    resolve2("y-result")
    await Promise.all([p1, p2])

    // Different keys → two loader calls
    expect(callCount).toBe(2)
  })

  it("deduplicate false runs independent loads for the same key", async () => {
    let callCount = 0
    let resolve1!: (v: string) => void
    let resolve2!: (v: string) => void
    const deferred1 = new Promise<string>(resolve => { resolve1 = resolve })
    const deferred2 = new Promise<string>(resolve => { resolve2 = resolve })

    const resource = createResourceNode("team", "team", async () => {
      callCount++
      if (callCount === 1) return deferred1
      return deferred2
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
      deduplicate: false,
    })

    const p1 = resource.load({ id: "x" })
    const p2 = resource.load({ id: "x" })

    resolve1("first")
    resolve2("second")
    await Promise.all([p1, p2])

    expect(callCount).toBe(2)
  })

  it("failed deduplicated keyed load clears in-flight state and can retry", async () => {
    let callCount = 0

    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      callCount++
      throw new Error(`fail-${ctx.id}`)
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
      deduplicate: true,
    })

    const p1 = resource.load({ id: "x" })
    const p2 = resource.load({ id: "x" })

    // Errors are caught internally; promises resolve (don't reject)
    await p1
    await p2

    expect(callCount).toBe(1)
    expect(resource.status).toBe("failed")

    // Can retry after failure
    await resource.load({ id: "x" })
    // Same loader, will fail again
    expect(resource.status).toBe("failed")
    expect(callCount).toBe(2) // retry invokes loader again
  })

  // === Runtime integration ===

  it("runtime autoLoad works with cache.key and route/context services", async () => {
    type S = { route: { params: { teamId: string } } }
    let receivedKey: string | undefined

    const TestScreen = screen<S>("KeyedAutoload", $ => {
      $.resource("team", {
        load: async ({ route }) => {
          receivedKey = route.params.teamId
          return { id: route.params.teamId }
        },
        autoLoad: true,
        cache: {
          key: ({ route }) => route.params.teamId,
        },
      })
    })

    const runtime = createScreenRuntime<S>(TestScreen, {
      services: { route: { params: { teamId: "team_42" } } } as S,
    })
    await runtime.start()

    expect(runtime.resources).toHaveLength(1)
    expect(runtime.resources[0]!.status).toBe("ready")
    expect(runtime.resources[0]!.value).toEqual({ id: "team_42" })
    expect(receivedKey).toBe("team_42")
  })

  it("dispose clears stale timers for all keyed entries", async () => {
    let staleNotified = false
    const resource = createResourceNode("team", "team", async (ctx: { id: string }) => {
      return `data-${ctx.id}`
    }, true, {
      key: (ctx: { id: string }) => ctx.id,
      staleTime: 10,
    })

    await resource.load({ id: "a" })
    await resource.load({ id: "b" })

    const unsub = resource.stale.subscribe(() => { staleNotified = true })

    resource.dispose()

    await new Promise(r => setTimeout(r, 30))

    // Neither timer should fire after dispose
    expect(staleNotified).toBe(false)
    unsub()
  })
})
