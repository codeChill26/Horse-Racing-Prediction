/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Repository — gọi API thật tới `/api/referee/*` theo mainflow.md.
 *
 * Endpoint ánh xạ:
 *  - GET  /api/referee/me/races                  → getAssignedRaces
 *  - GET  /api/referee/me/races/:raceId          → getRaceControlDetail
 *  - GET  /api/referee/me/submissions            → getMySubmissions
 *  - GET  /api/referee/me/conflicts              → getConflicts
 *  - GET  /api/referee/me/profile                → getProfile
 *  - POST /api/referee/races/:id/start           → startRace
 *  - POST /api/referee/races/:id/submit          → submitRaceResult
 *
 * NOTE:
 * - Backend dùng status ENUM in hoa (SCHEDULED / IN_PROGRESS / PENDING_RESULT /
 *   PAUSED / FINISHED / CANCELLED). FE phải normalize nếu cần.
 * - Backend đã tự trả về `legs[].mySubmissionStatus` / `otherRefereeStatus`
 *   theo service `getAssignedRaces` ở backend.
 */

import { getAccessToken } from "../utils/token";

function authHeaders(extra = {}) {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extra,
  };
}

async function readError(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  const msg =
    data?.error ||
    data?.message ||
    (typeof data === "string" ? data : null) ||
    `${fallback} (${res.status})`;
  throw new Error(msg);
}

async function getJson(path, params) {
  const url = new URL(path, window.location.origin);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) await readError(res, "Yêu cầu thất bại");
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await readError(res, "Yêu cầu thất bại");
  return res.json();
}

/** Normalize BE enum về dạng phổ biến Capitalized để UI dễ đọc. */
export function normalizeRaceStatus(status) {
  if (!status) return status;
  const map = {
    SCHEDULED: "Scheduled",
    IN_PROGRESS: "InProgress",
    PENDING_RESULT: "PendingResult",
    PAUSED: "Paused",
    FINISHED: "Finished",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
}

/**
 * Race Repository
 */
export const refereeRaceRepository = {
  /**
   * GET /api/referee/me/races?status=...&date=YYYY-MM-DD
   * Trả về danh sách race kèm leg + entries (chuẩn BE).
   */
  async getAssignedRaces(params = {}) {
    const data = await getJson("/api/referee/me/races", params);
    return Array.isArray(data?.races) ? data.races : [];
  },

  /**
   * GET /api/referee/me/races/:raceId
   */
  async getRaceControlDetail(raceId) {
    if (!raceId) throw new Error("Thiếu mã race");
    const data = await getJson(`/api/referee/me/races/${raceId}`);
    return data?.race ?? data;
  },

  /**
   * POST /api/referee/races/:id/start
   * Sau khi gọi, race sẽ chuyển sang IN_PROGRESS và lock cược mới.
   */
  async startRace(raceId) {
    if (!raceId) throw new Error("Thiếu mã race");
    const data = await postJson(`/api/referee/races/${raceId}/start`);
    return data?.race ?? data;
  },
};

/**
 * Submission Repository
 */
export const refereeSubmissionRepository = {
  /**
   * POST /api/referee/races/:id/submit
   * body: { rawResults: [{ entryId, rank, isDnf, isDq }] }
   *
   * Response 3 dạng:
   *  - { status: 'PENDING_PARTNER', message }  (chỉ có 1 người nộp)
   *  - { status: 'AUTO_MATCHED',    message }  (2 người nộp + khớp)
   *  - { status: 'CONFLICTED',      message }  (2 người nộp + lệch)
   */
  async submitRaceResult({ raceId, rawResults }) {
    if (!raceId) throw new Error("Thiếu mã race");
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      throw new Error("Phải có kết quả cho ít nhất một entry");
    }
    const data = await postJson(`/api/referee/races/${raceId}/submit`, {
      rawResults,
    });
    return data;
  },

  /**
   * GET /api/referee/me/submissions
   */
  async getMySubmissions() {
    const data = await getJson("/api/referee/me/submissions");
    return Array.isArray(data?.submissions) ? data.submissions : [];
  },
};

/**
 * Conflict Repository
 */
export const refereeConflictRepository = {
  /**
   * GET /api/referee/me/conflicts
   */
  async getConflicts() {
    const data = await getJson("/api/referee/me/conflicts");
    return Array.isArray(data?.conflicts) ? data.conflicts : [];
  },
};

/**
 * Profile Repository
 */
export const refereeProfileRepository = {
  /**
   * GET /api/referee/me/profile (BE có sẵn — kèm stats race)
   * Nếu thất bại thì fallback về /api/auth/profile.
   */
  async getProfile() {
    try {
      const data = await getJson("/api/referee/me/profile");
      return data?.user ?? data;
    } catch (_err) {
      // fallback
      const data = await getJson("/api/auth/profile");
      const user = data?.user ?? data;
      return {
        ...user,
        stats: {
          totalRacesAssigned: 0,
          totalLegsSubmitted: 0,
          autoMatchedRate: 0,
          conflictCount: 0,
          pendingConflicts: 0,
        },
      };
    }
  },
};

/**
 * Notification Repository
 * - GET    /api/referee/me/notifications
 * - POST   /api/referee/me/notifications/:id/read
 * - POST   /api/referee/me/notifications/read-all
 * - POST   /api/referee/me/notifications/:id/respond { response: 'ACCEPTED'|'REFUSED', reason? }
 */
export const refereeNotificationRepository = {
  async getMyNotifications(params = {}) {
    const data = await getJson("/api/referee/me/notifications", params);
    return Array.isArray(data?.notifications) ? data.notifications : [];
  },

  async markAsRead(notificationId) {
    if (!notificationId) throw new Error("Thiếu mã thông báo");
    return postJson(`/api/referee/me/notifications/${notificationId}/read`);
  },

  async markAllAsRead() {
    return postJson(`/api/referee/me/notifications/read-all`);
  },

  async respondAssignment({ notificationId, response, reason }) {
    if (!notificationId) throw new Error("Thiếu mã thông báo");
    if (!["ACCEPTED", "REFUSED"].includes(response)) {
      throw new Error("response phải là ACCEPTED hoặc REFUSED");
    }
    return postJson(`/api/referee/me/notifications/${notificationId}/respond`, {
      response,
      reason: reason || undefined,
    });
  },
};