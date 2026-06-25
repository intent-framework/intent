import { screen } from "@intent/core"
import { renderDom } from "@intent/dom"

// Simulated login function
async function loginUser(params: { email: string; password: string }) {
  await new Promise(resolve => setTimeout(resolve, 500))
  if (params.email !== "mahyar@example.com") {
    throw new Error("Invalid credentials.")
  }
}

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
      await loginUser({
        email: email.value,
        password: password.value,
      })
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
if (root) {
  renderDom(LoginScreen, { target: root })
}
