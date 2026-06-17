/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { raceRepository } from "../repositories/raceRepository";

export const raceService = {
  async getRacesList() {
    return await raceRepository.getAll();
  },

  async getRacesByTournament(tournamentId) {
    if (!tournamentId) return [];
    return await raceRepository.getRacesByTournament(tournamentId);
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

    async executeCloseRegistration() {
        return await raceRepository.closeRegistration();
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
