/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service cho Jockey Invitation
 * - Pattern: gọi qua repository, validate input cơ bản ở FE
 */

import { invitationRepository } from "../repositories/invitationRepository";

export const invitationService = {
  async searchJockeys(name) {
    return invitationRepository.searchJockeys(name);
  },

  async listInvitations(status) {
    return invitationRepository.listInvitations(status);
  },

  /**
   * Gửi lời mời kỵ sĩ.
   * Validate cơ bản trước khi gọi API (backend vẫn là nguồn quyết định cuối cùng).
   */
  async createInvitation({ raceId, horseId, jockeyId }) {
    if (!raceId) throw new Error("Vui lòng chọn chặng đua");
    if (!horseId) throw new Error("Vui lòng chọn ngựa");
    if (!jockeyId) throw new Error("Vui lòng chọn kỵ sĩ");
    return invitationRepository.createInvitation({ raceId, horseId, jockeyId });
  },

  async confirmInvitation(invitationId) {
    if (!invitationId) throw new Error("Thiếu mã lời mời");
    return invitationRepository.confirmInvitation(invitationId);
  },
};
