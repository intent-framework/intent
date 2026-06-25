import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      "@intent/core": new URL("../../packages/core/src/index.ts", import.meta.url).pathname,
      "@intent/dom": new URL("../../packages/dom/src/index.ts", import.meta.url).pathname,
      "@intent/router": new URL("../../packages/router/src/index.ts", import.meta.url).pathname,
    },
    conditions: ["development", "browser"],
  },
})
