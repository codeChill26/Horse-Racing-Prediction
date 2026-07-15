/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service cho Horse (Flow 1 — Horse Registration & Approval)
 *
 * Validation client-side bằng tiếng Việt, BE là nguồn quyết định cuối cùng.
 */

import { horseRepository } from "../repositories/horseRepository";

const VALID_HORSE_STATUS = ["PENDING", "APPROVED", "REJECTED", "INACTIVE", "ALL"];

export const horseService = {
  // ============================================================
  // Owner side
  // ============================================================

  /** GET /api/horses/mine — danh sách ngựa của owner đang đăng nhập */
  async getMyHorses() {
    return horseRepository.getMine();
  },

  /**
   * POST /api/horses — tạo yêu cầu đăng ký ngựa mới
   * @param {{ name: string, breed?: string, dateOfBirth?: string, sex?: string, color?: string, imageUrl?: string }} payload
   * @returns {Promise<{ horseId, status: 'PENDING', ... }>}
   */
  async registerNewHorseDirect(payload = {}) {
    const name = (payload.name || "").trim();
    if (!name) {
      throw new Error("Tên ngựa là bắt buộc");
    }
    const body = { name };
    if (payload.breed && String(payload.breed).trim()) {
      body.breed = String(payload.breed).trim();
    }
    if (payload.dateOfBirth) {
      const d = new Date(payload.dateOfBirth);
      if (Number.isNaN(d.getTime())) {
        throw new Error("Ngày sinh không hợp lệ");
      }
      if (d.getTime() >= Date.now()) {
        throw new Error("Ngày sinh phải ở trong quá khứ");
      }
      body.dateOfBirth = payload.dateOfBirth;
    }
    if (payload.sex) {
      body.sex = payload.sex;
    }
    if (payload.color && String(payload.color).trim()) {
      body.color = String(payload.color).trim();
    }
    if (payload.imageUrl && String(payload.imageUrl).trim()) {
      body.imageUrl = String(payload.imageUrl).trim();
    }

    const horse = await horseRepository.create(body);
    return horse;
  },

  // ============================================================
  // Admin side
  // ============================================================

  /** GET /api/admin/horses?status=... */
  async getHorsesList(status = "ALL") {
    const normalized = (status || "ALL").toUpperCase();
    if (!VALID_HORSE_STATUS.includes(normalized)) {
      throw new Error("Trạng thái lọc không hợp lệ");
    }
    return horseRepository.getAll(normalized);
  },

  /** GET /api/admin/horses/:id */
  async getHorseById(horseId) {
    if (!horseId) {
      throw new Error("Thiếu mã ngựa");
    }
    return horseRepository.getById(horseId);
  },

  /**
   * POST /api/admin/horses/:id/review
   * Duyệt (APPROVED) hoặc từ chối (REJECTED) hồ sơ ngựa.
   * - REJECT bắt buộc có reason (mainflow.md FLOW 1)
   */
  async reviewHorse(horseId, { status, reason }) {
    if (!horseId) throw new Error("Thiếu mã ngựa");
    const normalized = String(status || "").toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(normalized)) {
      throw new Error("Trạng thái duyệt phải là APPROVED hoặc REJECTED");
    }
    const trimmedReason = reason ? String(reason).trim() : "";
    if (normalized === "REJECTED" && !trimmedReason) {
      throw new Error("Vui lòng nhập lý do từ chối");
    }
    return horseRepository.review(horseId, {
      status: normalized,
      reason: trimmedReason || undefined,
    });
  },

  /** Shorthand: duyệt ngựa (APPROVED) */
  async approveHorse(horseId) {
    return this.reviewHorse(horseId, { status: "APPROVED" });
  },

  /** Shorthand: từ chối ngựa (REJECTED) với lý do bắt buộc */
  async rejectHorse(horseId, reason) {
    return this.reviewHorse(horseId, { status: "REJECTED", reason });
  },

  /** GET /api/admin/horses?status=PENDING — đếm badge sidebar */
  async getPendingCount() {
    return horseRepository.getPendingCount();
  },

  /**
   * Revoke (APPROVED → INACTIVE) — HIỆN CHƯA ĐƯỢC HỖ TRỢ ở backend.
   *
   * mainflow.md mô tả POST /api/admin/horses/:id/revoke nhưng backend thật
   * (theo openapi.js + routes/admin/horses.js PATCH .../status) chỉ chấp nhận
   * status ∈ {APPROVED, REJECTED}. Status 'INACTIVE' bị server từ chối (400).
   *
   * Giữ method ở đây để không phải sửa UI; khi user bấm "Thu hồi" sẽ throw
   * error với thông điệp rõ ràng cho UI bắt và hiển thị.
   */
  async revokeHorse(horseId, reason) {
    if (!horseId) throw new Error("Thiếu mã ngựa");
    const trimmedReason = reason ? String(reason).trim() : "";
    if (!trimmedReason) {
      throw new Error("Vui lòng nhập lý do thu hồi");
    }
    if (trimmedReason.length < 5) {
      throw new Error("Lý do thu hồi phải có ít nhất 5 ký tự");
    }
    throw new Error(
      "Thu hồi ngựa hiện chưa được backend hỗ trợ. Vui lòng liên hệ Admin hoặc thao tác trực tiếp trong DB."
    );
  },
};