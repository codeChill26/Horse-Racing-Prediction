/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

export const raceRepository = {
  // Public
  async getAll() {
    const res = await fetch(`/api/races`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách cuộc đua");
    const data = await res.json();
    return data?.races ?? [];
  },

  /**
   * GET /api/admin/races — admin list tất cả chặng đua (kèm metadata cho admin).
   * Khác với getAll() (public) — kèm refereeAId, refereeBId, các field chỉ admin thấy.
   * Dùng cho AdminRaceStagePage. Sử dụng pageSize=-1 để lấy tất cả races không phân trang.
   */
  async getAdminRacesList() {
    try {
      const res = await fetch(`/api/admin/races?pageSize=-1`, { headers: authHeaders() });
      if (!res.ok) await readError(res, "Không tải được danh sách chặng đua (admin)");
      const data = await res.json();
      // Backend trả về { races: [...] } hoặc { races: [...], total, page, pageSize }
      return data?.races ?? [];
    } catch (err) {
      const fallbackEnabled =
        String(import.meta.env.VITE_FALLBACK_TO_MOCK ?? "false").toLowerCase() ===
        "true";
      if (fallbackEnabled) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            "[raceRepository] /api/admin/races chưa sẵn sàng, fallback public list (VITE_FALLBACK_TO_MOCK=true)."
          );
        }
        return this.getAll();
      }
      throw err;
    }
  },

  /**
   * Lấy chặng đua của 1 tournament
   * GET /api/tournaments/:id/races
   */
  async getRacesByTournament(tournamentId) {
    const res = await fetch(`/api/tournaments/${tournamentId}/races`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được danh sách chặng đua");
    const data = await res.json();
    return data?.races ?? [];
  },

  async createRace(raceData) {
    const res = await fetch(`/api/admin/races`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(raceData),
    });
    if (!res.ok) await readError(res, "Tạo cuộc đua thất bại");
    const data = await res.json();
    return data?.race ?? data;
  },

  /**
   * POST /api/admin/tournaments/:tournamentId/races (FLOW 3)
   * Tạo race mới trong 1 tournament.
   * body: { name, maxEntries, scheduledAt, registrationDeadline }
   */
  async createRaceInTournament(tournamentId, raceData) {
    const res = await fetch(`/api/admin/tournaments/${tournamentId}/races`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(raceData),
    });
    if (!res.ok) await readError(res, "Tạo chặng đua thất bại");
    const data = await res.json();
    return data?.race ?? data;
  },

  /**
   * GET /api/admin/tournaments/:tournamentId/races — admin list
   * Khác với getRacesByTournament (public), kèm thêm metadata cho admin.
   */
  async getAdminRacesByTournament(tournamentId) {
    const res = await fetch(
      `/api/admin/tournaments/${tournamentId}/races`,
      { headers: authHeaders() }
    );
    if (!res.ok) await readError(res, "Không tải được danh sách chặng đua");
    const data = await res.json();
    return data?.races ?? [];
  },

  /**
   * GET /api/admin/races/:id (FLOW 3)
   * Admin lấy chi tiết race (bao gồm refereeAId, refereeBId).
   */
  async getAdminRaceById(raceId) {
    const res = await fetch(`/api/admin/races/${raceId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được chi tiết chặng đua");
    const data = await res.json();
    return data?.race ?? data;
  },

  /**
   * PATCH /api/admin/races/:id (FLOW 3)
   * Cập nhật 1 race (name, maxEntries, scheduledAt, registrationDeadline).
   * Race FINISHED/CANCELLED là immutable (409).
   */
  async updateRace(raceId, raceData) {
    const res = await fetch(`/api/admin/races/${raceId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(raceData),
    });
    if (!res.ok) await readError(res, "Cập nhật chặng đua thất bại");
    const data = await res.json();
    return data?.race ?? data;
  },

  /**
   * DELETE /api/admin/races/:id
   * Race có entries → 409 (phải cancel thay vì delete).
   */
  async deleteRace(raceId, reason) {
    const url = reason
      ? `/api/admin/races/${raceId}?reason=${encodeURIComponent(reason)}`
      : `/api/admin/races/${raceId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Xoá/huỷ chặng đua thất bại");
    const data = await res.json();
    return data;
  },

  /**
   * POST /api/admin/races/:id/assign-referees (FLOW 3)
   * Phân công 2 referee cho race.
   * body: { refereeAId, refereeBId } — BE validate A !== B + cả 2 active role=RACE_REFEREE
   */
  async assignReferees(raceId, { refereeAId, refereeBId }) {
    const res = await fetch(`/api/admin/races/${raceId}/assign-referees`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refereeAId, refereeBId }),
    });
    if (!res.ok) await readError(res, "Phân công trọng tài thất bại");
    const data = await res.json();
    return data?.race ?? data;
  },

  /**
   * PUT /api/admin/races/:id/registration-gate (FLOW 3)
   * Mở hoặc đóng cổng đăng ký.
   * body: { isOpen: boolean }
   *
   * mainflow.md:
   *  - isOpen=true: registrationOpen=true, registrationOpenedAt=now
   *  - isOpen=false: registrationOpen=false, registrationClosedAt=now,
   *                  auto-reject tất cả PENDING entries, calculate odds
   */
  async setRegistrationGate(raceId, isOpen) {
    const res = await fetch(`/api/admin/races/${raceId}/registration-gate`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ isOpen: !!isOpen }),
    });
    if (!res.ok) await readError(res, "Cập nhật cổng đăng ký thất bại");
    return await res.json();
  },

  /**
   * GET /api/admin/users/referees
   * Lấy danh sách referee active (role.code ∈ { 'RACE_REFEREE', 'Referee', 'REFEREE' })
   * để chọn trọng tài cho chặng đua.
   *
   * Endpoint này chấp nhận cả 3 biến thể role code để tương thích dữ liệu seed cũ.
   * Xem routes/admin/users.js router.get('/referees').
   */
  async listReferees() {
    const res = await fetch(`/api/admin/users/referees`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được danh sách trọng tài");
    const data = await res.json();
    const all = Array.isArray(data?.referees) ? data.referees : [];
    return all
      .filter((r) => r?.isActive)
      .map((r) => ({
        userId: r.userId,
        fullName: r.fullName || r.email,
        email: r.email,
        avatarUrl: r.avatarUrl || null,
        roleCode: "RACE_REFEREE",
        isActive: r.isActive,
      }));
  },

  // Entries
  async getEntries() {
    const res = await fetch(`/api/admin/entries`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách đơn đăng ký");
    const data = await res.json();
    return data?.entries ?? [];
  },

  /**
   * Horse Owner đăng ký ngựa của họ vào một race.
   * POST /api/races/:raceId/entries
   * body: { horseId, jockeyId }
   */
  async createEntry({ raceId, horseId, jockeyId = null }) {
    const body = { horseId };
    if (jockeyId) body.jockeyId = jockeyId;
    const res = await fetch(`/api/races/${raceId}/entries`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Đăng ký ngựa vào chặng thất bại");
    const data = await res.json();
    return data?.entry ?? data;
  },

  async updateEntryStatus(entryId, status, reason = null) {
    const body = { status };
    if (reason) body.reason = reason;

    const res = await fetch(`/api/entries/${entryId}/status`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Cập nhật trạng thái đơn đăng ký thất bại");
    const data = await res.json();
    return data?.entry ?? data;
  },

  async closeRegistration(raceId) {
    const res = await fetch(`/api/admin/races/${raceId}/registration-gate`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ isOpen: false }),
    });
    if (!res.ok) await readError(res, "Đóng cổng đăng ký thất bại");
    const data = await res.json();
    return data;
  },

  // Mock implementation for discrepancy and violations as they are not explicitly defined in descriptionAPI.md
  async getDiscrepancy() {
    return {
      id: 1,
      details: "Mock discrepancy",
    };
  },

  async solveDiscrepancy(overrideVerdict) {
    return {
      status: "Resolved",
      verdict: overrideVerdict,
    };
  },

  async getViolations() {
    return [];
  },

  async handleViolation(caseId, verdict) {
    return {
      caseId,
      status: verdict,
    };
  },
};
