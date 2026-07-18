/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Referee Repository — Flow 4 + mobile parity.
 *
 * Endpoint ánh xạ (xem backend/src/routes/admin/races.js + users.js):
 *  - GET  /api/admin/referees                  → listAvailableReferees
 *  - POST /api/admin/races/:id/assign-referees → assignReferees
 *      body: { refereeAId, refereeBId }
 *      resp: { success, message, data: race }
 *
 * Lưu ý nghiệp vụ:
 *  - BE yêu cầu race ở SCHEDULED (xem adminRefereeService.assignRefereesToRace).
 *  - Hai referee phải KHÁC NHAU + đều có role RACE_REFEREE — BE validate,
 *    nhưng repository trước đó để fail-fast nhanh.
 *  - Không có mock fallback — đây là luồng admin production.
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

function mapRefereeOption(raw) {
  if (!raw) return null;
  return {
    userId: Number(raw.userId),
    fullName: raw.fullName ?? "",
    email: raw.email ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    isActive: raw.isActive !== false,
  };
}

export const adminRefereeRepository = {
  /**
   * GET /api/admin/referees
   * Trả về danh sách referee active để admin phân công.
   * BE không hỗ trợ filter `availableFor=raceId` — comment trong service mobile
   * cũ xác nhận điều này, vì vậy ta trả tất cả rồi để UI chọn.
   */
  async listAvailableReferees() {
    const res = await fetch("/api/admin/referees", { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách trọng tài");
    const data = await res.json();
    const list = Array.isArray(data?.referees) ? data.referees : [];
    return list.map(mapRefereeOption).filter(Boolean);
  },

  /**
   * POST /api/admin/races/:id/assign-referees
   * @param {string|number} raceId
   * @param {{ refereeAId: number|string, refereeBId: number|string }} payload
   */
  async assignReferees(raceId, { refereeAId, refereeBId }) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!refereeAId || !refereeBId) {
      throw new Error("Bắt buộc chọn đủ Trọng tài A và Trọng tài B");
    }
    if (Number(refereeAId) === Number(refereeBId)) {
      throw new Error("Trọng tài A và Trọng tài B không được trùng nhau");
    }

    const res = await fetch(`/api/admin/races/${raceId}/assign-referees`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refereeAId, refereeBId }),
    });
    if (!res.ok) await readError(res, "Phân công trọng tài thất bại");
    const result = await res.json();
    return result?.data ?? result?.race ?? result;
  },
};
