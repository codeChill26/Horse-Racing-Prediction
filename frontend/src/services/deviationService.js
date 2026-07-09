/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service cho Deviation/Discrepancy — Flow 5 (Discrepancy Resolution)
 *
 * State machine (theo D:\PRM\project\.cursor\prompts\mainflow.md FLOW 5):
 *
 *      PENDING ──── start-review ────► REVIEWING
 *      PENDING ──── resolve/reject ──► RESOLVED | REJECTED
 *      REVIEWING ── resolve/reject ──► RESOLVED | REJECTED
 *      RESOLVED | REJECTED  (terminal — race về PENDING_RESULT)
 *
 * Resolve payload (mainflow.md):
 *   - finalResults: ranking đã chọn (từ referee A, B, hoặc custom)
 *   - reason: BẮT BUỘC — lý do chọn
 *
 * Reject payload:
 *   - reason: BẮT BUỘC — lý do bác bỏ
 */

import { deviationRepository } from "../repositories/deviationRepository";

export const DEVIATION_STATUS = [
  "PENDING",
  "REVIEWING",
  "RESOLVED",
  "REJECTED",
  "ALL",
];

export const DEVIATION_SEVERITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const DEVIATION_DECISION_SOURCE = ["A", "B", "CUSTOM"];

export const deviationService = {
  /**
   * GET /api/admin/discrepancies?...
   * @param {{ status?: string, severity?: string, raceId?: number|string, q?: string }} filters
   */
  async getDeviations(filters = {}) {
    const normalized = { ...filters };
    if (normalized.status && !DEVIATION_STATUS.includes(normalized.status)) {
      throw new Error("Trạng thái lọc không hợp lệ");
    }
    if (
      normalized.severity &&
      normalized.severity !== "ALL" &&
      !DEVIATION_SEVERITY.includes(normalized.severity)
    ) {
      throw new Error("Mức độ lọc không hợp lệ");
    }
    return deviationRepository.getAll(normalized);
  },

  /** GET /api/admin/discrepancies/:id */
  async getDeviationById(id) {
    if (!id) throw new Error("ID sai lệch là bắt buộc");
    return deviationRepository.getById(id);
  },

  /** POST /api/admin/discrepancies/:id/start-review — PENDING → REVIEWING */
  async startReview(id, currentStatus) {
    if (!id) throw new Error("ID sai lệch là bắt buộc");
    if (currentStatus && currentStatus !== "PENDING") {
      throw new Error(
        `Chỉ có thể bắt đầu xem xét sai lệch ở trạng thái PENDING (hiện tại: ${currentStatus}).`
      );
    }
    return deviationRepository.startReview(id);
  },

  /**
   * POST /api/admin/discrepancies/:id/resolve
   * @param {string} id
   * @param {{
   *   finalResults: Array<{entryId, rank}>,
   *   reason: string,
   *   source?: 'A'|'B'|'CUSTOM',
   *   currentStatus?: string,
   * }} payload
   */
  async resolveDeviation(id, payload = {}) {
    if (!id) throw new Error("ID sai lệch là bắt buộc");

    const { finalResults, reason, source, currentStatus } = payload;

    if (source && !DEVIATION_DECISION_SOURCE.includes(source)) {
      throw new Error(
        `Nguồn quyết định phải là một trong: ${DEVIATION_DECISION_SOURCE.join(", ")}`
      );
    }
    const trimmedReason = reason ? String(reason).trim() : "";
    if (!trimmedReason) {
      throw new Error("Lý do xử lý là bắt buộc khi xử lý sai lệch");
    }
    if (trimmedReason.length > 1000) {
      throw new Error("Lý do xử lý tối đa 1000 ký tự");
    }
    if (Array.isArray(finalResults) && finalResults.length > 0) {
      const ranks = finalResults
        .map((r) => Number(r.rank))
        .filter((r) => Number.isFinite(r) && r >= 1);
      const uniqueRanks = new Set(ranks);
      if (uniqueRanks.size !== ranks.length) {
        throw new Error("Thứ hạng trùng nhau trong finalResults");
      }
    }
    if (
      currentStatus &&
      !["PENDING", "REVIEWING"].includes(currentStatus)
    ) {
      throw new Error(
        `Sai lệch đã ở trạng thái ${currentStatus} — không thể xử lý thêm.`
      );
    }

    return deviationRepository.resolveDeviation(id, {
      finalResults: Array.isArray(finalResults) ? finalResults : [],
      reason: trimmedReason,
      source: source || "CUSTOM",
    });
  },

  /**
   * POST /api/admin/discrepancies/:id/reject
   */
  async rejectDeviation(id, reason = "", currentStatus) {
    if (!id) throw new Error("ID sai lệch là bắt buộc");
    const trimmed = reason ? String(reason).trim() : "";
    if (!trimmed) {
      throw new Error("Lý do bác bỏ là bắt buộc");
    }
    if (trimmed.length > 1000) {
      throw new Error("Lý do bác bỏ tối đa 1000 ký tự");
    }
    if (
      currentStatus &&
      !["PENDING", "REVIEWING"].includes(currentStatus)
    ) {
      throw new Error(
        `Sai lệch đã ở trạng thái ${currentStatus} — không thể bác bỏ.`
      );
    }
    return deviationRepository.rejectDeviation(id, trimmed);
  },
};
