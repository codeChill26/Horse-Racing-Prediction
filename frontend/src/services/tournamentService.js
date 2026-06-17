/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tournamentRepository } from "../repositories/tournamentRepository";

export const tournamentService = {
  async getTournamentsList(status) {
    return tournamentRepository.getAll(status ?? "ALL");
  },

  /**
   * Public tournament list (OPEN / ONGOING / FINISHED) — dùng cho các role khác
   * ngoài Admin. Sử dụng trang Horse Owner / Spectator trang chủ.
   */
  async getPublicTournaments() {
    return tournamentRepository.getPublicTournaments();
  },

  async getTournamentById(id) {
    return tournamentRepository.getById(id);
  },

  async createTournament(data) {
    const name = (data?.name ?? "").trim();
    if (!name) throw new Error("Tên giải đấu là bắt buộc");

    return tournamentRepository.create({
      name,
      description: data.description?.trim() || undefined,
      startAt: data.startAt || undefined,
      endAt: data.endAt || undefined,
    });
  },

  async updateTournament(id, data) {
    const payload = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.description !== undefined) payload.description = data.description.trim();
    if (data.startAt !== undefined) payload.startAt = data.startAt || null;
    if (data.endAt !== undefined) payload.endAt = data.endAt || null;

    if (Object.keys(payload).length === 0) {
      throw new Error("Cần ít nhất một trường để cập nhật");
    }

    return tournamentRepository.update(id, payload);
  },

  async changeTournamentStatus(id, status, cancelReason) {
    if (!status) throw new Error("Trạng thái là bắt buộc");
    return tournamentRepository.updateStatus(id, status, cancelReason);
  },

  async deleteTournament(id, reason) {
    return tournamentRepository.delete(id, reason);
  },

  /** @deprecated mock flow — dùng createTournament */
  async createNewTournament(data) {
    return this.createTournament({
      name: data.tournamentName,
      description: data.location ? `${data.location} · ${data.dates ?? ""}` : data.dates,
    });
  },
};
