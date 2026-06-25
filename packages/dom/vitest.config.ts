import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@intent-framework/core": new URL("../core/src/index.ts", import.meta.url).pathname,
      "@intent-framework/router": new URL("../router/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
  },
})
