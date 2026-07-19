/**
 * Repository cho Deviation/Discrepancy — Flow 5 (Discrepancy Resolution)
 *
 * Endpoint backend (adminRefereeService):
 *   - GET  /api/admin/deviations?status=...&page=...&pageSize=...
 *   - GET  /api/admin/deviations/:id
 *   - POST /api/admin/deviations/:id/resolve
 *       body: { finalResults: [selected ranking], reason: '...' (BẮT BUỘC) }
 */

import { getAccessToken } from "../utils/token";

async function readError(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`);
}

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Chuẩn hoá response BE OfficialRaceResult → shape FE components đang dùng.
 *
 * BE shape (từ getDeviationDetail):
 *   { officialResultId, raceId, matchStatus, finalResults, resolveReason,
 *     race: { raceId, name, refereeA, refereeB, refereeSubmissions, entries } }
 *
 * FE shape:
 *   { id, raceId, raceName, status, matchStatus, race: { refereeSubmissions, entries }, ... }
 */
function mapDeviationResponse(v = {}) {
  if (!v) return null;

  const raceData = v.race || {};
  const refereeSubmissions = raceData.refereeSubmissions || [];
  const refereeAData = raceData.refereeA;
  const refereeBData = raceData.refereeB;
  const entries = raceData.entries || [];

  // Map entries với horse name và jockey name
  // Backend trả về entries đã flatten: { entryId, horseId, horseName, jockeyId, jockeyName, ... }
  // Không còn sub-object e.horse hay e.jockey
  const entriesMap = (entries || []).map(e => ({
    entryId: e.entryId,
    horseId: e.horseId ?? e.horse?.horseId,
    horseName: e.horseName || e.horse?.name || `Entry #${e.entryId}`,
    jockeyName: e.jockeyName || e.jockey?.fullName || null,
    jockeyId: e.jockeyId ?? e.jockey?.userId ?? null,
  }));

  // Parse rawResults để lấy rank/status cho mỗi entry
  const parseResults = (rawResults) => {
    if (!Array.isArray(rawResults)) return {};
    const map = {};
    rawResults.forEach(r => {
      map[r.entryId] = {
        rank: r.rank || null,
        status: r.status || (r.isDq ? 'DQ' : r.isDnf ? 'DNF' : null),
        isDnf: r.isDnf || false,
        isDq: r.isDq || false,
      };
    });
    return map;
  };

  // Map referee submissions với referee names
  const mappedSubmissions = refereeSubmissions.map((s, idx) => {
    const refereeData = idx === 0 ? refereeAData : refereeBData;
    return {
      ...s,
      submittedByName: refereeData?.fullName || "—",
      submittedById: refereeData?.userId || null,
      parsedResults: parseResults(s.rawResults),
    };
  });

  return {
    id: v.officialResultId || v.id,
    raceId: v.raceId ?? raceData.raceId,
    raceName: v.raceName || raceData.name || "—",
    matchStatus: v.matchStatus,
    status: v.matchStatus === 'CONFLICTED' ? 'PENDING' : v.matchStatus === 'RESOLVED' ? 'RESOLVED' : 'PENDING',
    finalResults: v.finalResults,
    resolveReason: v.resolveReason,
    resolvedById: v.resolvedById,
    createdAt: v.createdAt,
    raceLegs: v.raceLegs || [],
    race: {
      raceId: raceData.raceId,
      name: raceData.name || v.raceName,
      refereeA: refereeAData,
      refereeB: refereeBData,
      refereeSubmissions: mappedSubmissions,
      entries: entriesMap,
    },
    entries: entriesMap,
    reporterA: v.reporterA || (refereeAData ? { fullName: refereeAData.fullName, userId: refereeAData.userId } : null),
    reporterB: v.reporterB || (refereeBData ? { fullName: refereeBData.fullName, userId: refereeBData.userId } : null),
  };
}

export const deviationRepository = {
  /**
   * GET /api/admin/deviations?status=CONFLICTED&page=1&pageSize=50
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    // Nếu không có status filter, không set để lấy tất cả
    if (filters.status) params.set('status', filters.status);
    params.set('page', filters.page || '1');
    params.set('pageSize', filters.pageSize || '100');

    const res = await fetch(`/api/admin/deviations?${params}`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách sai lệch");

    const data = await res.json();
    // Backend trả về { total, page, pageSize, deviations }
    const deviations = Array.isArray(data.deviations) ? data.deviations : [];
    return deviations.map(mapDeviationResponse);
  },

  /**
   * GET /api/admin/deviations/:id
   */
  async getById(id) {
    console.log('[Repository] getById called with id:', id);
    const res = await fetch(`/api/admin/deviations/${id}`, { headers: authHeaders() });
    console.log('[Repository] Response status:', res.status);
    if (!res.ok) await readError(res, "Không tải được chi tiết sai lệch");
    const data = await res.json();
    console.log('[Repository] Raw data has entries:', data?.race?.entries?.length);
    console.log('[Repository] Raw data has submissions:', data?.race?.refereeSubmissions?.length);
    const mapped = mapDeviationResponse(data);
    console.log('[Repository] Mapped deviation has entries:', mapped?.entries?.length);
    console.log('[Repository] Mapped deviation has race.entries:', mapped?.race?.entries?.length);
    return mapped;
  },

  /**
   * POST /api/admin/deviations/:id/resolve
   * body: { finalResults, reason: BẮT BUỘC }
   */
  async resolveDeviation(id, payload = {}) {
    const { finalResults, reason } = payload;
    const res = await fetch(`/api/admin/deviations/${id}/resolve`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ finalResults, reason }),
    });
    if (!res.ok) await readError(res, "Xử lý sai lệch thất bại");
    return res.json();
  },

  /** POST /api/admin/deviations/:id/reject — not implemented yet */
  async rejectDeviation(_id, _reason = "") {
    throw new Error("Chức năng bác bỏ chưa được hỗ trợ");
  },

  /** POST /api/admin/deviations/:id/start-review — not needed, auto PAUSED */
  async startReview(_id) {
    throw new Error("Chức năng bắt đầu xem xét chưa được hỗ trợ");
  },
};
