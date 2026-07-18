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

export const adminRaceBetsRepository = {
  // GET /api/admin/races/:raceId/predictions
  async getRacePredictions(raceId) {
    if (!raceId) throw new Error("raceId is required");
    const res = await fetch(
      `/api/admin/races/${raceId}/predictions`,
      { headers: authHeaders() }
    );
    if (!res.ok) await readError(res, "Không tải được danh sách đặt cược của race");
    return res.json();
  },

  // GET /api/admin/races/:raceId/wallet-activity
  async getRaceWalletActivity(raceId) {
    if (!raceId) throw new Error("raceId is required");
    const res = await fetch(
      `/api/admin/races/${raceId}/wallet-activity`,
      { headers: authHeaders() }
    );
    if (!res.ok) await readError(res, "Không tải được lịch sử ví của race");
    return res.json();
  },
};