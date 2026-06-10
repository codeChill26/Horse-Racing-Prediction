/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

export const raceRepository = {
  // Public
  async getAll() {
    const res = await fetch(`/api/races`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách cuộc đua");
    const data = await res.json();
    return data?.races ?? [];
  },

  async createRace(raceData) {
    const res = await fetch(`/api/admin/races`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(raceData),
    });
    if (!res.ok) await readError(res, "Tạo cuộc đua thất bại");
    const data = await res.json();
    return data?.race ?? data;
  },

  // Entries
  async getEntries() {
    const res = await fetch(`/api/admin/entries`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách đơn đăng ký");
    const data = await res.json();
    return data?.entries ?? [];
  },

  async updateEntryStatus(entryId, status, reason = null) {
    const body = { status };
    if (reason) body.reason = reason;

    const res = await fetch(`/api/entries/${entryId}/status`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await readError(res, "Cập nhật trạng thái đơn đăng ký thất bại");
    const data = await res.json();
    return data?.entry ?? data;
  },

  async closeRegistration(raceId) {
    const res = await fetch(`/api/admin/races/${raceId}/registration-gate`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ isOpen: false }),
    });
    if (!res.ok) await readError(res, "Đóng cổng đăng ký thất bại");
    const data = await res.json();
    return data;
  },

  // Mock implementation for discrepancy and violations as they are not explicitly defined in descriptionAPI.md
  async getDiscrepancy() {
    return {
      id: 1,
      details: "Mock discrepancy",
    };
  },

  async solveDiscrepancy(overrideVerdict) {
    return {
      status: "Resolved",
      verdict: overrideVerdict,
    };
  },

  async getViolations() {
    return [];
  },

  async handleViolation(caseId, verdict) {
    return {
      caseId,
      status: verdict,
    };
  },
};
