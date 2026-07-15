/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Jockey Repository — gọi API thật cho Jockey self-service endpoints.
 *
 * Backend paths (cập nhật 2026-07-14 sau khi audit backend):
 *  - GET    /api/jockey/profile                    — profile + career stats
 *  - POST   /api/jockey/profile                   — update profile
 *  - GET    /api/jockey/invitations               — danh sách lời mời
 *  - POST   /api/jockey/invitations/:id/respond   — accept/decline invitation
 *  - GET    /api/jockey/races                     — races được assign
 *  - GET    /api/jockey/races/:raceId/history    — race history
 *  - GET    /api/jockey/notifications             — notifications
 *  - POST   /api/jockey/notifications/:id/read    — mark notification read
 *
 * Lưu ý: Backend hiện CHƯA CÓ router /api/jockey/* — đang dùng mock data.
 * Khi backend implement, update endpoints từ /api/jockeys/me → /api/jockey
 */

import {
  MOCK_JOCKEY_PROFILE,
  MOCK_JOCKEY_RACES,
  MOCK_JOCKEY_NOTIFICATIONS,
  MOCK_HORSES_ASSIGNED,
  MOCK_RACE_COMPETITORS,
} from "../data/mockJockeyData";
import { getAccessToken } from "../utils/token";

const USE_API =
  (import.meta.env.VITE_USE_API_JOCKEY ?? "true").toLowerCase() === "true";

async function readError(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`);
}

function authHeaders(extra = {}) {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extra,
  };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withFallback(apiCall, mockCall, errorContext) {
  try {
    return await apiCall();
  } catch (err) {
    const isNotFound = /Not Found|404/.test(err.message);
    if (USE_API && !isNotFound) {
      throw err;
    }
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        `[jockeyRepository] BE endpoint chưa sẵn sàng (${errorContext}). Fallback về mock.`
      );
    }
    return mockCall();
  }
}

// ============================================
// Profile Repository
// ============================================

export const jockeyProfileRepository = {
  /** GET /api/jockey/profile */
  async getProfile() {
    return withFallback(
      async () => {
        const res = await fetch("/api/jockey/profile", {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được hồ sơ");
        const data = await res.json();
        return data?.user ?? data?.jockey ?? data;
      },
      async () => {
        await delay(300);
        return structuredClone(MOCK_JOCKEY_PROFILE);
      },
      "getProfile"
    );
  },

  /** POST /api/jockey/profile */
  async updateProfile(data) {
    return withFallback(
      async () => {
        const res = await fetch("/api/jockey/profile", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) await readError(res, "Cập nhật hồ sơ thất bại");
        const result = await res.json();
        return result?.user ?? result;
      },
      async () => {
        await delay(500);
        return { ...MOCK_JOCKEY_PROFILE, ...data };
      },
      "updateProfile"
    );
  },

  /** POST /api/jockey/profile/avatar (multipart) */
  async updateAvatar(file) {
    return withFallback(
      async () => {
        const formData = new FormData();
        formData.append("avatar", file);
        const res = await fetch("/api/jockey/profile/avatar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAccessToken() ?? ""}`,
          },
          body: formData,
        });
        if (!res.ok) await readError(res, "Tải ảnh đại diện thất bại");
        const data = await res.json();
        return { avatarUrl: data?.avatarUrl ?? data?.user?.avatarUrl ?? null };
      },
      async () => {
        await delay(800);
        return { avatarUrl: URL.createObjectURL(file) };
      },
      "updateAvatar"
    );
  },
};

// ============================================
// Races Repository
// ============================================

export const jockeyRaceRepository = {
  /** GET /api/jockey/races */
  async getMyRaces(filters = {}) {
    return withFallback(
      async () => {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.surface) params.set("surface", filters.surface);
        if (filters.date) params.set("date", filters.date);
        const qs = params.toString();
        const url = `/api/jockey/races${qs ? `?${qs}` : ""}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) await readError(res, "Không tải được danh sách race");
        const data = await res.json();
        return Array.isArray(data?.races)
          ? data.races
          : Array.isArray(data)
            ? data
            : [];
      },
      async () => {
        await delay(400);
        let races = structuredClone(MOCK_JOCKEY_RACES);
        if (filters.status) {
          races = races.filter((r) => r.status === filters.status);
        }
        if (filters.surface) {
          races = races.filter((r) => r.surface === filters.surface);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          races = races.filter(
            (r) =>
              r.name?.toLowerCase().includes(searchLower) ||
              r.tournamentName?.toLowerCase().includes(searchLower) ||
              r.venue?.toLowerCase().includes(searchLower)
          );
        }
        return races;
      },
      "getMyRaces"
    );
  },

  /** GET /api/jockey/races/:raceId/history */
  async getRaceHistory(raceId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/jockey/races/${raceId}/history`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được lịch sử race");
        const data = await res.json();
        return data?.history ?? data ?? [];
      },
      async () => {
        await delay(300);
        return [];
      },
      "getRaceHistory"
    );
  },

  /** GET /api/races/:id (dùng chung với public race detail) */
  async getRaceById(raceId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/races/${raceId}/detail`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được chi tiết race");
        const data = await res.json();
        return data?.race ?? data;
      },
      async () => {
        if (!raceId) throw new Error("Thiếu mã race");
        await delay(300);
        const race = MOCK_JOCKEY_RACES.find(
          (r) => r.id === raceId || r.raceId === raceId
        );
        if (!race) throw new Error("Race not found");
        return structuredClone(race);
      },
      "getRaceById"
    );
  },

  /** GET /api/races/:id/competitors */
  async getCompetitors(raceId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/races/${raceId}/competitors`, {
          headers: authHeaders(),
        });
        if (!res.ok)
          await readError(res, "Không tải được danh sách competitor");
        const data = await res.json();
        return Array.isArray(data?.competitors)
          ? data.competitors
          : Array.isArray(data)
            ? data
            : [];
      },
      async () => {
        await delay(300);
        return structuredClone(MOCK_RACE_COMPETITORS);
      },
      "getCompetitors"
    );
  },

  /** POST /api/races/:id/confirm */
  async confirmParticipation(raceId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/races/${raceId}/confirm`, {
          method: "POST",
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Xác nhận tham gia thất bại");
        return await res.json();
      },
      async () => {
        await delay(500);
        return { success: true, message: "Participation confirmed" };
      },
      "confirmParticipation"
    );
  },

  /** POST /api/races/:id/scratch { reason } */
  async requestScratching(raceId, reason) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/races/${raceId}/scratch`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) await readError(res, "Gửi yêu cầu rút lui thất bại");
        return await res.json();
      },
      async () => {
        await delay(600);
        return { success: true, message: "Scratching request submitted" };
      },
      "requestScratching"
    );
  },
};

// ============================================
// Schedule Repository (sử dụng races endpoint thay vì schedule riêng)
// ============================================

export const jockeyScheduleRepository = {
  /** GET /api/jockey/races - dùng chung với races endpoint */
  async getSchedule() {
    return jockeyRaceRepository.getMyRaces();
  },

  /** GET /api/jockey/races?status=SCHEDULED - races sắp tới */
  async getUpcomingRaces() {
    return jockeyRaceRepository.getMyRaces({ status: "SCHEDULED" });
  },

  /** GET /api/jockey/races?status=FINISHED - races đã qua */
  async getPastRaces() {
    return jockeyRaceRepository.getMyRaces({ status: "FINISHED" });
  },
};

// ============================================
// Horses Repository
// ============================================

export const jockeyHorseRepository = {
  /** GET /api/jockeys/me/horses */
  async getAssignedHorses() {
    return withFallback(
      async () => {
        const res = await fetch("/api/jockeys/me/horses", {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được danh sách ngựa");
        const data = await res.json();
        return Array.isArray(data?.horses)
          ? data.horses
          : Array.isArray(data)
            ? data
            : [];
      },
      async () => {
        await delay(350);
        return structuredClone(MOCK_HORSES_ASSIGNED);
      },
      "getAssignedHorses"
    );
  },

  /** GET /api/horses/:id (public endpoint) */
  async getHorseById(horseId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/horses/${horseId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được chi tiết ngựa");
        const data = await res.json();
        return data?.horse ?? data;
      },
      async () => {
        if (!horseId) throw new Error("Thiếu mã ngựa");
        await delay(300);
        const horse = MOCK_HORSES_ASSIGNED.find((h) => h.horseId === horseId);
        if (!horse) throw new Error("Horse not found");
        return structuredClone(horse);
      },
      "getHorseById"
    );
  },

  /** PUT /api/horses/:id/status (admin endpoint; jockey không có quyền) */
  async updateHorseStatus(horseId, status) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/horses/${horseId}/status`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ status }),
        });
        if (!res.ok)
          await readError(res, "Cập nhật trạng thái ngựa thất bại");
        return await res.json();
      },
      async () => {
        await delay(400);
        return { success: true, status };
      },
      "updateHorseStatus"
    );
  },
};

// ============================================
// Notifications Repository
// ============================================

export const jockeyNotificationRepository = {
  /** GET /api/jockey/notifications */
  async getNotifications() {
    return withFallback(
      async () => {
        const res = await fetch("/api/jockey/notifications", {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được thông báo");
        const data = await res.json();
        return Array.isArray(data?.notifications)
          ? data.notifications
          : Array.isArray(data)
            ? data
            : [];
      },
      async () => {
        await delay(300);
        return structuredClone(MOCK_JOCKEY_NOTIFICATIONS);
      },
      "getNotifications"
    );
  },

  /** POST /api/jockey/notifications/:id/read */
  async markAsRead(notificationId) {
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/jockey/notifications/${notificationId}/read`,
          { method: "POST", headers: authHeaders() }
        );
        if (!res.ok) await readError(res, "Đánh dấu đã đọc thất bại");
        return await res.json();
      },
      async () => {
        await delay(200);
        return { success: true };
      },
      "markAsRead"
    );
  },

  /** PUT /api/jockey/notifications/read-all */
  async markAllAsRead() {
    return withFallback(
      async () => {
        const res = await fetch(
          "/api/jockey/notifications/read-all",
          { method: "PUT", headers: authHeaders() }
        );
        if (!res.ok) await readError(res, "Đánh dấu tất cả đã đọc thất bại");
        return await res.json();
      },
      async () => {
        await delay(300);
        return { success: true };
      },
      "markAllAsRead"
    );
  },

  /** DELETE /api/jockey/notifications/:id */
  async deleteNotification(notificationId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/jockey/notifications/${notificationId}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Xoá thông báo thất bại");
        return await res.json();
      },
      async () => {
        await delay(200);
        return { success: true };
      },
      "deleteNotification"
    );
  },

  /** GET /api/jockey/notifications/unread-count */
  async getUnreadCount() {
    return withFallback(
      async () => {
        const res = await fetch(
          "/api/jockey/notifications/unread-count",
          { headers: authHeaders() }
        );
        if (!res.ok) await readError(res, "Không tải được số thông báo");
        const data = await res.json();
        return { count: data?.count ?? data?.unreadCount ?? 0 };
      },
      async () => {
        await delay(200);
        return {
          count: MOCK_JOCKEY_NOTIFICATIONS.filter((n) => !n.read).length,
        };
      },
      "getUnreadCount"
    );
  },
};

// ============================================
// Statistics Repository
// ============================================

export const jockeyStatsRepository = {
  /** GET /api/jockey/profile (career stats included in profile response) */
  async getCareerStats() {
    return withFallback(
      async () => {
        const res = await fetch("/api/jockey/profile", {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được thống kê sự nghiệp");
        const data = await res.json();
        return data?.careerStats ?? data?.stats ?? data;
      },
      async () => {
        await delay(350);
        return {
          totalRaces: MOCK_JOCKEY_PROFILE.totalRaces,
          totalWins: MOCK_JOCKEY_PROFILE.totalWins,
          totalTopThree: MOCK_JOCKEY_PROFILE.totalTopThree,
          winRate: MOCK_JOCKEY_PROFILE.winRate,
          topThreeRate: MOCK_JOCKEY_PROFILE.topThreeRate,
          careerEarnings: MOCK_JOCKEY_PROFILE.careerEarnings,
          yearsExperience: MOCK_JOCKEY_PROFILE.yearsExperience,
        };
      },
      "getCareerStats"
    );
  },

  /** GET /api/jockey/profile (stats included in profile response) */
  async getSeasonStats(season = "2026") {
    return withFallback(
      async () => {
        const res = await fetch("/api/jockey/profile", {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được thống kê mùa");
        const data = await res.json();
        return data?.stats ?? data?.seasonStats ?? { season };
      },
      async () => {
        await delay(300);
        const profile = MOCK_JOCKEY_PROFILE;
        return {
          season,
          races: profile.stats.racesThisSeason,
          wins: profile.stats.winsThisSeason,
          podiums: profile.stats.podiumsThisSeason,
          winRate: (
            (profile.stats.winsThisSeason / profile.stats.racesThisSeason) *
            100
          ).toFixed(1),
          podiumRate: (
            (profile.stats.podiumsThisSeason / profile.stats.racesThisSeason) *
            100
          ).toFixed(1),
          totalDistance: profile.stats.totalDistance,
          avgFinishTime: profile.stats.avgFinishTime,
        };
      },
      "getSeasonStats"
    );
  },

  /** GET /api/jockey/races/:raceId/history */
  async getPerformanceHistory(limit = 10) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/jockey/races?status=FINISHED&limit=${limit}`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được lịch sử thi đấu");
        const data = await res.json();
        const races = Array.isArray(data?.races) ? data.races : Array.isArray(data) ? data : [];
        return races.slice(0, limit);
      },
      async () => {
        await delay(300);
        return MOCK_JOCKEY_PROFILE.recentPerformances.slice(0, limit);
      },
      "getPerformanceHistory"
    );
  },
};
