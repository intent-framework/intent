import { screen } from "@intent-framework/core"
import type { VaultServices } from "./router.js"

export const LoginScreen = screen<VaultServices>("Login", $ => {
  const username = $.state.text("username")
  const password = $.state.text("password")

  const usernameAsk = $.ask("Username or email", username)
    .required("Enter your username or email")
    .private()

  const passwordAsk = $.ask("Password", password)
    .asSecret()
    .required("Enter your password")
    .private()
    .hint("Enter your vault password")

  const login = $.act("Unlock vault")
    .primary()
    .when(usernameAsk.valid, "Enter your username or email")
    .when(passwordAsk.valid, "Enter your password")
    .does(({ navigate }) => {
      navigate("vault")
    })

  const forgotPassword = $.act("Forgot password?")
    .does(({ navigate }) => {
      navigate("recovery")
    })

  $.flow("login")
    .startsWith(usernameAsk)
    .then(passwordAsk)
    .then(login)

  $.surface("main").contains(usernameAsk, passwordAsk, login, forgotPassword)
})
