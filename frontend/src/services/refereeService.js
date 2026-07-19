/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service layer cho Referee — business logic, validation.
 * Tất cả delegate xuống refereeRepository (đã gọi API thật).
 *
 * Các endpoint đang dùng (xem backend/src/routes/referee.js):
 *  - GET  /api/referee/me/races
 *  - GET  /api/referee/me/races/:raceId
 *  - POST /api/referee/races/:id/start
 *  - POST /api/referee/races/:id/submit
 *  - GET  /api/referee/me/submissions
 *  - GET  /api/referee/me/conflicts
 *  - GET  /api/referee/me/profile
 */

import {
  refereeRaceRepository,
  refereeSubmissionRepository,
  refereeConflictRepository,
  refereeProfileRepository,
  refereeNotificationRepository,
  refereeViolationRepository,
} from "../repositories/refereeRepository";

/* --------------------------------- Race --------------------------------- */

export const refereeRaceService = {
  /**
   * @param {{ status?: string, date?: string }} params
   *  - status: 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_RESULT' | 'PAUSED' | 'FINISHED' | 'CANCELLED'
   *  - date:   YYYY-MM-DD
   */
  async getAssignedRaces(params) {
    return refereeRaceRepository.getAssignedRaces(params);
  },

  async getRaceControlDetail(raceId) {
    if (!raceId) throw new Error("Thiếu mã race");
    return refereeRaceRepository.getRaceControlDetail(raceId);
  },

  /** FLOW 4 — bắt đầu race (SCHEDULED → IN_PROGRESS). */
  async startRace(raceId) {
    if (!raceId) throw new Error("Thiếu mã race");
    return refereeRaceRepository.startRace(raceId);
  },
};

/* ----------------------------- Submission ----------------------------- */

/**
 * Service cho Blind Double Entry (FLOW 4).
 * Validate trước khi gửi — server vẫn là nguồn quyết định cuối cùng.
 *
 * BE schema rawResults:
 *  [{ entryId, rank, isDnf, isDq }]
 */
export const refereeSubmissionService = {
  /**
   * FE leg-results shape: { horseId (entry ở FE), rank, status: 'FINISHED'|'DNF'|'DQ' }
   * BE rawResults shape : { entryId (entryId thật), rank, isDnf, isDq }
   *
   * Mặc định chúng ta dùng BE shape trực tiếp. Hàm normalize giúp UI cũng dùng
   * được (FD-002 dùng horseId → cần map qua entryId).
   *
   * @param {Object} args
   * @param {string|number} args.raceId
   * @param {Array<{entryId?: number, horseId?: number, rank?: number, status?: string, isDnf?: boolean, isDq?: boolean}>} args.rawResults
   */
  async submitRaceResult({ raceId, rawResults }) {
    if (!raceId) throw new Error("Thiếu mã race");
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      throw new Error("Phải có kết quả cho ít nhất một entry");
    }

    // Chuẩn hoá về BE schema
    const normalized = rawResults
      .map((row) => {
        const entryId = row.entryId ?? row.horseId;
        if (entryId == null) return null;
        const status = (row.status || "").toUpperCase();
        const isDnf = !!row.isDnf || status === "DNF";
        const isDq = !!row.isDq || status === "DQ";
        return {
          entryId: Number(entryId),
          rank: row.rank ?? null,
          isDnf,
          isDq,
        };
      })
      .filter(Boolean);

    if (normalized.length === 0) {
      throw new Error("Không tìm thấy entry hợp lệ trong kết quả");
    }

    // Rule: rank >= 1 cho ngựa FINISHED, không trùng, liên tục 1..N.
    const finished = normalized.filter((r) => !r.isDnf && !r.isDq);
    if (finished.length === 0) {
      throw new Error("Phải có ít nhất 1 ngựa về đích (FINISHED)");
    }
    const ranks = finished.map((r) => r.rank);
    if (ranks.some((r) => r == null || r < 1)) {
      throw new Error("Ngựa FINISHED phải có thứ hạng ≥ 1");
    }
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== ranks.length) {
      throw new Error("Không được để 2 ngựa cùng thứ hạng");
    }
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    for (let i = 0; i < sortedRanks.length; i++) {
      if (sortedRanks[i] !== i + 1) {
        throw new Error("Thứ hạng phải liên tục từ 1 (ví dụ: 1, 2, 3 …)");
      }
    }

    return refereeSubmissionRepository.submitRaceResult({
      raceId,
      rawResults: normalized,
    });
  },

  async getMySubmissions() {
    return refereeSubmissionRepository.getMySubmissions();
  },
};

/* ----------------------------- Conflict ----------------------------- */

export const refereeConflictService = {
  async getConflicts() {
    return refereeConflictRepository.getConflicts();
  },
};

/* ----------------------------- Profile ----------------------------- */

export const refereeProfileService = {
  async getProfile() {
    return refereeProfileRepository.getProfile();
  },
};

/* ----------------------------- Notifications ----------------------------- */

/**
 * Notification service cho trọng tài.
 * BE: GET /api/referee/me/notifications, POST .../read, POST .../read-all,
 *     POST .../:id/respond { response: 'ACCEPTED'|'REFUSED', reason? }
 */
export const refereeNotificationService = {
  async getMyNotifications(params) {
    return refereeNotificationRepository.getMyNotifications(params);
  },

  async markAsRead(notificationId) {
    if (!notificationId) throw new Error("Thiếu mã thông báo");
    return refereeNotificationRepository.markAsRead(notificationId);
  },

  async markAllAsRead() {
    return refereeNotificationRepository.markAllAsRead();
  },

  /**
   * Phản hồi phân công (chấp nhận hoặc từ chối).
   * @param {{ notificationId?: number|string, id?: number|string }} notification
   * @param {'ACCEPTED'|'REFUSED'} response
   * @param {string} [reason]
   */
  async respondAssignment(notification, response, reason) {
    const id = notification?.notificationId ?? notification?.id;
    if (!id) throw new Error("Thiếu mã thông báo");
    return refereeNotificationRepository.respondAssignment({
      notificationId: id,
      response,
      reason,
    });
  },
};

/* ----------------------------- Violation ----------------------------- */

/**
 * Service báo cáo vi phạm trong trận đấu.
 * BE: POST /api/referee/violations
 *      body: { raceId, entryId?, type, severity, description }
 *      resp: { violation: { violationId, raceId, entryId, type, severity,
 *            description, status, createdAt } }
 *
 * Server chỉ chấp nhận khi race đang ở trạng thái IN_PROGRESS / PAUSED /
 * PENDING_RESULT (xem RefereeService.reportViolation).
 *
 * @param {Object} payload
 * @param {string|number} payload.raceId
 * @param {string|number} [payload.entryId]
 * @param {string} payload.type        // enum do BE định nghĩa, vd 'JOCKEY_FOUL'
 * @param {string} payload.severity    // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * @param {string} payload.description
 */
export const refereeViolationService = {
  async reportViolation(payload) {
    return refereeViolationRepository.reportViolation(payload);
  },
};