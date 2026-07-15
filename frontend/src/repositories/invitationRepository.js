/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository for /api/invitations — Flow 2 (Jockey Invitation & Entry Submission)
 *
 * Endpoint (theo mainflow.md):
 *  Owner side:
 *   - GET    /api/invitations/jockeys?name=...        — tìm kỵ sĩ (active + profile đầy đủ)
 *   - GET    /api/invitations?status=...              — danh sách (inbox cho jockey, outbox cho owner)
 *   - POST   /api/invitations                         — owner tạo lời mời { tournamentId, horseId, jockeyId }
 *   - POST   /api/invitations/:id/confirm             — owner confirm khi jockey đã ACCEPT → tạo RaceEntry cho TẤT CẢ race trong tournament
 *
 *  Jockey side:
 *   - POST   /api/invitations/:id/respond             — jockey accept/decline
 *                                                       body: { status: 'ACCEPTED' | 'DECLINED', declineReason? }
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
   * GET /api/invitations/jockeys?name=...
   * Tìm kỵ sĩ active + profile đầy đủ, kèm careerStats
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
   * GET /api/invitations?status=...
   * - Owner: trả outbox (lời mời do owner gửi)
   * - Jockey: trả inbox (lời mời gửi đến jockey)
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
   * GET /api/invitations/:id
   * Chi tiết 1 lời mời (dùng cho cả jockey + owner)
   */
  async getInvitationById(invitationId) {
    const res = await fetch(`/api/invitations/${invitationId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được chi tiết lời mời");
    const data = await res.json();
    return data?.invitation ?? data;
  },

  /**
   * POST /api/invitations — owner tạo lời mời
   * body: { tournamentId, horseId, jockeyId }
   * raceId là optional - nếu null thì sẽ đăng ký cho TẤT CẢ race trong tournament
   */
  async createInvitation({ tournamentId, horseId, jockeyId, raceId }) {
    const res = await fetch(`/api/invitations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tournamentId, horseId, jockeyId, raceId: raceId || null }),
    });
    if (!res.ok) await readError(res, "Gửi lời mời thất bại");
    const data = await res.json();
    return data?.invitation ?? data;
  },

  /**
   * POST /api/invitations/:id/respond
   * Jockey accept/decline.
   * body: { status: 'ACCEPTED' | 'DECLINED', declineReason?: string }
   *
   * mainflow.md: DECLINED có declineReason; ACCEPTED thì optional.
   * Validation server-side, FE chỉ forward.
   */
  async respondInvitation(invitationId, { status, declineReason }) {
    if (!invitationId) {
      throw new Error("Thiếu mã lời mời");
    }
    const body = { status };
    if (declineReason) body.declineReason = declineReason;
    const res = await fetch(`/api/invitations/${invitationId}/respond`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Phản hồi lời mời thất bại");
    const data = await res.json();
    return data?.invitation ?? data;
  },

  /**
   * POST /api/invitations/:id/confirm
   * Owner xác nhận invitation ACCEPTED → tạo RaceEntry cho TẤT CẢ race trong tournament.
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