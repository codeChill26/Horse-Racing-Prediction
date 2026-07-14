import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — E2E test cho Frontend Horse Racing.
 *
 * Chạy 2 dev server song song:
 *   - frontend: http://localhost:5173 (Vite dev)
 *   - backend mock: http://localhost:3000 (BE fixtures — tùy chọn)
 *
 * Vì BE thật chưa ổn định cho Flow 8 (mount conflict), test dùng
 * `useMockBackend` qua `VITE_USE_MOCK_API=true` ở .env.test.
 *
 * Lệnh:
 *   npm run test:e2e           — chạy headless
 *   npm run test:e2e:ui        — mở Playwright UI
 *   npm run test:e2e:debug     — debug mode
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
