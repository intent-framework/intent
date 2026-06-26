import { screen } from "@intent-framework/core"
import type { VaultServices } from "./router.js"

export const RecoveryScreen = screen<VaultServices>("Recovery", $ => {
  const recoveryEmail = $.state.text("recoveryEmail")

  const recoveryAsk = $.ask("Recovery email", recoveryEmail)
    .asContact("email")
    .required("Enter your recovery email")
    .validate(v => v.includes("@") ? true : "Enter a valid email")
    .private()

  const reset = $.act("Reset vault")
    .primary()
    .when(recoveryAsk.valid, "Enter a valid recovery email")
    .does(() => {
      // Simulate vault reset
    })
    .feedback({
      pending: "Resetting...",
      success: "Vault reset! Check your email.",
      failure: "Reset failed.",
    })

  const backToLogin = $.act("Back to login")
    .does(({ navigate }) => {
      navigate("login")
    })

  $.flow("recovery")
    .startsWith(recoveryAsk)
    .then(reset)

  $.surface("main").contains(recoveryAsk, reset, backToLogin)
})
