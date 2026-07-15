/**
 * Race Results Service — xử lý nghiệp vụ kết quả race cho Spectator.
 * Không có business logic phức tạp, chủ yếu wrapper + validation.
 */

import { raceResultsRepository } from '../repositories/raceResultsRepository';

export const raceResultsService = {
  /**
   * Lấy kết quả chi tiết race.
   * @param {string|number} raceId
   * @returns {Promise<{ raceId, raceName, status, results: [...] }>}
   */
  async getRaceResults(raceId) {
    if (!raceId && raceId !== 0) throw new Error('raceId là bắt buộc');
    return raceResultsRepository.getRaceResults(raceId);
  },

  /**
   * Lấy danh sách race results của tournament.
   * @param {string|number} tournamentId
   * @returns {Promise<Array>}
   */
  async getTournamentRaceResults(tournamentId) {
    if (!tournamentId && tournamentId !== 0) throw new Error('tournamentId là bắt buộc');
    return raceResultsRepository.getTournamentRaceResults(tournamentId);
  },

  /**
   * Định dạng status hiển thị.
   */
  getStatusLabel(status) {
    const map = {
      FINISHED: 'Đã kết thúc',
      PENDING_RESULT: 'Chờ công bố',
      IN_PROGRESS: 'Đang diễn ra',
      SCHEDULED: 'Sắp bắt đầu',
      CANCELLED: 'Đã hủy',
      PAUSED: 'Tạm dừng',
    };
    return map[status] || status || '—';
  },

  /**
   * Badge variant theo status.
   */
  getStatusVariant(status) {
    const s = String(status || '').toUpperCase();
    const map = {
      FINISHED: 'success',
      PENDING_RESULT: 'warn',
      IN_PROGRESS: 'info',
      SCHEDULED: 'muted',
      CANCELLED: 'danger',
      PAUSED: 'warn',
    };
    return map[s] || 'muted';
  },
};
