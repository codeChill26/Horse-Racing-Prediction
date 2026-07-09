/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { raceRepository } from "../repositories/raceRepository";

const VALID_RACE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "PENDING_RESULT",
  "PAUSED",
  "FINISHED",
  "CANCELLED",
];

export const raceService = {
  async getRacesList() {
    return await raceRepository.getAll();
  },

  /** Admin list tất cả race — có refereeA/B, metadata đầy đủ cho admin. */
  async getAdminRacesList() {
    return await raceRepository.getAdminRacesList();
  },

  async getRacesByTournament(tournamentId) {
    if (!tournamentId) return [];
    return await raceRepository.getRacesByTournament(tournamentId);
  },

  /** Admin list races trong 1 tournament — kèm metadata dành cho admin */
  async getAdminRacesByTournament(tournamentId) {
    if (!tournamentId) return [];
    return await raceRepository.getAdminRacesByTournament(tournamentId);
  },

  /**
   * Admin tạo race mới trong 1 tournament (FLOW 3 — Step 2).
   * mainflow.md:
   *  - tournament phải tồn tại, không CANCELLED
   *  - scheduledAt phải ở tương lai
   *  - registrationDeadline < scheduledAt
   *  - maxEntries default 8, phải > 0
   *  - Race được tạo với status='SCHEDULED'
   * @param {string|number} tournamentId
   * @param {{ name, maxEntries, scheduledAt, registrationDeadline }} data
   */
  async createRaceInTournament(tournamentId, data) {
    if (!tournamentId) throw new Error("Thiếu mã giải đấu");
    const name = (data?.name ?? "").trim();
    if (!name) throw new Error("Tên chặng đua là bắt buộc");

    const maxEntries = Number(data?.maxEntries) || 8;
    if (!Number.isFinite(maxEntries) || maxEntries <= 0) {
      throw new Error("Số ngựa tối đa phải lớn hơn 0");
    }

    let scheduledAt;
    if (data?.scheduledAt) {
      const d = new Date(data.scheduledAt);
      if (Number.isNaN(d.getTime())) {
        throw new Error("Thời điểm thi đấu không hợp lệ");
      }
      if (d.getTime() <= Date.now()) {
        throw new Error("Thời điểm thi đấu phải ở tương lai");
      }
      scheduledAt = d.toISOString();
    }

    let registrationDeadline;
    if (data?.registrationDeadline) {
      const d = new Date(data.registrationDeadline);
      if (Number.isNaN(d.getTime())) {
        throw new Error("Hạn chót đăng ký không hợp lệ");
      }
      registrationDeadline = d.toISOString();
    }

    if (
      scheduledAt &&
      registrationDeadline &&
      new Date(registrationDeadline) >= new Date(scheduledAt)
    ) {
      throw new Error("Hạn chót đăng ký phải trước thời điểm thi đấu");
    }

    const payload = {
      name,
      maxEntries,
      ...(scheduledAt && { scheduledAt }),
      ...(registrationDeadline && { registrationDeadline }),
    };
    return raceRepository.createRaceInTournament(tournamentId, payload);
  },

  /**
   * Admin cập nhật race (name, maxEntries, scheduledAt, registrationDeadline).
   * mainflow.md: race FINISHED/CANCELLED là immutable (409).
   */
  async updateRace(raceId, data) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    const payload = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.maxEntries !== undefined)
      payload.maxEntries = Number(data.maxEntries) || 8;
    if (data.scheduledAt !== undefined) payload.scheduledAt = data.scheduledAt;
    if (data.registrationDeadline !== undefined)
      payload.registrationDeadline = data.registrationDeadline;
    if (Object.keys(payload).length === 0) {
      throw new Error("Cần ít nhất một trường để cập nhật");
    }
    return raceRepository.updateRace(raceId, payload);
  },

  /** Admin lấy chi tiết race. */
  async getAdminRaceById(raceId) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    return raceRepository.getAdminRaceById(raceId);
  },

  /**
   * Admin xoá/cancel race. mainflow.md: race có entries → 409.
   * Server sẽ trả 409 nếu race có entries/predictions → FE cần dùng cancelRace thay thế.
   */
  async deleteRace(raceId, reason) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    return raceRepository.deleteRace(raceId, reason);
  },

  /** Admin huỷ race — dùng khi race đã có entries. */
  async cancelRace(raceId, reason) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    return raceRepository.deleteRace(raceId, reason);
  },

  /**
   * FLOW 3 — Step 3: phân công 2 referee.
   * @param {string|number} raceId
   * @param {{ refereeAId, refereeBId }} payload
   */
  async assignReferees(raceId, { refereeAId, refereeBId }) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!refereeAId || !refereeBId) {
      throw new Error("Vui lòng chọn đủ 2 trọng tài (A và B)");
    }
    if (String(refereeAId) === String(refereeBId)) {
      throw new Error("Trọng tài A và B phải khác nhau");
    }
    return raceRepository.assignReferees(raceId, { refereeAId, refereeBId });
  },

  /**
   * FLOW 3 — Step 4/5: mở/đóng cổng đăng ký.
   * @param {string|number} raceId
   * @param {boolean} isOpen
   */
  async setRegistrationGate(raceId, isOpen) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    return raceRepository.setRegistrationGate(raceId, isOpen);
  },

  async openRegistration(raceId) {
    return this.setRegistrationGate(raceId, true);
  },

  async closeRegistration(raceId) {
    return this.setRegistrationGate(raceId, false);
  },

  /** GET /api/admin/referees — lấy danh sách referee active để chọn. */
  async listReferees() {
    return raceRepository.listReferees();
  },

  async createNewRace(raceData) {
        if (!raceData.raceName || !raceData.tournamentName) {
            throw new Error("Tên chặng đua và giải đấu liên kết là bắt buộc");
        }
        return await raceRepository.createRace(raceData);
    },

    async getRaceEntriesList() {
        return await raceRepository.getEntries();
    },

    async approveEntry(horseId) {
        return await raceRepository.updateEntryStatus(horseId, "Approved");
    },

    async rejectEntry(horseId) {
        return await raceRepository.updateEntryStatus(horseId, "Rejected");
    },

    /**
     * Horse Owner đăng ký ngựa của họ vào race.
     */
    async registerHorseForRace({ raceId, horseId, jockeyId = null }) {
        if (!raceId) throw new Error("Vui lòng chọn chặng đua");
        if (!horseId) throw new Error("Vui lòng chọn ngựa");
        return await raceRepository.createEntry({ raceId, horseId, jockeyId });
    },

    async getDiscrepancyDetails() {
        return await raceRepository.getDiscrepancy();
    },

    async resolveOfficialResults(overrideVerdict) {
        // decision would be the custom positions & justification
        return await raceRepository.solveDiscrepancy(overrideVerdict);
    },

    async fetchViolationsList() {
        return await raceRepository.getViolations();
    },

    async adjudicateViolation(caseId, approveFlag) {
        const verdict = approveFlag ? "approve" : "reject";
        return await raceRepository.handleViolation(caseId, verdict);
    }
};

// Re-export status constants cho UI dùng
export { VALID_RACE_STATUSES };
