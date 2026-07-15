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

    let startAt;
    if (data?.startAt) {
      const d = new Date(data.startAt);
      if (Number.isNaN(d.getTime())) {
        throw new Error("Thời điểm bắt đầu không hợp lệ");
      }
      startAt = d.toISOString();
    }
    let endAt;
    if (data?.endAt) {
      const d = new Date(data.endAt);
      if (Number.isNaN(d.getTime())) {
        throw new Error("Thời điểm kết thúc không hợp lệ");
      }
      endAt = d.toISOString();
    }
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      throw new Error("Thời điểm kết thúc phải sau thời điểm bắt đầu");
    }

    return tournamentRepository.create({
      name,
      description: data.description?.trim() || undefined,
      startAt,
      endAt,
    });
  },

  async updateTournament(id, data) {
    const payload = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.description !== undefined) payload.description = data.description.trim();

    let startAt;
    if (data.startAt !== undefined) {
      if (!data.startAt) {
        startAt = null;
      } else {
        const d = new Date(data.startAt);
        if (Number.isNaN(d.getTime())) {
          throw new Error("Thời điểm bắt đầu không hợp lệ");
        }
        startAt = d.toISOString();
      }
    }
    let endAt;
    if (data.endAt !== undefined) {
      if (!data.endAt) {
        endAt = null;
      } else {
        const d = new Date(data.endAt);
        if (Number.isNaN(d.getTime())) {
          throw new Error("Thời điểm kết thúc không hợp lệ");
        }
        endAt = d.toISOString();
      }
    }
    if (startAt) payload.startAt = startAt;
    if (endAt !== undefined) payload.endAt = endAt;
    if (data.startAt !== undefined && data.startAt === "") payload.startAt = null;
    if (data.endAt !== undefined && data.endAt === "") payload.endAt = null;
    if (payload.startAt && payload.endAt && new Date(payload.endAt) <= new Date(payload.startAt)) {
      throw new Error("Thời điểm kết thúc phải sau thời điểm bắt đầu");
    }

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

  /**
   * GET /api/admin/tournaments/:id/entries
   * Lấy entries đã APPROVED của tournament
   */
  async getTournamentEntries(tournamentId) {
    if (!tournamentId) throw new Error("Thiếu mã giải đấu");
    return tournamentRepository.getTournamentEntries(tournamentId);
  },

  /**
   * POST /api/admin/tournaments/:id/notify-owners
   * Gửi thông báo đến horse owners
   */
  async notifyHorseOwners(tournamentId, message) {
    if (!tournamentId) throw new Error("Thiếu mã giải đấu");
    const trimmedMsg = message ? String(message).trim() : "";
    if (!trimmedMsg) {
      throw new Error("Nội dung thông báo là bắt buộc");
    }
    if (trimmedMsg.length > 500) {
      throw new Error("Nội dung thông báo tối đa 500 ký tự");
    }
    return tournamentRepository.notifyHorseOwners(tournamentId, trimmedMsg);
  },

  /**
   * POST /api/admin/tournaments/:id/assign-referees
   * Assign referees cho tournament
   */
  async assignRefereesToTournament(tournamentId, refereeAId, refereeBId) {
    if (!tournamentId) throw new Error("Thiếu mã giải đấu");
    if (!refereeAId) throw new Error("Thiếu mã trọng tài A");
    if (!refereeBId) throw new Error("Thiếu mã trọng tài B");
    if (refereeAId === refereeBId) {
      throw new Error("Hai trọng tài phải khác nhau");
    }
    return tournamentRepository.assignReferees(tournamentId, {
      refereeAId,
      refereeBId,
    });
  },
};
