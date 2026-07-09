/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository cho Referee — tổng hợp dữ liệu từ mock.
 * Pattern giống các repository khác trong dự án.
 *
 * TODO: Khi backend cung cấp APIs, thay thế các mock bằng fetch thật.
 */

import { getAccessToken } from "../utils/token";
import {
  MOCK_ASSIGNED_RACES,
  MOCK_MY_SUBMISSIONS,
  MOCK_CONFLICTS,
  MOCK_REFEREE_PROFILE,
} from "../data/mockRefereeData";

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Referee Race Repository
 * TODO: Backend chưa có APIs riêng cho referee.
 * Hiện dùng mock data + local state management.
 */
export const refereeRaceRepository = {
  /**
   * Lấy danh sách race được phân công cho referee hiện tại.
   * MOCK: Trả về MOCK_ASSIGNED_RACES.
   *
   * Backend khi có sẽ cần: GET /api/referees/me/races
   */
  async getAssignedRaces() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/referees/me/races', { headers: authHeaders() });
    // if (!res.ok) await readError(res, 'Không tải được race được phân công');
    // return (await res.json()).races;
    await delay(400);
    return structuredClone(MOCK_ASSIGNED_RACES);
  },

  /**
   * Lấy chi tiết race để điều khiển.
   * MOCK: Tìm trong mock theo raceId.
   *
   * Backend khi có sẽ cần: GET /api/referees/me/races/:raceId
   */
  async getRaceControlDetail(raceId) {
    await delay(300);
    const race = MOCK_ASSIGNED_RACES.find(
      (r) => String(r.id) === String(raceId) || r.raceId === Number(raceId),
    );
    if (!race) throw new Error("Không tìm thấy race");
    return structuredClone(race);
  },

  /**
   * Start race — chuyển trạng thái từ Scheduled → InProgress.
   * MOCK: Cập nhật local state.
   *
   * Backend khi có sẽ cần: POST /api/referees/races/:raceId/start
   */
  async startRace(raceId) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/referees/races/${raceId}/start`, {
    //   method: 'POST', headers: authHeaders(),
    // });
    // if (!res.ok) await readError(res, 'Không thể bắt đầu race');
    // return await res.json();
    void raceId; // currently unused, kept for signature stability
    await delay(600);
    return { message: "Race đã bắt đầu", status: "InProgress" };
  },
};

/**
 * Referee Submission Repository
 */
export const refereeSubmissionRepository = {
  /**
   * Gửi kết quả leg.
   * MOCK: Lưu vào localStorage.
   *
   * Backend khi có sẽ cần: POST /api/referees/races/:raceId/legs/:legId/results
   */
  async submitLegResult({ raceId, legId, results, refereeNote }) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/referees/races/${raceId}/legs/${legId}/results`, {
    //   method: 'POST',
    //   headers: authHeaders(),
    //   body: JSON.stringify({ results, refereeNote }),
    // });
    // if (!res.ok) await readError(res, 'Gửi kết quả thất bại');
    // return await res.json();
    await delay(800);

    const entry = {
      raceId,
      legId,
      results,
      refereeNote,
      submittedAt: new Date().toISOString(),
      comparisonStatus: "WaitingOtherReferee",
    };

    const KEY = `referee_submissions_${raceId}_${legId}`;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(entry));
    } catch { /* quota */ }

    return {
      message: "Kết quả đã được gửi. Bạn không thể chỉnh sửa sau khi submit.",
      entry,
    };
  },

  /**
   * Lấy lịch sử submission của referee hiện tại.
   * MOCK: Trả về MOCK_MY_SUBMISSIONS.
   *
   * Backend khi có sẽ cần: GET /api/referees/me/submissions
   */
  async getMySubmissions() {
    // TODO: Replace mock with real API
    await delay(400);
    return structuredClone(MOCK_MY_SUBMISSIONS);
  },
};

/**
 * Referee Conflict Repository
 */
export const refereeConflictRepository = {
  /**
   * Lấy danh sách conflict.
   * MOCK: Trả về MOCK_CONFLICTS.
   *
   * Backend khi có sẽ cần: GET /api/referees/me/conflicts
   */
  async getConflicts() {
    // TODO: Replace mock with real API
    await delay(400);
    return structuredClone(MOCK_CONFLICTS);
  },
};

/**
 * Referee Profile Repository
 */
export const refereeProfileRepository = {
  /**
   * Lấy profile referee.
   * MOCK: Trả về MOCK_REFEREE_PROFILE.
   *
   * Có thể dùng GET /api/auth/profile (endpoint thật) làm fallback.
   */
  async getProfile() {
    // Thử dùng API thật trước
    try {
      const res = await fetch("/api/auth/profile", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        // Bổ sung stats mock
        return {
          ...data.user,
          stats: {
            totalRacesAssigned: 24,
            totalLegsSubmitted: 67,
            autoMatchedRate: 82.1,
            conflictCount: 5,
            pendingConflicts: 1,
          },
        };
      }
    } catch { /* fallback to mock */ }

    // TODO: Replace mock with real API when backend provides /api/referees/me/profile
    await delay(300);
    return structuredClone(MOCK_REFEREE_PROFILE);
  },
};
