/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository cho Horse (Flow 1 — Horse Registration & Approval)
 *
 * Endpoints (theo mainflow.md):
 * - GET    /api/horses             — danh sách public
 * - GET    /api/horses/mine        — danh sách ngựa của owner đang đăng nhập
 * - POST   /api/horses             — tạo ngựa mới (owner)
 * - GET    /api/admin/horses       — admin list (filter status)
 * - GET    /api/admin/horses/:id   — admin xem chi tiết
 * - POST   /api/admin/horses/:id/review  { status: 'APPROVED' | 'REJECTED', reason? }
 * - POST   /api/admin/horses/:id/revoke  { reason: '...' }
 *
 * Owner side update/delete: BE chưa hỗ trợ PATCH/DELETE /api/horses/:id cho owner.
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

export const horseRepository = {
  // ============================================================
  // Owner side
  // ============================================================

  /** GET /api/horses/mine */
  async getMine() {
    const res = await fetch(`/api/horses/mine`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách ngựa của bạn");
    const data = await res.json();
    return data?.horses ?? [];
  },

  /** GET /api/horses */
  async getPublicHorses() {
    const res = await fetch(`/api/horses`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách ngựa công khai");
    const data = await res.json();
    return data?.horses ?? [];
  },

  /**
   * POST /api/horses
   * body: { name, breed?, dateOfBirth?, sex?, color?, imageUrl? }
   */
  async create(horseData) {
    const res = await fetch(`/api/horses`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(horseData),
    });
    if (!res.ok) await readError(res, "Đăng ký ngựa thất bại");
    const data = await res.json();
    return data?.horse ?? data;
  },

  // ============================================================
  // Admin side
  // ============================================================

  /** GET /api/admin/horses?status=PENDING — đếm số ngựa chờ duyệt (badge sidebar) */
  async getPendingCount() {
    const res = await fetch(`/api/admin/horses?status=PENDING`, {
      headers: authHeaders(),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data?.horses) ? data.horses.length : 0;
  },

  /** GET /api/admin/horses?status=ALL|PENDING|APPROVED|REJECTED|INACTIVE */
  async getAll(status = "ALL") {
    const res = await fetch(`/api/admin/horses?status=${status}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được danh sách ngựa");
    const data = await res.json();
    return data?.horses ?? [];
  },

  /** GET /api/admin/horses/:id */
  async getById(horseId) {
    const res = await fetch(`/api/admin/horses/${horseId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được chi tiết ngựa");
    const data = await res.json();
    return data?.horse ?? data;
  },

  /**
   * PATCH /api/admin/horses/:id/status
   * body: { status: 'APPROVED' | 'REJECTED', reason?: string }
   *
   * mainflow.md ghi POST .../review và POST .../revoke nhưng backend thật
   * (theo openapi.js + routes/admin/horses.js) chỉ có 1 endpoint duy nhất
   * PATCH /api/admin/horses/:id/status dùng chung cho cả approve/reject.
   * Revoke (APPROVED → INACTIVE) cũng đi qua endpoint này với status='INACTIVE'.
   *
   * Note: REJECT bắt buộc reason (server validate 400).
   */
  async review(horseId, { status, reason }) {
    if (!horseId) throw new Error("Thiếu mã ngựa");
    const body = { status };
    if (reason) body.reason = reason;
    const res = await fetch(`/api/admin/horses/${horseId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Duyệt/từ chối ngựa thất bại");
    const data = await res.json();
    return data?.horse ?? data;
  },

  /**
   * PATCH /api/admin/horses/:id/status với status='INACTIVE'
   *
   * Theo openapi.js, backend hiện chưa có endpoint /revoke riêng. Trong lúc
   * chờ backend bổ sung, ta dùng chung endpoint /status với status='INACTIVE'
   * kèm reason. Nếu backend sau này bổ sung route revoke riêng thì chỉ cần
   * đổi 1 chỗ duy nhất ở đây.
   */
  async revoke(horseId, reason) {
    return this.review(horseId, { status: "INACTIVE", reason });
  },
};