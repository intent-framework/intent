import { describe, it, expect } from "vitest"
import { screen } from "@intent/core"
import { renderDom } from "./index.js"

async function loginUser(_params: { email: string; password: string }) {
  await Promise.resolve()
}

describe("DOM renderer", () => {
  it("renders semantic HTML for a login screen", () => {
    document.body.innerHTML = '<div id="root"></div>'

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

    const root = document.getElementById("root")
    if (!root) throw new Error("no root element")

    renderDom(LoginScreen, { target: root })

    const main = root.querySelector("main")
    expect(main).not.toBeNull()

    const form = root.querySelector("form")
    expect(form).not.toBeNull()

    const labels = root.querySelectorAll("label")
    expect(labels).toHaveLength(2)
    expect(labels[0]?.textContent).toBe("Email")
    expect(labels[1]?.textContent).toBe("Password")

    const inputs = root.querySelectorAll("input")
    expect(inputs).toHaveLength(2)
    expect(inputs[0]?.getAttribute("type")).toBe("email")
    expect(inputs[0]?.getAttribute("autocomplete")).toBe("email")
    expect(inputs[0]?.required).toBe(true)
    expect(inputs[1]?.getAttribute("type")).toBe("password")
    expect(inputs[1]?.required).toBe(true)

    const button = root.querySelector("button")
    expect(button).not.toBeNull()
    expect(button?.textContent).toBe("Log in")
    expect(button?.getAttribute("type")).toBe("button")
    expect(button?.disabled).toBe(true)

    const output = root.querySelector("output")
    expect(output).not.toBeNull()
    expect(output?.getAttribute("aria-live")).toBe("polite")
  })

  it("updates button state when inputs change", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const LoginScreen = screen("LoginUpdate", $ => {
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

      $.surface("main")
        .contains(emailAsk, passwordAsk, login)
    })

    const root = document.getElementById("root")
    if (!root) throw new Error("no root element")

    renderDom(LoginScreen, { target: root })

    const button = root.querySelector("button") as HTMLButtonElement
    expect(button.disabled).toBe(true)

    const inputs = root.querySelectorAll("input")
    const emailInput = inputs[0] as HTMLInputElement
    const passwordInput = inputs[1] as HTMLInputElement

    emailInput.value = "test@example.com"
    emailInput.dispatchEvent(new Event("input", { bubbles: true }))

    passwordInput.value = "secret"
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }))

    expect(button.disabled).toBe(false)
  })

  it("updates button state on programmatic state changes via subscription", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const LoginScreen = screen("LoginSub", $ => {
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

      $.surface("main")
        .contains(emailAsk, passwordAsk, login)
    })

    const root = document.getElementById("root")
    if (!root) throw new Error("no root element")

    renderDom(LoginScreen, { target: root })

    const button = root.querySelector("button") as HTMLButtonElement
    expect(button.disabled).toBe(true)

    // Set state programmatically — subscription re-evaluates buttons
    const emailState0 = LoginScreen.asks[0]
    const passwordState0 = LoginScreen.asks[1]
    const emailState = emailState0!.state as unknown as { set: (v: string) => void }
    const passwordState = passwordState0!.state as unknown as { set: (v: string) => void }
    emailState.set("user@example.com")

    expect(button.disabled).toBe(true) // password still empty

    passwordState.set("secret")

    expect(button.disabled).toBe(false)
  })

  it("updates feedback output after act execution", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    let resolved = false

    const LoginScreen = screen("LoginFeedback", $ => {
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
          await Promise.resolve()
          resolved = true
        })
        .feedback({
          pending: "Logging in...",
          success: "Logged in.",
        })

      $.surface("main")
        .contains(emailAsk, passwordAsk, login)
    })

    const root = document.getElementById("root")
    if (!root) throw new Error("no root element")

    renderDom(LoginScreen, { target: root })

    const output = root.querySelector("output")!
    expect(output.textContent).toBe("")

    // Enable the act by filling in fields
    const emailState2 = LoginScreen.asks[0]!.state as unknown as { set: (v: string) => void }
    const passwordState2 = LoginScreen.asks[1]!.state as unknown as { set: (v: string) => void }
    emailState2.set("a@b.com")
    passwordState2.set("pwd")

    // Click the button to execute the action
    const button = root.querySelector("button") as HTMLButtonElement
    button.click()

    // Wait for the async handler
    await new Promise(r => setTimeout(r, 50))

    expect(resolved).toBe(true)
    expect(output.textContent).toBe("Logged in.")
  })

  it("exposes blocked reason via aria-describedby on initial render", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const LoginScreen = screen("LoginBlockedAria", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
      $.surface("main").contains(emailAsk, login)
    })

    const root = document.getElementById("root")!
    renderDom(LoginScreen, { target: root })

    const button = root.querySelector("button") as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.getAttribute("aria-describedby")).toBe("act_log_in-reason")

    const reasonEl = document.getElementById("act_log_in-reason")
    expect(reasonEl).not.toBeNull()
    expect(reasonEl!.textContent).toBe("Enter your email.")
  })

  it("updates aria-describedby reactively when blocked reasons change", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const LoginScreen = screen("LoginBlockedAriaUpdate", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
      $.surface("main").contains(emailAsk, login)
    })

    const root = document.getElementById("root")!
    renderDom(LoginScreen, { target: root })

    const button = root.querySelector("button") as HTMLButtonElement
    expect(button.getAttribute("aria-describedby")).toBe("act_log_in-reason")
    expect(document.getElementById("act_log_in-reason")?.textContent).toBe("Enter your email.")

    // Fill in email — act becomes enabled, aria-describedby should be removed
    const emailState = LoginScreen.asks[0]!.state as unknown as { set: (v: string) => void }
    emailState.set("test@example.com")

    expect(button.disabled).toBe(false)
    expect(button.hasAttribute("aria-describedby")).toBe(false)
    expect(document.getElementById("act_log_in-reason")).toBeNull()
  })

  it("updates reason text when first blocked reason changes", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const LoginScreen = screen("LoginReasonChange", $ => {
      const email = $.state.text("email")
      const password = $.state.text("password")
      const emailAsk = $.ask("Email", email).required()
      const passwordAsk = $.ask("Password", password).required()
      const login = $.act("Log in")
        .primary()
        .when(emailAsk.valid, "Enter your email.")
        .when(passwordAsk.valid, "Enter your password.")
      $.surface("main").contains(emailAsk, passwordAsk, login)
    })

    const root = document.getElementById("root")!
    renderDom(LoginScreen, { target: root })

    const button = root.querySelector("button") as HTMLButtonElement

    // Initially blocked by both — first reason is email
    expect(button.getAttribute("aria-describedby")).toBe("act_log_in-reason")
    expect(document.getElementById("act_log_in-reason")!.textContent).toBe("Enter your email.")

    // Fill in email — now blocked only by password, reason should switch
    const emailState = LoginScreen.asks[0]!.state as unknown as { set: (v: string) => void }
    emailState.set("test@example.com")

    expect(button.disabled).toBe(true)
    expect(button.getAttribute("aria-describedby")).toBe("act_log_in-reason")
    expect(document.getElementById("act_log_in-reason")!.textContent).toBe("Enter your password.")

    // Fill in password — now enabled
    const passwordState = LoginScreen.asks[1]!.state as unknown as { set: (v: string) => void }
    passwordState.set("secret123")

    expect(button.disabled).toBe(false)
    expect(button.hasAttribute("aria-describedby")).toBe(false)
    expect(document.getElementById("act_log_in-reason")).toBeNull()
  })

  it("returns a cleanup function that unsubscribes listeners", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const TestScreen = screen("Cleanup", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()
      const login = $.act("Log in").primary().when(emailAsk.valid)
      $.surface("main").contains(emailAsk, login)
    })

    const root = document.getElementById("root")
    if (!root) throw new Error("no root element")

    const cleanup = renderDom(TestScreen, { target: root })

    const button = root.querySelector("button") as HTMLButtonElement
    expect(button.disabled).toBe(true)

    // After cleanup, state changes should not update buttons
    cleanup()

    const emailState3 = TestScreen.asks[0]!.state as unknown as { set: (v: string) => void }
    emailState3.set("test@test.com")

    // Button should still be disabled because subscription was removed
    expect(button.disabled).toBe(true)
  })

  it("creates a runtime and auto-loads resources on renderDom", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    let loaded = false
    const ResourceTest = screen("DOMResourceAutoLoad", $ => {
      const team = $.resource("team", {
        load: async () => {
          loaded = true
          return { id: "team_1" }
        },
      })

      $.act("Save")
        .primary()
        .when(team.ready, "Team must load first.")

      $.surface("main").contains(team as unknown as never)
    })

    const root = document.getElementById("root")!
    const cleanup = renderDom(ResourceTest, { target: root })

    const button = root.querySelector("button") as HTMLButtonElement
    expect(button.disabled).toBe(true)

    // Resources load in background — wait for them
    for (const config of ResourceTest.resourceConfigs) {
      const r = config.ref!
      if (r.status === "idle" || r.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = r.subscribe(() => {
            if (r.status === "ready" || r.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }
    }

    expect(loaded).toBe(true)
    expect(button.disabled).toBe(false)

    cleanup()
  })

  it("disposes runtime on cleanup", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const TestScreen = screen("DOMDisposeRuntime", $ => {
      $.resource("team", {
        load: async () => "data",
      })
    })

    const root = document.getElementById("root")!
    const cleanup = renderDom(TestScreen, { target: root })

    // cleanup should call runtime.dispose() without error
    expect(() => cleanup()).not.toThrow()
  })

  it("renderDom passes services to autoloading resource", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    let received: unknown
    type TestServices = { value: string }

    const TestScreen = screen<TestServices>("DOMResourceServices", $ => {
      $.resource("profile", {
        load: async (context) => {
          received = context
          return { name: "Mahyar" }
        },
      })
    })

    const root = document.getElementById("root")!
    const cleanup = renderDom<TestServices>(TestScreen, { target: root, services: { value: "from-dom" } })

    // Wait for autoload
    const resource = TestScreen.resourceConfigs[0]!.ref!
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

    expect(received).toEqual({ value: "from-dom" })
    expect(resource.status).toBe("ready")
    cleanup()
  })

  it("renders multiple buttons for multiple actions", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const MultiActionScreen = screen("MultiAction", $ => {
      const refresh = $.act("Refresh").does(async () => {})
      const invite = $.act("Invite member").does(async () => {})
      const back = $.act("Back").does(async () => {})
      $.surface("main").contains(refresh, invite, back)
    })

    const root = document.getElementById("root")!
    renderDom(MultiActionScreen, { target: root })

    const buttons = root.querySelectorAll("button")
    expect(buttons).toHaveLength(3)
    expect(buttons[0]?.textContent).toBe("Refresh")
    expect(buttons[1]?.textContent).toBe("Invite member")
    expect(buttons[2]?.textContent).toBe("Back")
  })

  it("clicking each button executes only that action", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    let refreshed = false
    let invited = false

    const MultiActionScreen = screen("MultiActionExec", $ => {
      const refresh = $.act("Refresh")
        .primary()
        .when(true)
        .does(async () => {
          refreshed = true
        })

      const invite = $.act("Invite member")
        .when(true)
        .does(async () => {
          invited = true
        })

      $.surface("main").contains(refresh, invite)
    })

    const root = document.getElementById("root")!
    renderDom(MultiActionScreen, { target: root })

    const buttons = root.querySelectorAll("button")

    // Click invite first — only invite should execute
    ;(buttons[1] as HTMLButtonElement).click()
    await new Promise(r => setTimeout(r, 10))
    expect(refreshed).toBe(false)
    expect(invited).toBe(true)

    // Reset and click refresh
    invited = false
    ;(buttons[0] as HTMLButtonElement).click()
    await new Promise(r => setTimeout(r, 10))
    expect(refreshed).toBe(true)
    expect(invited).toBe(false)
  })

  it("disabled/blocked state is per action", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const MultiActionBlocked = screen("MultiActionBlocked", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      const actionA = $.act("Action A")
        .primary()
        .when(emailAsk.valid, "Need email for A.")

      const actionB = $.act("Action B")
        .when(true)

      $.surface("main").contains(emailAsk, actionA, actionB)
    })

    const root = document.getElementById("root")!
    renderDom(MultiActionBlocked, { target: root })

    const buttons = root.querySelectorAll("button")
    const buttonA = buttons[0] as HTMLButtonElement
    const buttonB = buttons[1] as HTMLButtonElement

    // Action A should be disabled (no email), Action B should be enabled
    expect(buttonA.disabled).toBe(true)
    expect(buttonB.disabled).toBe(false)

    // Fill in email — Action A becomes enabled
    const emailState = MultiActionBlocked.asks[0]!.state as unknown as { set: (v: string) => void }
    emailState.set("test@example.com")

    expect(buttonA.disabled).toBe(false)
    expect(buttonB.disabled).toBe(false)
  })

  it("blocked reason text is per action", () => {
    document.body.innerHTML = '<div id="root"></div>'

    const MultiActionReasons = screen("MultiActionReasons", $ => {
      const email = $.state.text("email")
      const emailAsk = $.ask("Email", email).required()

      const actionA = $.act("Action A")
        .primary()
        .when(emailAsk.valid, "Email required for A.")

      const actionB = $.act("Action B")
        .when(emailAsk.valid, "Email required for B.")

      $.surface("main").contains(emailAsk, actionA, actionB)
    })

    const root = document.getElementById("root")!
    renderDom(MultiActionReasons, { target: root })

    const buttons = root.querySelectorAll("button")
    const buttonA = buttons[0] as HTMLButtonElement
    const buttonB = buttons[1] as HTMLButtonElement

    // Both should be disabled and each should have its own reason
    expect(buttonA.disabled).toBe(true)
    expect(buttonA.getAttribute("aria-describedby")).toBe("act_action_a-reason")
    const reasonA = document.getElementById("act_action_a-reason")
    expect(reasonA).not.toBeNull()
    expect(reasonA!.textContent).toBe("Email required for A.")

    expect(buttonB.disabled).toBe(true)
    expect(buttonB.getAttribute("aria-describedby")).toBe("act_action_b-reason")
    const reasonB = document.getElementById("act_action_b-reason")
    expect(reasonB).not.toBeNull()
    expect(reasonB!.textContent).toBe("Email required for B.")
  })

  it("feedback is shown for the clicked action", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const MultiActionFeedback = screen("MultiActionFeedback", $ => {
      const actionA = $.act("Action A")
        .primary()
        .when(true)
        .does(async () => {
          await Promise.resolve()
        })
        .feedback({
          pending: "Doing A...",
          success: "A done.",
        })

      const actionB = $.act("Action B")
        .when(true)
        .does(async () => {
          await Promise.resolve()
        })
        .feedback({
          pending: "Doing B...",
          success: "B done.",
        })

      $.surface("main").contains(actionA, actionB)
    })

    const root = document.getElementById("root")!
    renderDom(MultiActionFeedback, { target: root })

    const buttons = root.querySelectorAll("button")
    const output = root.querySelector("output")!
    expect(output.textContent).toBe("")

    // Click Action B
    ;(buttons[1] as HTMLButtonElement).click()
    await new Promise(r => setTimeout(r, 10))
    expect(output.textContent).toBe("B done.")
  })

  it("runtime-scoped invalidation works when clicking an action that invalidates a resource", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    let loadCount = 0

    const InvalidationScreen = screen("Invalidation", $ => {
      const team = $.resource("team", {
        load: async () => {
          loadCount++
          return { id: "team_1", loadCount }
        },
      })

      const refresh = $.act("Refresh")
        .primary()
        .when(team.ready, "Team must load.")
        .invalidates(team)
        .does(async () => {})

      const view = $.act("View")
        .when(team.ready, "Team must load.")
        .does(async () => {})

      $.surface("main").contains(refresh, view)
    })

    const root = document.getElementById("root")!
    renderDom(InvalidationScreen, { target: root })

    // Wait for resource to load
    for (const config of InvalidationScreen.resourceConfigs) {
      const r = config.ref!
      if (r.status === "idle" || r.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = r.subscribe(() => {
            if (r.status === "ready" || r.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }
    }

    expect(loadCount).toBe(1)

    const buttons = root.querySelectorAll("button")
    const refreshButton = buttons[0] as HTMLButtonElement
    const ref = InvalidationScreen.resourceConfigs[0]!.ref!

    // Resource should not be stale yet
    expect(ref.stale.current).toBe(false)

    // Click Refresh — should invalidate the resource (mark as stale)
    refreshButton.click()
    await new Promise(r => setTimeout(r, 50))

    // Resource should be marked stale
    expect(ref.stale.current).toBe(true)
    expect(loadCount).toBe(1) // invalidation marks stale, does not reload
  })

  it("renderDom action can reload a resource via ref.reload()", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    let loadCount = 0

    const ReloadScreen = screen("Reload", $ => {
      const team = $.resource("team", {
        load: async () => {
          loadCount++
          return { id: "team_1", loadCount }
        },
      })

      const refresh = $.act("Refresh")
        .primary()
        .when(team.ready, "Team must load.")
        .does(async () => {
          await team.reload()
        })

      $.surface("main").contains(refresh)
    })

    const root = document.getElementById("root")!
    renderDom(ReloadScreen, { target: root })

    // Wait for autoload
    for (const config of ReloadScreen.resourceConfigs) {
      const r = config.ref!
      if (r.status === "idle" || r.status === "pending") {
        await new Promise<void>(resolve => {
          const unsub = r.subscribe(() => {
            if (r.status === "ready" || r.status === "failed") {
              unsub()
              resolve()
            }
          })
        })
      }
    }

    expect(loadCount).toBe(1)

    const buttons = root.querySelectorAll("button")
    const ref = ReloadScreen.resourceConfigs[0]!.ref!

    // Click Refresh — should reload the resource via ref.reload()
    buttons[0]!.click()
    await new Promise(r => setTimeout(r, 50))

    // Resource should have been reloaded
    expect(loadCount).toBe(2)
    expect(ref.status).toBe("ready")
    expect(ref.stale.current).toBe(false)
  })

  it("ask input state is available to whichever action is clicked", async () => {
    document.body.innerHTML = '<div id="root"></div>'

    let capturedA: string | undefined
    let capturedB: string | undefined

    const AskStateScreen = screen("AskState", $ => {
      const text = $.state.text("message")
      const textAsk = $.ask("Message", text).required()

      const actionA = $.act("Action A")
        .primary()
        .when(textAsk.valid)
        .does(async () => {
          capturedA = text.value
        })

      const actionB = $.act("Action B")
        .when(textAsk.valid)
        .does(async () => {
          capturedB = text.value
        })

      $.surface("main").contains(textAsk, actionA, actionB)
    })

    const root = document.getElementById("root")!
    renderDom(AskStateScreen, { target: root })

    // Fill in the ask
    const input = root.querySelector("input")!
    input.value = "hello world"
    input.dispatchEvent(new Event("input", { bubbles: true }))

    const buttons = root.querySelectorAll("button")

    // Click Action B
    ;(buttons[1] as HTMLButtonElement).click()
    await new Promise(r => setTimeout(r, 10))
    expect(capturedB).toBe("hello world")
    expect(capturedA).toBeUndefined()

    // Click Action A
    ;(buttons[0] as HTMLButtonElement).click()
    await new Promise(r => setTimeout(r, 10))
    expect(capturedA).toBe("hello world")
  })
})
