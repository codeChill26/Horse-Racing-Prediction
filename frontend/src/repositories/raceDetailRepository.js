/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository cho Race Detail (Admin side) — Flow 3 / Flow 8.
 *
 * Endpoint (theo D:\PRM\project\.cursor\prompts\mainflow.md + openapi.js):
 *   - GET    /api/admin/races/:id                       — chi tiết race (Admin)
 *   - GET    /api/admin/races/:id/entries               — list entries của race
 *   - GET    /api/admin/races/:id/statistics            — thống kê race (BE có thể chưa có)
 *   - PATCH  /api/admin/races/:id                       — cập nhật race
 *   - POST   /api/admin/races/:id/cancel  { reason }    — hủy race
 *   - PUT    /api/admin/races/:id/registration-gate     — open/close registration
 *
 * Lưu ý: Một số endpoint (/statistics, /cancel, GET /api/admin/races mount conflict
 * theo PROCESS.md) có thể chưa có trên BE.
 *
 * Mock fallback CHỈ chạy khi env `VITE_FALLBACK_TO_MOCK=true` được set rõ ràng.
 * Mặc định (prod / staging) sẽ throw lỗi — không im lặng trả về dữ liệu giả.
 */

import { getAccessToken } from "../utils/token";

const FALLBACK_ENABLED =
  String(import.meta.env.VITE_FALLBACK_TO_MOCK ?? "false").toLowerCase() ===
  "true";

async function readError(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  throw new Error(
    data?.error || data?.message || `${fallback} (${res.status})`
  );
}

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// ----- Mock data (chỉ dùng khi VITE_FALLBACK_TO_MOCK=true) -----
const MOCK_RACE_DETAIL = {
  id: 1,
  tournamentId: 1,
  tournamentName: "Belmont Cup 2026",
  name: "Chung kết Belmont Stakes",
  scheduledAt: "2026-07-15T13:00:00Z",
  registrationDeadline: "2026-07-10T23:59:00Z",
  registrationOpen: true,
  status: "SCHEDULED",
  maxEntries: 16,
  approvedEntriesCount: 8,
  trackLength: 2400,
  trackSurface: "Turf",
  weather: "Clear",
  prizePool: 5000000,
  refereeA: { userId: 5, fullName: "Trọng tài A" },
  refereeB: { userId: 6, fullName: "Trọng tài B" },
  createdAt: "2026-06-20T08:00:00Z",
  updatedAt: "2026-06-28T10:00:00Z",
};

const MOCK_ENTRIES = [
  {
    entryId: 1,
    raceId: 1,
    horseId: 10,
    horseName: "Thunder Bolt",
    jockeyId: 20,
    jockeyName: "John Doe",
    gate: 1,
    status: "APPROVED",
    registeredAt: "2026-06-23T12:15:00Z",
  },
  {
    entryId: 2,
    raceId: 1,
    horseId: 11,
    horseName: "Silver Arrow",
    jockeyId: 21,
    jockeyName: "Emma Wilson",
    gate: 2,
    status: "APPROVED",
    registeredAt: "2026-06-23T12:30:00Z",
  },
  {
    entryId: 3,
    raceId: 1,
    horseId: 12,
    horseName: "Midnight Star",
    jockeyId: 22,
    jockeyName: "Carlos Mendes",
    gate: 3,
    status: "PENDING",
    registeredAt: "2026-06-24T09:00:00Z",
  },
];

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

/**
 * Gọi API, fallback về mock CHỈ khi VITE_FALLBACK_TO_MOCK=true.
 * Không còn swallow 404 — luôn throw để UI xử lý.
 */
async function withFallback(apiCall, mockCall, errorContext) {
  if (FALLBACK_ENABLED) {
    try {
      return await apiCall();
    } catch (_err) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[raceDetailRepository] BE endpoint chưa sẵn sàng (${errorContext}). Fallback về mock vì VITE_FALLBACK_TO_MOCK=true.`
        );
      }
      return mockCall();
    }
  }
  return apiCall();
}

export const raceDetailRepository = {
  /**
   * GET /api/admin/races/:id
   * @param {string|number} raceId
   */
  async getRaceDetail(raceId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/admin/races/${raceId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được chi tiết chặng đua");
        const data = await res.json();
        return data?.race ?? data;
      },
      async () => {
        if (!raceId) throw new Error("Thiếu mã chặng đua");
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { ...MOCK_RACE_DETAIL, id: raceId };
      },
      "getRaceDetail"
    );
  },

  /**
   * GET /api/admin/races/:id/entries
   * @param {string|number} raceId
   * @param {{ status?: string }} [filters]
   */
  async getEntries(raceId, filters = {}) {
    return withFallback(
      async () => {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== "ALL") {
          params.set("status", filters.status);
        }
        const qs = params.toString();
        const url = `/api/admin/races/${raceId}/entries${
          qs ? `?${qs}` : ""
        }`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok)
          await readError(res, "Không tải được danh sách entries");
        const data = await res.json();
        const list = Array.isArray(data?.entries)
          ? data.entries
          : Array.isArray(data)
            ? data
            : [];
        return list;
      },
      async () => {
        if (!raceId) throw new Error("Thiếu mã chặng đua");
        await new Promise((resolve) => setTimeout(resolve, 200));
        let list = MOCK_ENTRIES.map((e) => ({ ...e, raceId }));
        if (filters.status && filters.status !== "ALL") {
          list = list.filter(
            (e) => String(e.status).toUpperCase() === filters.status
          );
        }
        return list;
      },
      "getEntries"
    );
  },

  /**
   * GET /api/admin/races/:id/statistics
   * Endpoint này chưa có trên BE — fallback mock khi env flag bật.
   * @param {string|number} raceId
   */
  async getStatistics(raceId) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/admin/races/${raceId}/statistics`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được thống kê");
        const data = await res.json();
        return data?.statistics ?? data;
      },
      async () => {
        if (!raceId) throw new Error("Thiếu mã chặng đua");
        await new Promise((resolve) => setTimeout(resolve, 150));
        return { ...MOCK_STATISTICS, raceId };
      },
      "getStatistics"
    );
  },

  /** PATCH /api/admin/races/:id */
  async updateRace(raceId, data) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/admin/races/${raceId}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) await readError(res, "Cập nhật chặng đua thất bại");
        const result = await res.json();
        return result?.race ?? result;
      },
      async () => {
        if (!raceId) throw new Error("Thiếu mã chặng đua");
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { ...MOCK_RACE_DETAIL, ...data, id: raceId };
      },
      "updateRace"
    );
  },

  /**
   * POST /api/admin/races/:id/cancel { reason }
   * Endpoint này chưa có trên BE — fallback mock khi env flag bật.
   * @param {string|number} raceId
   * @param {string} reason
   */
  async cancelRace(raceId, reason) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/admin/races/${raceId}/cancel`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) await readError(res, "Hủy chặng đua thất bại");
        const result = await res.json();
        return result?.race ?? result;
      },
      async () => {
        if (!raceId) throw new Error("Thiếu mã chặng đua");
        await new Promise((resolve) => setTimeout(resolve, 300));
        return {
          ...MOCK_RACE_DETAIL,
          id: raceId,
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
        };
      },
      "cancelRace"
    );
  },

  /**
   * PUT /api/admin/races/:id/registration-gate
   * Body shape đã được unify: { isOpen: boolean } (khớp openapi.js:1967-1969).
   * Trước đây raceRepository dùng { isOpen } còn raceDetailRepository dùng { open }
   * — đã sửa để cả 2 repository gửi cùng payload.
   * @param {string|number} raceId
   * @param {boolean} open
   */
  async setRegistrationGate(raceId, open) {
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/races/${raceId}/registration-gate`,
          {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ isOpen: Boolean(open) }),
          }
        );
        if (!res.ok)
          await readError(
            res,
            open ? "Mở cổng đăng ký thất bại" : "Đóng cổng đăng ký thất bại"
          );
        const result = await res.json();
        return result?.race ?? result;
      },
      async () => {
        if (!raceId) throw new Error("Thiếu mã chặng đua");
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          ...MOCK_RACE_DETAIL,
          id: raceId,
          registrationOpen: Boolean(open),
        };
      },
      "setRegistrationGate"
    );
  },

  /** Convenience: mở cổng đăng ký */
  async openRegistration(raceId) {
    return this.setRegistrationGate(raceId, true);
  },

  /** Convenience: đóng cổng đăng ký */
  async closeRegistration(raceId) {
    return this.setRegistrationGate(raceId, false);
  },

  /**
   * GET /api/admin/races/:id/ai-odds?margin=
   * Agent 1 (AI Prediction) — gợi ý xác suất thắng + odds cho các entry APPROVED.
   * Không có mock fallback — đây là tính năng gọi thẳng AI service qua backend.
   * @param {string|number} raceId
   * @param {number} [margin]
   */
  async getAiOdds(raceId, margin) {
    const qs = margin !== undefined && margin !== null && margin !== "" ? `?margin=${margin}` : "";
    const res = await fetch(`/api/admin/races/${raceId}/ai-odds${qs}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không lấy được gợi ý odds từ AI");
    return res.json();
  },

  /**
   * GET /api/admin/races/:id/risk-score?treasury=
   * Agent 2 (AI Risk) — risk score dựa trên các cược PENDING + odds hiện tại.
   * @param {string|number} raceId
   * @param {number} treasury
   */
  async getRiskScore(raceId, treasury) {
    const res = await fetch(
      `/api/admin/races/${raceId}/risk-score?treasury=${treasury}`,
      { headers: authHeaders() }
    );
    if (!res.ok) await readError(res, "Không lấy được đánh giá rủi ro từ AI");
    return res.json();
  },

  /**
   * PATCH /api/admin/races/:id/entries/:entryId/odds
   * Admin ghi đè odds thủ công cho 1 entry (vd theo gợi ý AI, có thể sửa tay trước khi áp dụng).
   * @param {string|number} raceId
   * @param {string|number} entryId
   * @param {number} oddsFinal
   */
  /**
   * PATCH /api/admin/races/:id/odds
   * Áp dụng odds mới cho TOÀN BỘ entries của race cùng lúc (1 transaction) — không hỗ
   * trợ sửa từng entry riêng lẻ, vì chỉ đổi 1 con sẽ làm lệch tổng margin của cả race.
   * @param {string|number} raceId
   * @param {{entryId: number, oddsFinal: number}[]} entries
   */
  async applyOddsSuggestions(raceId, entries) {
    const res = await fetch(`/api/admin/races/${raceId}/odds`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) await readError(res, "Không áp dụng được odds mới");
    return res.json();
  },
};
