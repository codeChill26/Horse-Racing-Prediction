/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository for /api/invitations
 * - Jockey Invitation flow
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

export const invitationRepository = {
  /**
   * Tìm danh sách jockey đang active và đã hoàn tất profile
   * GET /api/invitations/jockeys?name=...
   */
  async searchJockeys(name) {
    const q = name ? `?name=${encodeURIComponent(name)}` : "";
    const res = await fetch(`/api/invitations/jockeys${q}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được danh sách kỵ sĩ");
    const data = await res.json();
    return data?.jockeys ?? [];
  },

  /**
   * Lấy danh sách lời mời (inbox cho jockey, outbox cho owner)
   * GET /api/invitations?status=...
   */
  async listInvitations(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`/api/invitations${q}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được danh sách lời mời");
    const data = await res.json();
    return data?.invitations ?? [];
  },

  /**
   * Tạo lời mời (chỉ HORSE_OWNER)
   * POST /api/invitations
   * body: { raceId, horseId, jockeyId }
   */
  async createInvitation({ raceId, horseId, jockeyId }) {
    const res = await fetch(`/api/invitations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ raceId, horseId, jockeyId }),
    });
    if (!res.ok) await readError(res, "Gửi lời mời thất bại");
    const data = await res.json();
    return data?.invitation ?? data;
  },

  /**
   * Owner xác nhận invitation ACCEPTED để tạo RaceEntry
   * POST /api/invitations/:id/confirm
   */
  async confirmInvitation(invitationId) {
    const res = await fetch(`/api/invitations/${invitationId}/confirm`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Xác nhận lời mời thất bại");
    const data = await res.json();
    return data?.entry ?? data;
  },
};
