/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Race Detail Service
 *
 * Service layer cho race detail management.
 *
 * Mock fallback: chỉ chạy khi env `VITE_FALLBACK_TO_MOCK=true`.
 * Mặc định throw lỗi lên page để hiển thị cho user (xem raceDetailRepository.withFallback).
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

  async getAiOdds(raceId, margin) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    return raceDetailRepository.getAiOdds(raceId, margin);
  },

  async getRiskScore(raceId, treasury) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    if (treasury === undefined || treasury === null || treasury === "") {
      throw new Error("Vốn nhà cái (treasury) là bắt buộc");
    }
    return raceDetailRepository.getRiskScore(raceId, treasury);
  },

  async applyOddsSuggestions(raceId, entries) {
    if (!raceId) {
      throw new Error("ID chặng đua là bắt buộc");
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error("Danh sách odds là bắt buộc");
    }
    const parsed = entries.map(({ entryId, oddsFinal }) => {
      const parsedOdds = Number(oddsFinal);
      if (!entryId || !Number.isFinite(parsedOdds) || parsedOdds <= 0) {
        throw new Error("Mỗi entry phải có entryId và odds hợp lệ");
      }
      return { entryId, oddsFinal: parsedOdds };
    });
    return raceDetailRepository.applyOddsSuggestions(raceId, parsed);
  },
};
