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

export const adminWalletRepository = {
  // Lấy danh sách tất cả ví kèm số dư thực tế (từ backend)
  // GET /api/admin/wallets
  async listAll() {
    const res = await fetch(`/api/admin/wallets`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách ví");
    const data = await res.json();
    return Array.isArray(data?.wallets) ? data.wallets : [];
  },

  // Lấy tổng hợp giao dịch toàn hệ thống (Admin)
  // GET /api/admin/wallets/transactions
  async getTransactions() {
    const res = await fetch(`/api/admin/wallets/transactions`, {
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không tải được lịch sử giao dịch");
    const data = await res.json();
    return data?.transactions ?? data?.items ?? [];
  },

  // Lấy danh sách ví theo userId
  // GET /api/admin/wallets/:userId/transactions
  async getUserTransactions(userId) {
    const res = await fetch(
      `/api/admin/wallets/${userId}/transactions`,
      { headers: authHeaders() }
    );
    if (!res.ok) await readError(res, "Không tải được lịch sử giao dịch của người dùng");
    const data = await res.json();
    return data?.transactions ?? data?.items ?? [];
  },

  // Điều chỉnh điểm (cộng/trừ) cho ví của người dùng
  // POST /api/admin/wallets/:userId/adjust
  // body: { amount: int (positive=add, negative=subtract), reason: string }
  async adjust({ userId, amount, reason }) {
    const res = await fetch(
      `/api/admin/wallets/${userId}/adjust`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, reason }),
      }
    );
    if (!res.ok) await readError(res, "Điều chỉnh ví thất bại");
    const data = await res.json();
    return data?.wallet ?? data?.transaction ?? data;
  },
};
