/**
 * E2E fixtures + helpers cho FLOW 7 tests (Spectator Betting).
 *
 * Bao gồm:
 *   - SPECTATOR_CREDENTIALS
 *   - mockSpectatorAuthApi(): login bypass + JWT với role SPECTATOR
 *   - spectatorLogin()
 *   - mockBettingApis(): /api/races/open, /api/races/:id/detail,
 *                         /api/predictions (GET/POST/PUT), /api/predictions/stats,
 *                         /api/admin/tournaments, /api/admin/races
 *   - MOCK_TOURNAMENTS, MOCK_RACES, MOCK_RACE_DETAIL, MOCK_BETS,
 *     MOCK_STATS, MOCK_NEW_BET helpers
 *
 * Lưu ý: tests assume BE chưa có cho FLOW 7 (đặc biệt /api/predictions/stats),
 * nên dùng page.route() để mock toàn bộ FE calls.
 */

import { test as base, expect } from "@playwright/test";

export const SPECTATOR_CREDENTIALS = {
  email: "spectator@grandstride.com",
  password: "Spectator@123",
};

const MOCK_TOURNAMENTS = [
  {
    id: 1,
    tournamentId: 1,
    name: "Giải Vô địch mùa xuân 2026",
    description: "Giải đua thường niên quy tụ những con ngựa xuất sắc nhất.",
    startAt: "2026-06-15",
    endAt: "2026-06-20",
    status: "OPEN",
    location: "Trường đua Bình Dương",
    totalPrize: 2000000000,
    participants: 45,
  },
];

const MOCK_RACES = [
  {
    id: 1,
    raceId: 1,
    tournamentId: 1,
    name: "Chặng 1 - Bình Dương",
    raceName: "Chặng 1",
    scheduledAt: "2026-06-15T08:00:00Z",
    registrationDeadline: "2026-06-14T17:00:00Z",
    status: "SCHEDULED",
    location: "Trường đua Bình Dương",
    prizePool: 300000000,
    horseCount: 4,
  },
];

const MOCK_RACE_DETAIL = {
  raceId: 1,
  name: "Chặng 1 - Bình Dương",
  status: "SCHEDULED",
  tournamentId: 1,
  prizePool: 300000000,
  scheduledAt: "2026-06-15T08:00:00Z",
  entries: [
    {
      entryId: 101,
      oddsFinal: 2.5,
      horse: {
        horseId: 1,
        name: "Lightning Bolt",
        careerStats: { totalStarts: 20, winRate: 35, avgPosition: 2.1 },
      },
      jockey: { userId: 11, fullName: "John Smith", careerStats: { totalStarts: 100, winRate: 25 } },
      pairCareerStats: null,
    },
    {
      entryId: 102,
      oddsFinal: 3.0,
      horse: {
        horseId: 2,
        name: "Thunder Strike",
        careerStats: { totalStarts: 18, winRate: 28, avgPosition: 3.2 },
      },
      jockey: { userId: 12, fullName: "Alice Brown", careerStats: { totalStarts: 80, winRate: 20 } },
      pairCareerStats: null,
    },
    {
      entryId: 103,
      oddsFinal: 4.5,
      horse: {
        horseId: 3,
        name: "Storm Chaser",
        careerStats: { totalStarts: 15, winRate: 20, avgPosition: 4.0 },
      },
      jockey: { userId: 13, fullName: "Bob Lee", careerStats: { totalStarts: 60, winRate: 15 } },
      pairCareerStats: null,
    },
    {
      entryId: 104,
      oddsFinal: 6.0,
      horse: {
        horseId: 4,
        name: "Wind Runner",
        careerStats: { totalStarts: 12, winRate: 15, avgPosition: 5.0 },
      },
      jockey: { userId: 14, fullName: "Carol King", careerStats: { totalStarts: 40, winRate: 10 } },
      pairCareerStats: null,
    },
  ],
};

const MOCK_BETS = [
  {
    predictionId: 1,
    raceId: 1,
    race: { raceId: 1, name: "Chặng 1 - Bình Dương", status: "SCHEDULED" },
    entries: [{ horse: { name: "Lightning Bolt" }, jockey: { fullName: "John Smith" } }],
    betType: "WIN",
    lockedOdds: 2.5,
    betAmount: 100,
    payout: 0,
    status: "PENDING",
    placedAt: "2026-07-10T07:00:00Z",
  },
  {
    predictionId: 2,
    raceId: 1,
    race: { raceId: 1, name: "Chặng 1 - Bình Dương", status: "FINISHED" },
    entries: [{ horse: { name: "Thunder Strike" }, jockey: { fullName: "Alice Brown" } }],
    betType: "WIN",
    lockedOdds: 3.0,
    betAmount: 200,
    payout: 600,
    status: "WON",
    placedAt: "2026-07-08T07:00:00Z",
  },
];

const MOCK_STATS = {
  totalBets: 12,
  totalSpent: 1500,
  totalWon: 2400,
  totalPayout: 2400,
  winRate: 58,
  totalRaces: 8,
  avgOdds: 3.0,
  bestStreak: 5,
  favoriteHorse: "Lightning Bolt",
  favoriteJockey: "John Smith",
  recentPerformance: [
    { raceName: "Giải A", result: "win", profit: 600, placedAt: "2026-07-08T07:00:00Z" },
    { raceName: "Giải B", result: "lose", profit: -100, placedAt: "2026-07-09T07:00:00Z" },
    { raceName: "Giải C", result: "win", profit: 250, placedAt: "2026-07-10T07:00:00Z" },
  ],
};

const MOCK_WALLET = {
  pointWallet: { balance: 1000, isFrozen: false },
};

const MOCK_PROFILE = {
  id: 99,
  email: SPECTATOR_CREDENTIALS.email,
  role: "SPECTATOR",
  fullName: "Test Spectator",
  ...MOCK_WALLET,
  activePredictionsCount: 3,
  wonBetsCount: 7,
  totalWinnings: 2400,
  pendingSettlementCount: 1,
};

/**
 * Helper tạo JWT giả với role tuỳ chọn.
 */
function makeFakeJwt(role, userId = "99") {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email: SPECTATOR_CREDENTIALS.email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString("base64");
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.fake-signature`;
}

/**
 * Mock auth API cho SPECTATOR role.
 */
export async function mockSpectatorAuthApi(page, { role = "SPECTATOR" } = {}) {
  const fakeToken = makeFakeJwt(role);

  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        accessToken: fakeToken,
        refreshToken: "fake-refresh-token",
        user: {
          id: 99,
          email: SPECTATOR_CREDENTIALS.email,
          role,
          fullName: "Test Spectator",
        },
      },
    });
  });

  await page.route("**/api/auth/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { user: MOCK_PROFILE, ...MOCK_PROFILE },
    });
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: MOCK_PROFILE,
    });
  });

  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
}

/**
 * Mock betting APIs:
 *  - GET /api/races/open
 *  - GET /api/races/:id/detail
 *  - GET /api/predictions (history)
 *  - POST /api/predictions (place bet)
 *  - PUT /api/predictions/:id/cancel
 *  - GET /api/predictions/stats
 *  - GET /api/admin/tournaments
 *  - GET /api/admin/races
 */
export async function mockBettingApis(
  page,
  {
    bets = MOCK_BETS,
    stats = MOCK_STATS,
    raceDetail = MOCK_RACE_DETAIL,
    tournaments = MOCK_TOURNAMENTS,
    races = MOCK_RACES,
  } = {}
) {
  // Races open
  await page.route("**/api/races/open", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { races },
    });
  });

  // Race detail
  await page.route("**/api/races/*/detail", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: raceDetail,
    });
  });

  // Predictions list (history)
  await page.route("**/api/predictions", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: { predictions: bets },
      });
      return
    }
    if (route.request().method() === "POST") {
      // Place bet
      const body = JSON.parse(route.request().postData() || "{}")
      const newPrediction = {
        predictionId: 99,
        raceId: body.raceId,
        race: { raceId: body.raceId, name: "Chặng 1 - Bình Dương", status: "SCHEDULED" },
        entries: body.entryIds?.map((id) => ({ entryId: id, horse: { name: "Mock Horse" } })) || [],
        betType: body.betType,
        entryIds: body.entryIds,
        lockedOdds: raceDetail.entries?.[0]?.oddsFinal || 2.5,
        betAmount: body.betAmount,
        payout: 0,
        status: "PENDING",
        placedAt: new Date().toISOString(),
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        json: { prediction: newPrediction },
      })
      return
    }
    await route.continue()
  });

  // Predictions stats
  await page.route("**/api/predictions/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { stats },
    });
  });

  // Predictions detail / cancel
  await page.route("**/api/predictions/*/cancel", async (route) => {
    if (route.request().method() === "PUT") {
      const id = Number((route.request().url().match(/predictions\/(\d+)/) || [])[1])
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: {
          prediction: {
            predictionId: id,
            status: "REFUNDED",
          },
        },
      })
      return
    }
    await route.continue()
  });

  // Tournaments
  await page.route("**/api/admin/tournaments*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { tournaments },
    })
  })

  // Races list
  await page.route(/\/api\/admin\/races(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { races },
    })
  })
}

/**
 * Login với SPECTATOR role.
 */
export async function spectatorLogin(page) {
  await page.goto("/login");
  const emailInput = page.locator("#email");
  await emailInput.click();
  await emailInput.pressSequentially(SPECTATOR_CREDENTIALS.email, { delay: 10 });
  const passwordInput = page.locator("#password");
  await passwordInput.click();
  await passwordInput.pressSequentially(SPECTATOR_CREDENTIALS.password, { delay: 10 });
  await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();
  await page.waitForURL(/\/spectator/, { timeout: 15_000 });
}

/**
 * Constants re-export.
 */
export {
  MOCK_TOURNAMENTS,
  MOCK_RACES,
  MOCK_RACE_DETAIL,
  MOCK_BETS,
  MOCK_STATS,
  MOCK_PROFILE,
};

export const test = base;
export { expect };
