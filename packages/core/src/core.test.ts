import { describe, it, expect } from "vitest"
import { screen, inspectScreen, isCondition } from "./index.js"

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

      expect(login.toNode().enabled).toBe(false)

      email.set("test@example.com")
      expect(login.toNode().enabled).toBe(true)
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

      expect(login.toNode().enabled).toBe(false)

      email.set("a@b.com")
      expect(login.toNode().enabled).toBe(false) // password still empty

      password.set("secret")
      expect(login.toNode().enabled).toBe(true)

      email.clear()
      expect(login.toNode().enabled).toBe(false)
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
})
