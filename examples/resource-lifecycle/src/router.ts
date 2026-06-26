import { createRouter } from "@intent-framework/router"
import { appPaths, type AppServices } from "./types.js"
import { ResourceDemo } from "./ResourceDemo.js"

export const demoRouter = createRouter<AppServices>()
  .route("demo", appPaths.demo, ResourceDemo)
