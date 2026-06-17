/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { horseRepository } from "../repositories/horseRepository";

export const horseService = {
  async getHorsesList() {
    return await horseRepository.getAll();
  },

  /**
   * Lấy danh sách ngựa của chủ ngựa đang đăng nhập.
   * Endpoint: GET /api/horses/mine
   */
  async getMyHorses() {
    return await horseRepository.getMine();
  },

  async getPendingCount() {
    const list = await horseRepository.getAll();
    return list.filter((h) => h.status === "Pending").length;
  },

  async approveHorse(id) {
    return await horseRepository.updateStatus(id, "Active");
  },

  async rejectHorse(id) {
    // In a real application we would store the reason, here we can delete or retire it
    return await horseRepository.updateStatus(id, "Retired");
  },

  async registerNewHorse(horseData) {
    if (!horseData.horseName || !horseData.breed || !horseData.ownerName) {
      throw new Error("Tên ngựa, giống và chủ sở hữu là bắt buộc");
    }
    return await horseRepository.create({
      horseName: horseData.horseName,
      breed: horseData.breed,
      yearBorn: parseInt(horseData.yearBorn, 10) || new Date().getFullYear(),
      ownerName: horseData.ownerName,
      ownerEmail: horseData.ownerEmail || "",
      ownerPhone: horseData.ownerPhone || "",
      trainerName: horseData.trainerName || "",
      stableInfo: horseData.stableInfo || "",
      imageUrl: horseData.imageUrl || ""
    });
  },

  /**
   * Đăng ký ngựa mới (chuẩn theo backend DTO):
   *   POST /api/horses
   *   body: { name, breed?, dateOfBirth?, sex?, color? }
   */
  async registerNewHorseDirect({ name, breed, dateOfBirth, sex, color }) {
    if (!name || !name.trim()) {
      throw new Error("Tên ngựa là bắt buộc");
    }
    const payload = { name: name.trim() };
    if (breed) payload.breed = breed;
    if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
    if (sex) payload.sex = sex;
    if (color) payload.color = color;
    return await horseRepository.create(payload);
  },
};
