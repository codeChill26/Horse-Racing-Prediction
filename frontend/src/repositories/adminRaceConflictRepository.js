/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Race Conflict Repository — Flow 4 + mobile parity.
 *
 * Endpoint ánh xạ (xem backend/src/routes/admin/races.js + adminReferee.controller.js):
 *  - GET  /api/admin/races/:id/review-conflict  → reviewConflict
 *      resp: { success, data: { refereeSubmissions, officialRaceResult, ... } }
 *  - POST /api/admin/races/:id/resolve-conflict → resolveConflict
 *      body: { finalResults: [{ entryId, rank }], reason: '...' }
 *      resp: { success, message, data: race }    // race.status === 'FINISHED'
 *
 * Lưu ý nghiệp vụ:
 *  - BE chỉ cho phép review/resolve khi race.status === 'PAUSED'.
 *  - reason bắt buộc, tối thiểu 5 ký tự (validate ở DTO).
 *  - finalResults phải là mảng KHÔNG RỖNG.
 *  - Không có mock fallback — luồng admin production.
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
 * Map `RefereeSubmission.rawResults` (jsonb) thành mảng ranking có entryId/rank/status.
 * BE lưu submission.rawResults như jsonb tùy ý — referee FE submit:
 *   [{ entryId, rank, isDnf?, isDq?, finishTime? }, ...]
 */
function mapSubmissionRanking(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && r.entryId != null)
    .map((r) => ({
      entryId: Number(r.entryId),
      rank: r.rank != null ? Number(r.rank) : null,
      status: r.status ?? (r.isDq ? "DQ" : r.isDnf ? "DNF" : null),
      isDnf: r.isDnf === true,
      isDq: r.isDq === true,
      finishTime: r.finishTime != null ? Number(r.finishTime) : null,
    }));
}

function mapConflictSubmission(sub) {
  if (!sub) return null;
  return {
    submissionId: sub.submissionId ?? sub.id ?? null,
    refereeId: sub.refereeId ?? sub.referee?.userId ?? null,
    refereeName: sub.referee?.fullName ?? null,
    refereeEmail: sub.referee?.email ?? null,
    submittedAt: sub.submittedAt ?? null,
    note: sub.note ?? null,
    rankings: mapSubmissionRanking(sub.rawResults),
  };
}

/**
 * Chuẩn hoá response BE getConflictReviewData:
 *   { refereeSubmissions: [{ referee: {...}, rawResults, submittedAt, ... }],
 *     officialRaceResult: { matchStatus, finalResults, ... } }
 *
 * → FE shape:
 *   { submissions: [{ refereeId, refereeName, rankings: [{entryId, rank, status}], ... }],
 *     matchStatus: 'CONFLICTED' | 'AUTO_MATCHED' | 'RESOLVED' }
 */
function mapConflictReview(raw = {}) {
  const subs = Array.isArray(raw.refereeSubmissions)
    ? raw.refereeSubmissions.map(mapConflictSubmission).filter(Boolean)
    : [];
  const official = raw.officialRaceResult ?? {};

  // alreadyAgreed = 2 submission đồng thuận, không cần resolve
  const alreadyAgreed =
    subs.length >= 2 &&
    subs[0].rankings.length > 0 &&
    subs.every((s) =>
      s.rankings.every((r) => r.rank != null && !r.isDnf && !r.isDq)
    ) &&
    (() => {
      // So sánh entryId ↔ rank giữa submission[0] và submission[1]
      if (subs.length < 2) return false;
      const a = subs[0].rankings;
      const b = subs[1].rankings;
      if (a.length !== b.length) return false;
      const mapA = new Map(a.map((r) => [r.entryId, r.rank]));
      return b.every((r) => mapA.get(r.entryId) === r.rank);
    })();

  return {
    raceId: raw.raceId ?? null,
    raceName: raw.name ?? null,
    matchStatus: official.matchStatus ?? null,
    finalResults: Array.isArray(official.finalResults) ? official.finalResults : [],
    alreadyAgreed,
    submissions: subs,
  };
}

export const adminRaceConflictRepository = {
  /**
   * GET /api/admin/races/:id/review-conflict
   * Trả về dữ liệu side-by-side 2 referee submission.
   */
  async reviewConflict(raceId) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    const res = await fetch(`/api/admin/races/${raceId}/review-conflict`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được dữ liệu đối chiếu");
    const data = await res.json();
    return mapConflictReview(data?.data ?? data);
  },

  /**
   * POST /api/admin/races/:id/resolve-conflict
   * @param {string|number} raceId
   * @param {{ finalResults: {entryId:number, rank:number}[], reason: string }} payload
   */
  async resolveConflict(raceId, { finalResults, reason }) {
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!Array.isArray(finalResults) || finalResults.length === 0) {
      throw new Error("Bắt buộc nhập thứ hạng cho ít nhất 1 ngựa");
    }
    if (!reason || !String(reason).trim()) {
      throw new Error("Lý do bắt buộc nhập");
    }
    if (String(reason).trim().length < 5) {
      throw new Error("Lý do phải có ít nhất 5 ký tự");
    }

    const normalized = finalResults
      .filter((r) => r && r.entryId != null && r.rank != null)
      .map((r) => ({
        entryId: Number(r.entryId),
        rank: Number(r.rank),
      }));

    if (normalized.length === 0) {
      throw new Error("Không có dữ liệu thứ hạng hợp lệ để ghi đè");
    }

    const res = await fetch(`/api/admin/races/${raceId}/resolve-conflict`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ finalResults: normalized, reason: String(reason).trim() }),
    });
    if (!res.ok) await readError(res, "Xử lý tranh chấp thất bại");
    const data = await res.json();
    return data?.data ?? data?.race ?? data;
  },
};
