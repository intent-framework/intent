import type { RouteContext, RouterServices, RoutesFromPaths } from "@intent-framework/router"

export const appPaths = {
  home: "/",
  "team.details": "/teams/:teamId",
  "team.invite": "/teams/:teamId/invite",
} as const

export type AppRoutes = RoutesFromPaths<typeof appPaths>
export type AppServices = RouterServices<AppRoutes, {
  route: RouteContext<AppRoutes>
}>
