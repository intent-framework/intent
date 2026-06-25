import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@intent/core": new URL("../core/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
})
