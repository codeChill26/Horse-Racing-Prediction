/**
 * Settlement Repository — FLOW 8 (Result Publication & Settlement).
 *
 * Endpoint (theo D:\PRM\project\.cursor\prompts\mainflow.md):
 *   - POST /api/admin/races/:raceId/publish
 *       body: { confirm?: boolean }  (default true)
 *       → settle bets, award points, set race.status = FINISHED, emit 'race:published'
 *   - POST /api/admin/races/:raceId/unpublish
 *       body: { reason: string }
 *       → rollback settlement, refund spectators, set race.status = PENDING_RESULT,
 *         emit 'race:unpublished'
 *   - GET  /api/admin/races/:raceId/settlement
 *       → settlement summary (totalPool, houseMargin, payout, ...) sau publish
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
const MOCK_SETTLEMENT_SUMMARY = {
  raceId: 1,
  status: "FINISHED",
  totalPool: 50000,
  houseMargin: 5000,
  netPool: 45000,
  actualTotalPayout: 42000,
  treasureBalanceChange: 3000,
  settledCount: 123,
  wonCount: 23,
  lostCount: 98,
  refundedCount: 0,
  partialWonCount: 2,
  publishedAt: "2026-07-10T08:00:00Z",
  walletIncrements: {},
};

/**
 * Gọi API, fallback về mock CHỈ khi VITE_FALLBACK_TO_MOCK=true.
 * Với POST endpoints (publish/unpublish) KHÔNG fallback về mock — vì sẽ gây
 * hiểu lầm là BE đã settle xong nhưng thực tế chỉ là mock, dẫn đến sai lệch
 * wallet. Mock fallback chỉ an toàn cho GET (read).
 */
async function withFallback(apiCall, mockCall, errorContext) {
  if (FALLBACK_ENABLED) {
    try {
      return await apiCall();
    } catch (_err) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[settlementRepository] BE endpoint chưa sẵn sàng (${errorContext}). Fallback về mock vì VITE_FALLBACK_TO_MOCK=true.`
        );
      }
      return mockCall();
    }
  }
  return apiCall();
}

export const settlementRepository = {
  /**
   * POST /api/admin/races/:raceId/publish
   * @param {string|number} raceId
   * @param {object} [opts]
   * @param {boolean} [opts.confirm=true] — xác nhận đã kiểm tra Top 3
   * @returns {Promise<{ race, settlement, predictions }>}
   */
  async publishRace(raceId, opts = {}) {
    if (!raceId) throw new Error("ID chặng đua là bắt buộc");
    const res = await fetch(
      `/api/admin/races/${raceId}/publish`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ confirm: opts.confirm !== false }),
      }
    );
    if (!res.ok) await readError(res, "Publish chặng đua thất bại");
    const data = await res.json();
    return {
      race: data?.race ?? data,
      settlement: data?.settlement ?? null,
      predictions: Array.isArray(data?.predictions) ? data.predictions : [],
    };
  },

  /**
   * POST /api/admin/races/:raceId/unpublish
   * @param {string|number} raceId
   * @param {object} [opts]
   * @param {string} [opts.reason] — bắt buộc
   * @returns {Promise<{ race, predictions, affectedSpectators }>}
   */
  async unpublishRace(raceId, opts = {}) {
    if (!raceId) throw new Error("ID chặng đua là bắt buộc");
    if (!opts.reason || !opts.reason.trim()) {
      throw new Error("Lý do rollback là bắt buộc");
    }
    const res = await fetch(
      `/api/admin/races/${raceId}/unpublish`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason: opts.reason.trim() }),
      }
    );
    if (!res.ok) await readError(res, "Rollback settlement thất bại");
    const data = await res.json();
    return {
      race: data?.race ?? data,
      predictions: Array.isArray(data?.predictions) ? data.predictions : [],
      affectedSpectators: data?.affectedSpectators ?? {},
    };
  },

  /**
   * GET /api/admin/races/:raceId/settlement
   * Trả về settlement summary; null nếu race chưa được publish.
   */
  async getSettlement(raceId) {
    if (!raceId) throw new Error("ID chặng đua là bắt buộc");
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/races/${raceId}/settlement`,
          { headers: authHeaders() }
        );
        if (res.status === 404) return null;
        if (!res.ok) await readError(res, "Không tải được settlement summary");
        const data = await res.json();
        return data?.settlement ?? data;
      },
      () => MOCK_SETTLEMENT_SUMMARY,
      `getSettlement(${raceId})`
    );
  },
};
