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

export const tournamentRepository = {
  // Public
  async getPublicTournaments() {
    const res = await fetch(`/api/tournaments`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách giải đấu");
    const data = await res.json();
    return data?.tournaments ?? [];
  },

  // Admin
  async getAll(status = "ALL") {
    const res = await fetch(`/api/admin/tournaments?status=${status}`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách giải đấu");
    const data = await res.json();
    return data?.tournaments ?? [];
  },

  async getById(id) {
    const res = await fetch(`/api/admin/tournaments/${id}`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được chi tiết giải đấu");
    const data = await res.json();
    return data?.tournament ?? data;
  },

  async create(tournamentData) {
    const res = await fetch(`/api/admin/tournaments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(tournamentData),
    });
    if (!res.ok) await readError(res, "Tạo giải đấu thất bại");
    const data = await res.json();
    return data?.tournament ?? data;
  },

  async update(id, tournamentData) {
    const res = await fetch(`/api/admin/tournaments/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(tournamentData),
    });
    if (!res.ok) await readError(res, "Cập nhật giải đấu thất bại");
    const data = await res.json();
    return data?.tournament ?? data;
  },

  async updateStatus(id, status, cancelReason = null) {
    const body = { status };
    if (cancelReason) body.cancelReason = cancelReason;

    const res = await fetch(`/api/admin/tournaments/${id}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Cập nhật trạng thái giải đấu thất bại");
    const data = await res.json();
    return data?.tournament ?? data;
  },

  async delete(id, reason = null) {
    const url = reason ? `/api/admin/tournaments/${id}?reason=${encodeURIComponent(reason)}` : `/api/admin/tournaments/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Xóa/Hủy giải đấu thất bại");
    const data = await res.json();
    return data;
  },
};
