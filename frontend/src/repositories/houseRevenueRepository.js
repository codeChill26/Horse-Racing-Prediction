/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository cho doanh thu nhà cái (Admin).
 *   GET /api/admin/house-revenue -> { houseRevenue, treasurePool, totalHouseFunds, updatedAt }
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

export const houseRevenueRepository = {
  async getHouseRevenue() {
    const token = getAccessToken();
    const res = await fetch("/api/admin/house-revenue", {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!res.ok) await readError(res, "Không tải được doanh thu nhà cái");
    return res.json();
  },

  async getHouseRevenueTransactions({ limit = 50, offset = 0 } = {}) {
    const token = getAccessToken();
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const res = await fetch(`/api/admin/house-revenue/transactions?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!res.ok) await readError(res, "Không tải được sổ cái nhà cái");
    return res.json();
  },
};
