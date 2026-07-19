/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { adminRaceBetsRepository } from "../repositories/adminRaceBetsRepository";

export const adminRaceBetsService = {
  /**
   * Lấy danh sách spectators đã đặt cược cho 1 race.
   * Returns: { race, predictions, totalBetAmount, totalBettors }
   */
  async getRacePredictions(raceId) {
    if (raceId === undefined || raceId === null || raceId === "") {
      throw new Error("raceId is required");
    }
    return adminRaceBetsRepository.getRacePredictions(raceId);
  },

  /**
   * Lấy lịch sử ví của các spectators đã đặt cược cho 1 race.
   * Returns: { race, spectators: [{ spectatorId, fullName, email, transactions: [...] }] }
   */
  async getRaceWalletActivity(raceId) {
    if (raceId === undefined || raceId === null || raceId === "") {
      throw new Error("raceId is required");
    }
    return adminRaceBetsRepository.getRaceWalletActivity(raceId);
  },
};