/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { userRepository } from "../repositories/userRepository";

export const userService = {
    async getUsersList() {
        return await userRepository.getAll();
    },

    async createRefereeUser(name, email, certification) {
        if (!name || !email) {
            throw new Error("Tên và Email là bắt buộc");
        }
        return await userRepository.createUser({
            userName: name,
            userEmail: email,
            userRole: "Referee",
            status: "Active",
            certification: certification
        });
    },

    async lockUnlockUser(id, currentStatus) {
        const nextStatus = currentStatus === "Active" ? "Locked" : "Active";
        return await userRepository.updateUserStatus(id, nextStatus);
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
