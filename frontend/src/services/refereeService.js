/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service layer cho Referee — business logic, validation.
 * Tất cả đều delegate xuống repository.
 *
 * TODO: Khi backend cung cấp APIs, thay thế mock bằng API thật.
 */

import {
  refereeRaceRepository,
  refereeSubmissionRepository,
  refereeConflictRepository,
  refereeProfileRepository,
} from "../repositories/refereeRepository";

export const refereeRaceService = {
  async getAssignedRaces() {
    return refereeRaceRepository.getAssignedRaces();
  },

  async getRaceControlDetail(raceId) {
    if (!raceId) throw new Error("Thiếu mã race");
    return refereeRaceRepository.getRaceControlDetail(raceId);
  },

  async startRace(raceId) {
    if (!raceId) throw new Error("Thiếu mã race");
    return refereeRaceRepository.startRace(raceId);
  },
};

export const refereeSubmissionService = {
  async getMySubmissions() {
    return refereeSubmissionRepository.getMySubmissions();
  },

  /**
   * Gửi kết quả leg.
   * Validate cơ bản trước khi gọi API.
   * Frontend không tự tính kết quả — backend là nguồn quyết định.
   */
  async submitLegResult({ raceId, legId, results, refereeNote }) {
    if (!raceId) throw new Error("Thiếu mã race");
    if (!legId) throw new Error("Thiếu mã leg");

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error("Phải có kết quả cho ít nhất một ngựa");
    }

    // Validate từng result
    for (const result of results) {
      if (!result.horseId) throw new Error("Thiếu mã ngựa trong kết quả");
      if (!result.status) throw new Error("Thiếu trạng thái ngựa");
      if (result.status === "FINISHED") {
        if (result.rank == null || result.rank < 1) {
          throw new Error("Ngựa FINISHED phải có thứ hạng >= 1");
        }
      }
    }

    // Kiểm tra rank trùng
    const finishedResults = results.filter((r) => r.status === "FINISHED");
    const ranks = finishedResults.map((r) => r.rank);
    const uniqueRanks = new Set(ranks);
    if (ranks.length !== uniqueRanks.size) {
      throw new Error("Không được để 2 ngựa cùng thứ hạng");
    }

    // Kiểm tra rank liên tục 1, 2, 3...
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    for (let i = 0; i < sortedRanks.length; i++) {
      if (sortedRanks[i] !== i + 1) {
        throw new Error("Thứ hạng phải liên tục từ 1 (ví dụ: 1, 2, 3)");
      }
    }

    return refereeSubmissionRepository.submitLegResult({ raceId, legId, results, refereeNote });
  },
};

export const refereeConflictService = {
  async getConflicts() {
    return refereeConflictRepository.getConflicts();
  },
};

export const refereeProfileService = {
  async getProfile() {
    return refereeProfileRepository.getProfile();
  },
};
