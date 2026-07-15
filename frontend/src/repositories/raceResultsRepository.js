/**
 * Race Results Repository — Spectator xem kết quả race đã kết thúc.
 * Endpoint công khai (không yêu cầu auth).
 */

async function readError(res, fallback) {
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`);
}

export const raceResultsRepository = {
  /**
   * GET /api/public/races/:id/results
   * Lấy kết quả chi tiết 1 race (rank, status, horse/jockey info).
   */
  async getRaceResults(raceId) {
    const res = await fetch(`/api/public/races/${raceId}/results`);
    if (!res.ok) await readError(res, 'Không tải được kết quả cuộc đua');
    return res.json();
  },

  /**
   * GET /api/public/tournaments/:id/race-results
   * Lấy danh sách race results của 1 tournament (chỉ races đã FINISHED).
   */
  async getTournamentRaceResults(tournamentId) {
    const res = await fetch(`/api/public/tournaments/${tournamentId}/race-results`);
    if (!res.ok) await readError(res, 'Không tải được kết quả giải đấu');
    const data = await res.json();
    return data?.races ?? [];
  },
};
