/**
 * E2E fixtures + helpers cho Flow 8 tests.
 *
 * Bao gồm:
 *   - adminLogin(): login nhanh với admin fixture
 *   - mockSettlementApi(): route handler cho các API settlement
 *   - navigateToRaceDetail(): đi tới trang detail race
 *
 * Lưu ý: tests assume backend chưa ổn định cho Flow 8, nên dùng page.route()
 * để mock các endpoint `/api/admin/settlement/*` thay vì đợi BE thật.
 */

import { test as base, expect } from "@playwright/test";

export const ADMIN_CREDENTIALS = {
  email: "admin@grandstride.com",
  password: "Admin@123",
};

export const MOCK_RACE_PENDING_RESULT = {
  raceId: 1,
  name: "Grand National - Test Race",
  status: "PENDING_RESULT",
  registrationOpen: false,
  startTime: "2026-07-15T10:00:00Z",
  trackId: 1,
  totalEntries: 8,
  maxEntries: 12,
};

export const MOCK_RACE_FINISHED = {
  ...MOCK_RACE_PENDING_RESULT,
  status: "FINISHED",
  publishedAt: "2026-07-10T08:00:00Z",
};

export const MOCK_RACE_STATISTICS = {
  totalEntries: 8,
  maxEntries: 12,
  totalBets: 150,
  bettingVolume: 5_000_000,
  completionRate: 85,
  favoriteHorse: "Lightning Bolt",
  confirmedEntries: 6,
  pendingEntries: 2,
  averageOdds: 4.5,
};

export const MOCK_ENTRIES = [
  {
    entryId: 1,
    horseId: 1,
    horseName: "Lightning Bolt",
    jockeyId: 1,
    jockeyName: "John Smith",
    status: "APPROVED",
    odds: 3.5,
  },
  {
    entryId: 2,
    horseId: 2,
    horseName: "Thunder Strike",
    jockeyId: 2,
    jockeyName: "Alice Brown",
    status: "APPROVED",
    odds: 5.0,
  },
];

export const MOCK_SETTLEMENT_SUMMARY = {
  raceId: 1,
  status: "FINISHED",
  totalPool: 50_000,
  houseMargin: 5_000,
  netPool: 45_000,
  actualTotalPayout: 42_000,
  treasureBalanceChange: 3_000,
  settledCount: 123,
  wonCount: 23,
  lostCount: 98,
  refundedCount: 0,
  partialWonCount: 2,
  publishedAt: "2026-07-10T08:00:00Z",
  walletIncrements: {},
};

/**
 * Mock tất cả API cần thiết cho Flow 8 tests.
 */
export async function mockSettlementApis(page, { raceStatus = "PENDING_RESULT" } = {}) {
  const race = raceStatus === "FINISHED" ? MOCK_RACE_FINISHED : MOCK_RACE_PENDING_RESULT;

  // Race detail
  await page.route("**/api/admin/races/*", (route) => {
    const url = route.request().url();
    if (url.match(/\/api\/admin\/races\/\d+$/)) {
      return route.fulfill({ status: 200, contentType: "application/json", json: race });
    }
    return route.continue();
  });

  // Entries
  await page.route("**/api/admin/races/*/entries**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", json: MOCK_ENTRIES })
  );

  // Statistics
  await page.route("**/api/admin/races/*/statistics**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", json: MOCK_RACE_STATISTICS })
  );

  // Settlement GET
  await page.route("**/api/admin/settlement/*", (route) => {
    if (route.request().method() === "GET") {
      if (raceStatus === "FINISHED") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          json: { settlement: MOCK_SETTLEMENT_SUMMARY },
        });
      }
      return route.fulfill({ status: 404, contentType: "application/json", json: {} });
    }
    return route.continue();
  });
}

/**
 * Mock auth API login — bypass real backend (BE thường không có admin user sẵn).
 * Token giả đủ để vượt qua RequireRole guard (chỉ kiểm tra role trong payload).
 */
export async function mockAuthApi(page) {
  await page.route("**/api/auth/login", async (route) => {
    // JWT giả: header.payload.signature — payload có role: ADMIN
    const fakePayload = Buffer.from(
      JSON.stringify({
        sub: "1",
        email: ADMIN_CREDENTIALS.email,
        role: "ADMIN",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64");
    const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.fake-signature`;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        accessToken: fakeToken,
        refreshToken: "fake-refresh-token",
        user: {
          id: 1,
          email: ADMIN_CREDENTIALS.email,
          role: "ADMIN",
          fullName: "Test Admin",
        },
      },
    });
  });

  // Stub refresh, profile, etc. if needed
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        id: 1,
        email: ADMIN_CREDENTIALS.email,
        role: "ADMIN",
        fullName: "Test Admin",
      },
    })
  );
}

/**
 * Login với admin role.
 * Gọi sau khi `mockAuthApi` đã được set up.
 * Dùng `pressSequentially` thay vì `fill` để tránh React controlled input edge case.
 */
export async function adminLogin(page) {
  await page.goto("/login");
  const emailInput = page.locator("#email");
  await emailInput.click();
  await emailInput.pressSequentially(ADMIN_CREDENTIALS.email, { delay: 10 });
  const passwordInput = page.locator("#password");
  await passwordInput.click();
  await passwordInput.pressSequentially(ADMIN_CREDENTIALS.password, { delay: 10 });
  await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();
  // Chờ redirect về admin home
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
}

/**
 * Navigate tới trang chi tiết race.
 */
export async function navigateToRaceDetail(page, raceId = 1) {
  await page.goto(`/admin/races/${raceId}`);
  await page.waitForLoadState("networkidle");
}

export const test = base;
export { expect };
