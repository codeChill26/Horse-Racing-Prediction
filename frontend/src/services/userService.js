/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { listAdminUsers, toggleAdminUserActive, createAdminUser } from "../api/admin";
import { userRepository } from "../repositories/userRepository";

export const userService = {
    async getUsersList() {
        return listAdminUsers();
    },

    async createRefereeUser(name, email, certification) {
        if (!name || !email) {
            throw new Error("Tên và Email là bắt buộc");
        }
        return createAdminUser({
            fullName: name,
            email,
            password: "ChangeMe123",
            roleCode: "RACE_REFEREE",
            bio: certification || undefined,
        });
    },

    async lockUnlockUser(id) {
        return toggleAdminUserActive(id);
    },

    async getSpectatorWalletDetails() {
        return await userRepository.getWallet();
    },

    async executeWalletTransaction(amount, reason, initiator) {
        if (!amount || isNaN(amount)) {
            throw new Error("Số điểm giao dịch không đúng cấu trúc hạch toán");
        }
        return await userRepository.addWalletTransaction(
            parseInt(amount, 10),
            reason || "Giao dịch hành chính",
            initiator || "System Admin"
        );
    }
};
