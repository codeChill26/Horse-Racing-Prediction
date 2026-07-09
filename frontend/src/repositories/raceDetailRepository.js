/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Race Detail Repository
 *
 * API chưa tồn tại - sử dụng mock data tạm thời.
 * TODO: waiting backend API
 */

import { getAccessToken } from "../utils/token";

async function readError(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`);
}

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// TODO: waiting backend API
const MOCK_RACE_DETAIL = {
  id: 1,
  name: "Belmont Stakes 2026 - Final Round",
  location: "Belmont Park, New York",
  date: "2026-06-28T15:00:00Z",
  status: "SCHEDULED",
  tournamentId: 1,
  tournamentName: "Triple Crown Series 2026",
  registrationOpen: true,
  registrationDeadline: "2026-06-27T23:59:59Z",
  maxHorses: 16,
  distance: 2400,
  prize: 1500000,
  description: "The final leg of the Triple Crown series, one of the most prestigious horse races in the world.",
  createdAt: "2026-01-15T08:00:00Z",
  publishedAt: "2026-02-01T10:00:00Z",
};

// TODO: waiting backend API
const MOCK_ENTRIES = [
  {
    entryId: 1,
    horseId: 101,
    horseName: "Thunder Bolt",
    horseColor: "Brown",
    jockeyId: 501,
    jockeyName: "John Smith",
    jockeyColor: "Blue & White",
    ownerId: 301,
    ownerName: "Thunder Racing Stable",
    gate: 1,
    odds: 3.5,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-20T10:00:00Z",
  },
  {
    entryId: 2,
    horseId: 102,
    horseName: "Silver Arrow",
    horseColor: "Gray",
    jockeyId: 502,
    jockeyName: "Jane Doe",
    jockeyColor: "Red & Gold",
    ownerId: 302,
    ownerName: "Silver Line Stables",
    gate: 2,
    odds: 5.0,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-20T11:30:00Z",
  },
  {
    entryId: 3,
    horseId: 103,
    horseName: "Golden Star",
    horseColor: "Chestnut",
    jockeyId: 503,
    jockeyName: "Mike Johnson",
    jockeyColor: "Green & Black",
    ownerId: 303,
    ownerName: "Golden Gate Farm",
    gate: 3,
    odds: 4.2,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-21T09:15:00Z",
  },
  {
    entryId: 4,
    horseId: 104,
    horseName: "Midnight Thunder",
    horseColor: "Black",
    jockeyId: 504,
    jockeyName: "Sarah Wilson",
    jockeyColor: "Purple & Silver",
    ownerId: 304,
    ownerName: "Night Racing Club",
    gate: 4,
    odds: 6.5,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-21T14:20:00Z",
  },
  {
    entryId: 5,
    horseId: 105,
    horseName: "Speed Demon",
    horseColor: "Bay",
    jockeyId: 505,
    jockeyName: "Tom Brown",
    jockeyColor: "Orange & Black",
    ownerId: 305,
    ownerName: "Fast Lane Stable",
    gate: 5,
    odds: 7.0,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-22T08:45:00Z",
  },
  {
    entryId: 6,
    horseId: 106,
    horseName: "Lucky Seven",
    horseColor: "Dun",
    jockeyId: 506,
    jockeyName: "Emma Davis",
    jockeyColor: "Yellow & Navy",
    ownerId: 306,
    ownerName: "Lucky Strike Ranch",
    gate: 6,
    odds: 8.5,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-22T16:30:00Z",
  },
  {
    entryId: 7,
    horseId: 107,
    horseName: "Phoenix Rising",
    horseColor: "Red Roan",
    jockeyId: 507,
    jockeyName: "Chris Lee",
    jockeyColor: "Fire Red & White",
    ownerId: 307,
    ownerName: "Phoenix Racing Syndicate",
    gate: 7,
    odds: 4.8,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-23T10:00:00Z",
  },
  {
    entryId: 8,
    horseId: 108,
    horseName: "Ocean Breeze",
    horseColor: "Blue Roan",
    jockeyId: 508,
    jockeyName: "Lisa Wang",
    jockeyColor: "Aqua & White",
    ownerId: 308,
    ownerName: "Coastal Stables",
    gate: 8,
    odds: 9.0,
    finishTime: null,
    position: null,
    status: "CONFIRMED",
    registeredAt: "2026-06-23T12:15:00Z",
  },
];

// TODO: waiting backend API
const MOCK_STATISTICS = {
  totalEntries: 8,
  maxEntries: 16,
  confirmedEntries: 8,
  pendingEntries: 0,
  bettingVolume: 2500000,
  totalBets: 15420,
  completionRate: 50,
  averageOdds: 6.06,
  favoriteHorse: "Thunder Bolt",
  lastUpdated: "2026-06-28T10:00:00Z",
};

// TODO: waiting backend API
export const raceDetailRepository = {
  async getRaceDetail(raceId) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/races/${raceId}`, { headers: authHeaders() });
    // if (!res.ok) await readError(res, "Không tải được chi tiết chặng đua");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ...MOCK_RACE_DETAIL, id: raceId };
  },

  async getEntries(raceId) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/races/${raceId}/entries`, { headers: authHeaders() });
    // if (!res.ok) await readError(res, "Không tải được danh sách entries");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 200));
    return MOCK_ENTRIES;
  },

  async getStatistics(raceId) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/races/${raceId}/statistics`, { headers: authHeaders() });
    // if (!res.ok) await readError(res, "Không tải được thống kê");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 150));
    return MOCK_STATISTICS;
  },

  async updateRace(raceId, data) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/races/${raceId}`, {
    //   method: "PATCH",
    //   headers: authHeaders(),
    //   body: JSON.stringify(data),
    // });
    // if (!res.ok) await readError(res, "Cập nhật chặng đua thất bại");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ...MOCK_RACE_DETAIL, ...data, id: raceId };
  },

  async cancelRace(raceId, reason) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/races/${raceId}/cancel`, {
    //   method: "POST",
    //   headers: authHeaders(),
    //   body: JSON.stringify({ reason }),
    // });
    // if (!res.ok) await readError(res, "Hủy chặng đua thất bại");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      ...MOCK_RACE_DETAIL,
      id: raceId,
      status: "CANCELLED",
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
    };
  },

  async openRegistration(raceId) {
    // TODO: Replace with real API call
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      ...MOCK_RACE_DETAIL,
      id: raceId,
      registrationOpen: true,
    };
  },

  async closeRegistration(raceId) {
    // TODO: Replace with real API call
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      ...MOCK_RACE_DETAIL,
      id: raceId,
      registrationOpen: false,
    };
  },
};
