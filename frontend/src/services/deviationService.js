/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deviation Service
 *
 * Service layer cho deviation/discrepancy management.
 * TODO: waiting backend API
 */

import { deviationRepository } from "../repositories/deviationRepository";

export const deviationService = {
  async getDeviations(filters = {}) {
    return deviationRepository.getAll(filters);
  },

  async getDeviationById(id) {
    if (!id) {
      throw new Error("ID sai lệch là bắt buộc");
    }
    return deviationRepository.getById(id);
  },

  async resolveDeviation(id, adminNote) {
    if (!id) {
      throw new Error("ID sai lệch là bắt buộc");
    }
    if (!adminNote || !adminNote.trim()) {
      throw new Error("Ghi chú xử lý là bắt buộc khi xử lý sai lệch");
    }
    return deviationRepository.updateStatus(id, "RESOLVED", adminNote.trim());
  },

  async rejectDeviation(id, reason) {
    if (!id) {
      throw new Error("ID sai lệch là bắt buộc");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Lý do bác bỏ là bắt buộc");
    }
    return deviationRepository.updateStatus(id, "REJECTED", reason.trim());
  },

  async startReview(id) {
    if (!id) {
      throw new Error("ID sai lệch là bắt buộc");
    }
    return deviationRepository.updateStatus(id, "REVIEWING", null);
  },
};
