import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("../../library/core/src", import.meta.url)),
      "@react": fileURLToPath(new URL("../../library/react/src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
})
