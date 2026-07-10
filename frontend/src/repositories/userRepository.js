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
    Authorization: `Bearer ${token}`,
  };
}

export const userRepository = {
  async getAll() {
    // We can use the existing admin API here or the new one if standard
    const res = await fetch(`/api/admin/users`, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được danh sách người dùng");
    const data = await res.json();
    return Array.isArray(data?.users) ? data.users : [];
  },

  async createUser(userData) {
    const res = await fetch(`/api/admin/users`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) await readError(res, "Tạo người dùng thất bại");
    const data = await res.json();
    return data?.user ?? data;
  },

  async updateUserStatus(userId) {
    // Assuming status mapping to isActive for now, or actual API call if exists
    // Using the toggle active from admin API for simplicity, as per previous implementation
    const res = await fetch(`/api/admin/users/${userId}/toggle-active`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Đổi trạng thái thất bại");
    const data = await res.json();
    return data?.user ?? data;
  },

  async getWallet() {
    // Mock implementation as descriptionAPI doesn't have explicit wallet API
    return {
      balance: 1000000,
      transactions: [],
    };
  },

  async addWalletTransaction(amount, reason, initiator) {
    // Mock implementation
    return {
      transactionId: Math.random().toString(36).substr(2, 9),
      amount,
      reason,
      initiator,
      createdAt: new Date().toISOString(),
    };
  },
};
