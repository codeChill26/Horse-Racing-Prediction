/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service cho Jockey Invitation — Flow 2.
 * Pattern: gọi qua repository, validate input cơ bản ở FE.
 *
 * Validation tiếng Việt, BE là nguồn quyết định cuối cùng.
 */

import { invitationRepository } from "../repositories/invitationRepository";

const VALID_INVITATION_STATUS = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "ALL",
];

const VALID_RESPOND_STATUS = ["ACCEPTED", "DECLINED"];

export const invitationService = {
  /**
   * GET /api/invitations/jockeys?name=...
   * Tìm kỵ sĩ active + profile đầy đủ
   */
  async searchJockeys(name) {
    return invitationRepository.searchJockeys(name);
  },

  /**
   * GET /api/invitations?status=...
   * - Owner: outbox
   * - Jockey: inbox
   */
  async listInvitations(status) {
    if (status && !VALID_INVITATION_STATUS.includes(String(status))) {
      throw new Error("Trạng thái lời mời không hợp lệ");
    }
    return invitationRepository.listInvitations(status);
  },

  /** GET /api/invitations/:id */
  async getInvitationById(invitationId) {
    if (!invitationId) throw new Error("Thiếu mã lời mời");
    return invitationRepository.getInvitationById(invitationId);
  },

  /**
   * POST /api/invitations — owner tạo lời mời (theo giải đấu)
   * Ngựa + kỵ sĩ sẽ tham gia TẤT CẢ các chặng đua trong giải đấu.
   */
  async createInvitation({ tournamentId, horseId, jockeyId }) {
    if (!tournamentId) throw new Error("Vui lòng chọn giải đấu");
    if (!horseId) throw new Error("Vui lòng chọn ngựa");
    if (!jockeyId) throw new Error("Vui lòng chọn kỵ sĩ");
    return invitationRepository.createInvitation({ tournamentId, horseId, jockeyId });
  },

  /**
   * POST /api/invitations/:id/respond — jockey accept/decline
   * @param {string} invitationId
   * @param {{ status: 'ACCEPTED' | 'DECLINED', declineReason?: string }} payload
   */
  async respondInvitation(invitationId, { status, declineReason } = {}) {
    if (!invitationId) throw new Error("Thiếu mã lời mời");
    const normalized = String(status || "").toUpperCase();
    if (!VALID_RESPOND_STATUS.includes(normalized)) {
      throw new Error("Trạng thái phản hồi phải là ACCEPTED hoặc DECLINED");
    }
    const reason = declineReason ? String(declineReason).trim() : "";
    if (normalized === "DECLINED" && !reason) {
      throw new Error("Vui lòng nhập lý do từ chối");
    }
    return invitationRepository.respondInvitation(invitationId, {
      status: normalized,
      declineReason: reason || undefined,
    });
  },

  /** Shorthand: jockey chấp nhận lời mời */
  async acceptInvitation(invitationId) {
    return this.respondInvitation(invitationId, { status: "ACCEPTED" });
  },

  /** Shorthand: jockey từ chối lời mời (bắt buộc có lý do) */
  async declineInvitation(invitationId, declineReason) {
    return this.respondInvitation(invitationId, {
      status: "DECLINED",
      declineReason,
    });
  },

  /**
   * POST /api/invitations/:id/confirm
   * Owner chốt 1 jockey đã ACCEPT → tạo RaceEntry + auto-cancel các invitation khác
   * cùng (horse, race). Validate status=ACCEPTED và race.registrationOpen=true ở server.
   */
  async confirmInvitation(invitationId) {
    if (!invitationId) throw new Error("Thiếu mã lời mời");
    return invitationRepository.confirmInvitation(invitationId);
  },
};