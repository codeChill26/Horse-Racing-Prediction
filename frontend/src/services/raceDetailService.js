/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Race Detail Service
 *
 * Service layer cho race detail management.
 * TODO: waiting backend API
 */

import { raceDetailRepository } from "../repositories/raceDetailRepository";

export const raceDetailService = {
  async getRaceDetail(raceId) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return raceDetailRepository.getRaceDetail(raceId);
  },

  async getEntries(raceId) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return raceDetailRepository.getEntries(raceId);
  },

  async getStatistics(raceId) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return raceDetailRepository.getStatistics(raceId);
  },

  async updateRace(raceId, data) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return raceDetailRepository.updateRace(raceId, data);
  },

  async cancelRace(raceId, reason) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Lý do hủy là bắt buộc");
    }
    return raceDetailRepository.cancelRace(raceId, reason.trim());
  },

  async openRegistration(raceId) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return raceDetailRepository.openRegistration(raceId);
  },

  async closeRegistration(raceId) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return raceDetailRepository.closeRegistration(raceId);
  },
};
