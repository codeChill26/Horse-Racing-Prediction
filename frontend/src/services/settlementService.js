/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settlement Service — FLOW 8.
 *
 * Service layer cho Publish / Unpublish race.
 * Validate input trước khi gọi repository.
 */

import { settlementRepository } from "../repositories/settlementRepository";

/**
 * Tập status được phép Publish.
 *   - PENDING_RESULT: race đã có OfficialRaceResult (AUTO_MATCHED hoặc RESOLVED)
 *   - MATCHED: alias từ Flow 4 sau khi referee đồng ý nhưng chưa resolve discrepancy
 */
const PUBLISHABLE_STATUSES = ["PENDING_RESULT"];

/**
 * Tập status được phép Unpublish (rollback).
 *   - FINISHED: race đã được publish trước đó
 */
const UNPUBLISHABLE_STATUSES = ["FINISHED"];

export const settlementService = {
  /**
   * Có thể publish race không (client-side check).
   */
  canPublish(race) {
    if (!race) return false;
    return PUBLISHABLE_STATUSES.includes(String(race.status || "").toUpperCase());
  },

  /**
   * Có thể rollback race không (client-side check).
   */
  canUnpublish(race) {
    if (!race) return false;
    return UNPUBLISHABLE_STATUSES.includes(String(race.status || "").toUpperCase());
  },

  /**
   * Publish race.
   * @param {string|number} raceId
   * @param {object} [opts]
   * @param {boolean} [opts.confirm=true]
   */
  async publishRace(raceId, opts = {}) {
    if (raceId == null) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return settlementRepository.publishRace(raceId, opts);
  },

  /**
   * Rollback settlement.
   * @param {string|number} raceId
   * @param {object} [opts]
   * @param {string} opts.reason
   */
  async unpublishRace(raceId, opts = {}) {
    if (raceId == null) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    if (!opts.reason || !String(opts.reason).trim()) {
      throw new Error("Vui lòng nhập lý do rollback để ghi nhận audit log.");
    }
    return settlementRepository.unpublishRace(raceId, opts);
  },

  /** GET /api/admin/settlement/:raceId */
  async getSettlement(raceId) {
    if (raceId == null) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return settlementRepository.getSettlement(raceId);
  },
};
