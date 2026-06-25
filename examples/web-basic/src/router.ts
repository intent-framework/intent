import { createRouter } from "@intent-framework/router"
import { appPaths, type AppServices } from "./types.js"
import { HomeScreen, TeamDetailScreen, InviteScreen } from "./screens.js"

export const router = createRouter<AppServices>()
  .route("home", appPaths.home, HomeScreen)
  .route("team.details", appPaths["team.details"], TeamDetailScreen)
  .route("team.invite", appPaths["team.invite"], InviteScreen)
