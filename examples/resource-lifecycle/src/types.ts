import type { RouteContext, RouterServices, RoutesFromPaths } from "@intent-framework/router"

export const appPaths = {
  demo: "/:id",
} as const

export type AppRoutes = RoutesFromPaths<typeof appPaths>

export type AppServices = RouterServices<AppRoutes, {
  route: RouteContext<AppRoutes>
}>
