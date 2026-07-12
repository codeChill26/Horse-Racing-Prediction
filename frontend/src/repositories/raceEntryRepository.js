/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository cho RaceEntry — Flow 2 (Jockey Invitation & Entry Submission)
 *
 * Endpoints (theo mainflow.md + PROCESS.md đã verify bằng curl):
 *  Owner side:
 *   - POST /api/races/:raceId/entries        { horseId, jockeyId? } — submit entry trực tiếp
 *     (không qua invitation, jockey optional, race.registrationOpen=true)
 *
 *  Admin side:
 *   - GET  /api/admin/races/:id/entries      — list entries của race (PENDING/APPROVED/REJECTED)
 *   - PUT  /api/entries/:id/status           { status: 'APPROVED' | 'REJECTED', reason? }
 *     (đã xác nhận bằng curl ngày 2026-07-09; endpoint POST /api/admin/races/:id/entries/:entryId/review
 *      mô tả trong mainflow.md KHÔNG tồn tại trên BE — mount conflict tại app.js:56,60)
 *
 *  Common:
 *   - GET  /api/races/:raceId/entries        — public list (cho owner xem entries của race mình)
 *   - GET  /api/entries/:entryId             — chi tiết
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
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export const raceEntryRepository = {
  // ============================================================
  // Owner side
  // ============================================================

  /**
   * POST /api/races/:raceId/entries
   * body: { horseId, jockeyId? }
   * mainflow.md: tạo RaceEntry status=PENDING. Validate:
   *  - registrationOpen === true
   *  - horse thuộc owner
   *  - horse status=APPROVED
   *  - jockey hợp lệ (nếu có)
   */
  async createEntry({ raceId, horseId, jockeyId }) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!horseId) throw new Error("Thiếu mã ngựa");
    const body = { horseId };
    if (jockeyId) body.jockeyId = jockeyId;
    const res = await fetch(`/api/races/${raceId}/entries`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Đăng ký entry thất bại");
    const data = await res.json();
    return data?.entry ?? data;
  },

  // ============================================================
  // Admin side
  // ============================================================

  /**
   * GET /api/admin/races/:id/entries
   * Lấy tất cả entry của 1 race (kèm filter status ở client)
   */
  async getEntriesByRace(raceId, status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`/api/admin/races/${raceId}/entries${q}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được danh sách đơn đăng ký");
    const data = await res.json();
    return data?.entries ?? [];
  },

  /**
   * PUT /api/entries/:id/status
   * body: { status: 'APPROVED' | 'REJECTED', reason?: string }
   * mainflow.md: REJECT bắt buộc reason.
   *
   * NOTE: mainflow.md mô tả endpoint POST /api/admin/races/:id/entries/:entryId/review
   * nhưng BE không implement (chỉ có POST /api/admin/races/:id/bulk-review).
   * Endpoint thật là PUT /api/entries/:id/status (xác nhận bằng curl 2026-07-09).
   */
  async reviewEntry(raceId, entryId, { status, reason }) {
    if (!entryId) throw new Error("Thiếu mã đơn đăng ký");
    const body = { status };
    if (reason) body.reason = reason;
    const res = await fetch(`/api/entries/${entryId}/status`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Duyệt/từ chối entry thất bại");
    const data = await res.json();
    return data?.entry ?? data;
  },

  // ============================================================
  // Common
  // ============================================================

  /** GET /api/races/:raceId/entries — public/owner view */
  async getPublicEntriesByRace(raceId) {
    const res = await fetch(`/api/races/${raceId}/entries`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được danh sách entry");
    const data = await res.json();
    return data?.entries ?? [];
  },

  /** GET /api/entries/:entryId */
  async getEntryById(entryId) {
    const res = await fetch(`/api/entries/${entryId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được chi tiết entry");
    const data = await res.json();
    return data?.entry ?? data;
  },
};