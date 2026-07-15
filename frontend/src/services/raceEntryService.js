/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service cho RaceEntry — Flow 2 (Jockey Invitation & Entry Submission)
 */

import { raceEntryRepository } from "../repositories/raceEntryRepository";

const VALID_REVIEW_STATUS = ["APPROVED", "REJECTED"];

export const raceEntryService = {
  // ============================================================
  // Owner side
  // ============================================================

  /**
   * POST /api/races/:raceId/entries — owner submit entry trực tiếp
   * @param {{ raceId, horseId, jockeyId? }} params
   */
  async createEntry({ raceId, horseId, jockeyId } = {}) {
    if (!raceId) throw new Error("Vui lòng chọn chặng đua");
    if (!horseId) throw new Error("Vui lòng chọn ngựa");
    return raceEntryRepository.createEntry({ raceId, horseId, jockeyId });
  },

  /**
   * GET /api/entries/mine — lấy entries của owner hiện tại
   */
  async getMyEntries() {
    return raceEntryRepository.getMyEntries();
  },

  /** GET /api/races/:raceId/entries — owner xem entries của race mình */
  async getMyEntriesByRace(raceId) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    return raceEntryRepository.getPublicEntriesByRace(raceId);
  },

  // ============================================================
  // Admin side
  // ============================================================

  /** GET /api/admin/races/:id/entries?status=... */
  async getEntriesByRace(raceId, status) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    return raceEntryRepository.getEntriesByRace(raceId, status);
  },

  /**
   * POST /api/admin/races/:id/entries/:entryId/review
   * mainflow.md: REJECT bắt buộc reason.
   */
  async reviewEntry(raceId, entryId, { status, reason }) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!entryId) throw new Error("Thiếu mã đơn đăng ký");
    const normalized = String(status || "").toUpperCase();
    if (!VALID_REVIEW_STATUS.includes(normalized)) {
      throw new Error("Trạng thái duyệt phải là APPROVED hoặc REJECTED");
    }
    const trimmed = reason ? String(reason).trim() : "";
    if (normalized === "REJECTED" && !trimmed) {
      throw new Error("Vui lòng nhập lý do từ chối");
    }
    return raceEntryRepository.reviewEntry(raceId, entryId, {
      status: normalized,
      reason: trimmed || undefined,
    });
  },

  /** Approve entry shorthand */
  async approveEntry(raceId, entryId) {
    return this.reviewEntry(raceId, entryId, { status: "APPROVED" });
  },

  /** Reject entry shorthand (reason bắt buộc) */
  async rejectEntry(raceId, entryId, reason) {
    return this.reviewEntry(raceId, entryId, { status: "REJECTED", reason });
  },

  // ============================================================
  // Common
  // ============================================================

  async getEntryById(entryId) {
    if (!entryId) throw new Error("Thiếu mã đơn đăng ký");
    return raceEntryRepository.getEntryById(entryId);
  },
};