import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "."), "server-only": path.resolve(__dirname, "tests/stubs/empty.ts") },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", APP_MODE: "demo", AI_PROVIDER: "demo", SPEECH_PROVIDER: "demo", MESSAGING_PROVIDER: "demo" },
    // Integration tests share one SQLite file, so run files serially.
    fileParallelism: false,
    testTimeout: 30000,
  },
});
