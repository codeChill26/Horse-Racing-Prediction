/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { horseRepository } from "../repositories/horseRepository";

export const horseService = {
  async getHorsesList() {
    return await horseRepository.getAll();
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
  }
};
