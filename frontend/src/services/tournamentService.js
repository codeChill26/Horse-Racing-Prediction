/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tournamentRepository } from "../repositories/tournamentRepository";

export const tournamentService = {
    async getTournamentsList() {
        return await tournamentRepository.getAll();
    },

    async createNewTournament(data) {
        if (!data.tournamentName || !data.location || !data.dates) {
            throw new Error("Tên giải đấu, địa điểm và thời gian diễn ra là bắt buộc");
        }
        return await tournamentRepository.create(data);
    }
};
