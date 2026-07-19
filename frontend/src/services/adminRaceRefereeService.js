/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Referee Service — Flow 4 + mobile parity.
 *
 * Validate input + delegate xuống adminRefereeRepository.
 * Status guard:
 *  - assignReferees chỉ áp dụng khi race.status === 'SCHEDULED'
 *    (BE cũng throw 409 với status khác — UI guard để UX rõ ràng hơn).
 */

import { adminRefereeRepository } from "../repositories/adminRefereeRepository";

const ASSIGNABLE_STATUSES = ["SCHEDULED", "REGISTRATION_OPEN"];

export const adminRaceRefereeService = {
  /**
   * Có thể phân công referee cho race này không (UI affordance).
   */
  canAssignReferees(race) {
    if (!race) return false;
    return ASSIGNABLE_STATUSES.includes(String(race.status || "").toUpperCase());
  },

  async listAvailableReferees() {
    return adminRefereeRepository.listAvailableReferees();
  },

  /**
   * @param {string|number} raceId
   * @param {{ refereeAId: number|string, refereeBId: number|string }} payload
   */
  async assignReferees(raceId, payload) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!payload || !payload.refereeAId || !payload.refereeBId) {
      throw new Error("Bắt buộc chọn đủ Trọng tài A và Trọng tài B");
    }
    if (Number(payload.refereeAId) === Number(payload.refereeBId)) {
      throw new Error("Trọng tài A và Trọng tài B không được trùng nhau");
    }
    return adminRefereeRepository.assignReferees(raceId, payload);
  },
};
