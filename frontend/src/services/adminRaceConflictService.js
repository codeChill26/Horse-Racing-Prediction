/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Race Conflict Service — Flow 4 + mobile parity.
 *
 * - reviewConflict: xem dữ liệu 2 referee submission (khi race PAUSED).
 * - resolveConflict: ghi đè kết quả, race → FINISHED.
 *
 * Status guard:
 *  - review/resolve chỉ áp dụng khi race.status === 'PAUSED'.
 *    BE cũng throw 409 với status khác — UI guard để UX rõ ràng hơn.
 *
 * Khác với deviationService (luồng /api/admin/deviations — dùng officialResultId),
 * service này dùng raceId để khớp với mobile và endpoint /races/:id/*.
 */

import { adminRaceConflictRepository } from "../repositories/adminRaceConflictRepository";

const CONFLICT_STATUSES = ["PAUSED"];

export const adminRaceConflictService = {
  /**
   * Có thể review/resolve conflict cho race này không (UI affordance).
   * Service `canResolveConflict` đồng nghĩa với `canReviewConflict` — cùng status gate.
   */
  canResolveConflict(race) {
    if (!race) return false;
    return CONFLICT_STATUSES.includes(String(race.status || "").toUpperCase());
  },

  async reviewConflict(raceId) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    return adminRaceConflictRepository.reviewConflict(raceId);
  },

  /**
   * @param {string|number} raceId
   * @param {{ finalResults: {entryId:number, rank:number}[], reason: string }} payload
   */
  async resolveConflict(raceId, payload) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!payload || !Array.isArray(payload.finalResults) || payload.finalResults.length === 0) {
      throw new Error("Bắt buộc nhập thứ hạng cho ít nhất 1 ngựa");
    }
    if (!payload.reason || !String(payload.reason).trim()) {
      throw new Error("Lý do bắt buộc nhập");
    }
    return adminRaceConflictRepository.resolveConflict(raceId, payload);
  },
};
