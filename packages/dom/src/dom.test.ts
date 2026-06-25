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
})
