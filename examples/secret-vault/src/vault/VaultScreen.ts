import { screen } from "@intent-framework/core"
import type { VaultServices } from "./router.js"

export const VaultScreen = screen<VaultServices>("Vault", $ => {
  const secretKey = $.state.text("secretKey")
  const confirmKey = $.state.text("confirmKey")
  const isLocked = $.state.boolean("isLocked", { initial: true })

  const secretKeyAsk = $.ask("Secret key", secretKey)
    .asSecret()
    .required("Enter the secret key")
    .private()
    .hint("The key was set when the vault was created")

  const confirmKeyAsk = $.ask("Confirm key", confirmKey)
    .asSecret()
    .required("Confirm your secret key")
    .private()

  const decrypt = $.act("Decrypt vault")
    .primary()
    .when(secretKeyAsk.valid, "Enter a valid secret key")
    .when(confirmKeyAsk.valid, "Confirm the secret key")
    .when(() => isLocked.value, "Vault is already unlocked")
    .does(() => {
      isLocked.set(false)
    })

  const lock = $.act("Lock vault")
    .when(() => !isLocked.value, "Vault is already locked")
    .does(() => {
      isLocked.set(true)
    })

  const forgotKey = $.act("Forgot key?")
    .does(({ navigate }) => {
      navigate("recovery")
    })

  const backToLogin = $.act("Back to login")
    .does(({ navigate }) => {
      navigate("login")
    })

  $.flow("vaultAccess")
    .startsWith(secretKeyAsk)
    .then(confirmKeyAsk)
    .then(decrypt)

  $.surface("main").contains(secretKeyAsk, confirmKeyAsk, decrypt, lock, forgotKey, backToLogin)
})
