/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { adminWalletRepository } from "../repositories/adminWalletRepository";

export const adminWalletService = {
  /**
   * Lấy danh sách tất cả ví kèm số dư thực tế từ backend.
   * Gọi GET /api/admin/wallets (đã include balance, isFrozen, user info).
   */
  async getAllWallets() {
    return adminWalletRepository.listAll();
  },

  async getTransactions() {
    return adminWalletRepository.getTransactions();
  },

  async getUserTransactions(userId) {
    return adminWalletRepository.getUserTransactions(userId);
  },

  /**
   * Điều chỉnh điểm: amount dương là cộng, âm là trừ.
   * Lý do bắt buộc để phục vụ audit.
   */
  async adjustPoints({ userId, amount, reason }) {
    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error("Số điểm điều chỉnh phải khác 0");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Cần nhập lý do điều chỉnh để lưu vết kiểm toán");
    }
    return adminWalletRepository.adjust({ userId, amount, reason: reason.trim() });
  },
};
