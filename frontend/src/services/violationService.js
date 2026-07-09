/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Violation Service
 *
 * Service layer cho violation management.
 * TODO: waiting backend API
 */

import { violationRepository } from "../repositories/violationRepository";

export const violationService = {
  async getViolations(filters = {}) {
    return violationRepository.getAll(filters);
  },

  async getViolationById(id) {
    if (!id) {
      throw new Error("ID vi phạm là bắt buộc");
    }
    return violationRepository.getById(id);
  },

  async resolveViolation(id, resolutionNote) {
    if (!id) {
      throw new Error("ID vi phạm là bắt buộc");
    }
    if (!resolutionNote || !resolutionNote.trim()) {
      throw new Error("Ghi chú xử lý là bắt buộc khi xử lý vi phạm");
    }
    return violationRepository.updateStatus(id, "RESOLVED", resolutionNote.trim());
  },

  async dismissViolation(id, reason) {
    if (!id) {
      throw new Error("ID vi phạm là bắt buộc");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Lý do bỏ qua là bắt buộc");
    }
    return violationRepository.updateStatus(id, "DISMISSED", reason.trim());
  },

  async startReview(id) {
    if (!id) {
      throw new Error("ID vi phạm là bắt buộc");
    }
    return violationRepository.updateStatus(id, "REVIEWING", null);
  },
};
