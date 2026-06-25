import { describe, it, expect } from "vitest"
import { screen } from "@intent/core"
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
})
