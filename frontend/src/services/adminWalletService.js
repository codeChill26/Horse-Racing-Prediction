/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { adminWalletRepository } from "../repositories/adminWalletRepository";
import { userRepository } from "../repositories/userRepository";

export const adminWalletService = {
  /**
   * Lấy danh sách ví theo danh sách người dùng (admin).
   * Khi backend có API /api/admin/wallets để list tất cả ví,
   * nên thay bằng adminWalletRepository.listAll().
   * Hiện tại: tổng hợp từ userRepository + thông tin ví trong user object.
   */
  async getAllWallets() {
    const users = await userRepository.getAll();
    return users.map((u) => ({
      userId: u.userId,
      fullName: u.fullName,
      email: u.email,
      role: u.role?.code,
      isActive: u.isActive,
      wallet: u.wallet ?? {
        balance: 0,
        isFrozen: 0,
        updatedAt: u.updatedAt,
      },
    }));
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
