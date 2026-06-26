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

export const horseRepository = {
  // Public horses
  async getPublicHorses() {
    const res = await fetch(`/api/horses`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách ngựa công khai");
    const data = await res.json();
    return data?.horses ?? [];
  },

  // Admin horses (can filter by status: PENDING, APPROVED, REJECTED, ALL)
  async getAll(status = "ALL") {
    const res = await fetch(`/api/admin/horses?status=${status}`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách ngựa");
    const data = await res.json();
    return data?.horses ?? [];
  },

  async updateStatus(horseId, status, reason = null) {
    const body = { status };
    if (reason) body.reason = reason;

    const res = await fetch(`/api/admin/horses/${horseId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Cập nhật trạng thái ngựa thất bại");
    const data = await res.json();
    return data?.horse ?? data;
  },

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

  async getMine() {
    const res = await fetch(`/api/horses/mine`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách ngựa của bạn");
    const data = await res.json();
    return data?.horses ?? [];
  },
};
