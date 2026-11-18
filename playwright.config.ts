import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  timeout: 40000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    headless: true,
    timezoneId: "America/Vancouver",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone-dark",
      use: {
        viewport: { width: 390, height: 844 },
        colorScheme: "dark",
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop-light",
      use: { viewport: { width: 1440, height: 1000 }, colorScheme: "light" },
    },
    {
      name: "tablet-dark",
      use: {
        viewport: { width: 820, height: 1180 },
        colorScheme: "dark",
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "node scripts/serve-web.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
