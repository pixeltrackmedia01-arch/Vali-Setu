import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = 3100;
// Use the preinstalled Chromium when present (cloud dev containers); otherwise Playwright's own.
const localChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: existsSync(localChromium) ? { executablePath: localChromium } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: "file:./e2e.db", APP_MODE: "demo", AI_PROVIDER: "demo", SPEECH_PROVIDER: "demo", MESSAGING_PROVIDER: "demo", SEED_DEMO_PASSWORD: "ValiSetu@2026" },
  },
});
