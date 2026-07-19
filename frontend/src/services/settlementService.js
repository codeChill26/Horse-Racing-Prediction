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
 *   - FINISHED + chưa settle (publishedAt = null): race Auto-Match đã hoàn tất
 *     nhưng admin chưa gửi kết quả cược cho spectators.
 */
const PUBLISHABLE_STATUSES = ["PENDING_RESULT"];

const canPublishRace = (race) => {
  if (!race) return false;
  const status = String(race.status || "").toUpperCase();
  if (PUBLISHABLE_STATUSES.includes(status)) return true;
  // Auto-Match race đã FINISHED nhưng chưa bao giờ được publish → cho phép.
  if (status === "FINISHED" && !race.publishedAt) return true;
  return false;
};

/**
 * Tập status được phép Unpublish (rollback).
 *   - FINISHED: race đã được publish trước đó
 */
const UNPUBLISHABLE_STATUSES = ["FINISHED"];

export const settlementService = {
  /**
   * Có thể publish race không (client-side check).
   * Bao gồm cả race Auto-Match FINISHED nhưng chưa settle.
   */
  canPublish(race) {
    return canPublishRace(race);
  },

  /**
   * Phân biệt 2 dạng publish:
   *   - "PENDING_RESULT": cần flow ConfirmModal cũ (Flow 8).
   *   - "AUTO_MATCHED_SETTLE": race Auto-Match FINISHED → dùng PublishNotifyModal
   *     (Option B) hiển thị breakdown trước khi xác nhận.
   */
  publishVariant(race) {
    if (!race) return null;
    const status = String(race.status || "").toUpperCase();
    if (status === "PENDING_RESULT") return "PENDING_RESULT";
    if (status === "FINISHED" && !race.publishedAt) return "AUTO_MATCHED_SETTLE";
    return null;
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

  /**
   * GET /api/admin/settlement/:raceId/preview-publish
   * Lấy breakdown spectator dự kiến trước khi publish (chỉ đọc, không ghi).
   */
  async previewPublish(raceId) {
    if (raceId == null) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return settlementRepository.previewPublish(raceId);
  },
};
