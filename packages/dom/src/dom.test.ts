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

    // Submit the form
    const form = root.querySelector("form")!
    form.dispatchEvent(new Event("submit", { bubbles: true }))

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
    for (const r of ResourceTest.resources) {
      // The resource is auto-loaded by the runtime, so we just wait for it
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
})
