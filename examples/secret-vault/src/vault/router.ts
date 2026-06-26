import { createRouter } from "@intent-framework/router"
import type { RouteContext, RouterServices, RoutesFromPaths } from "@intent-framework/router"
import { LoginScreen } from "./LoginScreen.js"
import { VaultScreen } from "./VaultScreen.js"
import { RecoveryScreen } from "./RecoveryScreen.js"

export const vaultPaths = {
  login: "/login",
  vault: "/vault",
  recovery: "/recovery",
} as const

export type VaultRoutes = RoutesFromPaths<typeof vaultPaths>

export type VaultServices = RouterServices<VaultRoutes, {
  route: RouteContext<VaultRoutes>
}>

export const vaultRouter = createRouter<VaultServices>()
  .route("login", vaultPaths.login, LoginScreen)
  .route("vault", vaultPaths.vault, VaultScreen)
  .route("recovery", vaultPaths.recovery, RecoveryScreen)
