// Jockey Service - Business logic layer
// Delegates to repository, handles validation and transformation

import {
  jockeyProfileRepository,
  jockeyRaceRepository,
  jockeyScheduleRepository,
  jockeyHorseRepository,
  jockeyNotificationRepository,
  jockeyStatsRepository,
} from "../repositories/jockeyRepository";

// ============================================
// Profile Service
// ============================================

export const jockeyProfileService = {
  async getProfile() {
    const profile = await jockeyProfileRepository.getProfile();
    return profile;
  },

  async updateProfile(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid profile data");
    }

    const allowedFields = ["name", "email", "phone"];
    const filteredData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        filteredData[key] = data[key];
      }
    }

    return jockeyProfileRepository.updateProfile(filteredData);
  },

  async updateAvatar(file) {
    if (!file) {
      throw new Error("Avatar file is required");
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("Avatar file must be less than 5MB");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Avatar must be JPEG, PNG, or WebP");
    }

    return jockeyProfileRepository.updateAvatar(file);
  },
};

// ============================================
// Race Service
// ============================================

export const jockeyRaceService = {
  async getMyRaces(filters = {}) {
    const validStatuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (filters.status && !validStatuses.includes(filters.status)) {
      throw new Error("Invalid race status");
    }

    const validSurfaces = ["Turf", "Dirt", "Synthetic"];
    if (filters.surface && !validSurfaces.includes(filters.surface)) {
      throw new Error("Invalid surface type");
    }

    return jockeyRaceRepository.getMyRaces(filters);
  },

  async getRaceById(raceId) {
    if (!raceId) {
      throw new Error("Thiếu mã race");
    }
    return jockeyRaceRepository.getRaceById(raceId);
  },

  async getCompetitors(raceId) {
    if (!raceId) {
      throw new Error("Thiếu mã race");
    }
    return jockeyRaceRepository.getCompetitors(raceId);
  },

  async confirmParticipation(raceId) {
    if (!raceId) {
      throw new Error("Thiếu mã race");
    }
    return jockeyRaceRepository.confirmParticipation(raceId);
  },

  async requestScratching(raceId, reason) {
    if (!raceId) {
      throw new Error("Thiếu mã race");
    }
    if (!reason || reason.trim().length < 10) {
      throw new Error("Vui lòng cung cấp lý do chi tiết (ít nhất 10 ký tự)");
    }
    return jockeyRaceRepository.requestScratching(raceId, reason);
  },

  formatRaceForDisplay(race) {
    return {
      ...race,
      formattedDistance: `${race.distance}m`,
      formattedPrize: new Intl.NumberFormat("vi-VN").format(race.prizePool),
      formattedDate: new Date(race.raceDate).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      formattedTime: race.raceTime,
      isUpcoming: race.status === "SCHEDULED",
      isInProgress: race.status === "IN_PROGRESS",
      isCompleted: race.status === "COMPLETED",
    };
  },

  calculateFormRating(form) {
    if (!form || form.length === 0) return 0;
    let score = 0;
    for (const f of form) {
      if (f === "1") score += 5;
      else if (f === "2") score += 4;
      else if (f === "3") score += 3;
      else if (!isNaN(f)) score += Math.max(0, 5 - parseInt(f));
    }
    return (score / form.length).toFixed(1);
  },
};

// ============================================
// Schedule Service
// ============================================

export const jockeyScheduleService = {
  async getSchedule() {
    return jockeyScheduleRepository.getSchedule();
  },

  async getUpcomingRaces() {
    return jockeyScheduleRepository.getUpcomingRaces();
  },

  async getPastRaces() {
    return jockeyScheduleRepository.getPastRaces();
  },

  groupByDate(schedule) {
    const grouped = {
      upcoming: [],
      past: [],
    };

    for (const item of schedule.upcoming || []) {
      grouped.upcoming.push(item);
    }

    for (const item of schedule.past || []) {
      grouped.past.push(item);
    }

    return grouped;
  },

  formatScheduleItem(item) {
    return {
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString("vi-VN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      formattedTime: item.time,
      isToday:
        item.date === new Date().toISOString().split("T")[0],
    };
  },
};

// ============================================
// Horse Service
// ============================================

export const jockeyHorseService = {
  async getAssignedHorses() {
    return jockeyHorseRepository.getAssignedHorses();
  },

  async getHorseById(horseId) {
    if (!horseId) {
      throw new Error("Thiếu mã horse");
    }
    return jockeyHorseRepository.getHorseById(horseId);
  },

  async updateHorseStatus(horseId, status) {
    if (!horseId) {
      throw new Error("Thiếu mã horse");
    }
    const validStatuses = ["FIT", "UNFIT", "INJURED", "RESTING"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid horse status");
    }
    return jockeyHorseRepository.updateHorseStatus(horseId, status);
  },

  formatHorseForDisplay(horse) {
    return {
      ...horse,
      formattedWeight: `${horse.weight}kg`,
      formattedAge: `${horse.age} tuổi`,
      formattedBestDistance: `${horse.bestDistance}m`,
      winRate: ((horse.wins / horse.totalRaces) * 100).toFixed(1),
      podiumRate: ((horse.podiums / horse.totalRaces) * 100).toFixed(1),
    };
  },
};

// ============================================
// Notification Service
// ============================================

export const jockeyNotificationService = {
  async getNotifications() {
    return jockeyNotificationRepository.getNotifications();
  },

  async markAsRead(notificationId) {
    if (!notificationId) {
      throw new Error("Thiếu mã notification");
    }
    return jockeyNotificationRepository.markAsRead(notificationId);
  },

  async markAllAsRead() {
    return jockeyNotificationRepository.markAllAsRead();
  },

  async deleteNotification(notificationId) {
    if (!notificationId) {
      throw new Error("Thiếu mã notification");
    }
    return jockeyNotificationRepository.deleteNotification(notificationId);
  },

  async getUnreadCount() {
    return jockeyNotificationRepository.getUnreadCount();
  },

  groupByDate(notifications) {
    const groups = {};
    for (const notif of notifications) {
      const date = new Date(notif.timestamp).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notif);
    }
    return groups;
  },

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  },

  getPriorityColor(priority) {
    const colors = {
      HIGH: "red",
      MEDIUM: "amber",
      LOW: "gray",
    };
    return colors[priority] || "gray";
  },
};

// ============================================
// Stats Service
// ============================================

export const jockeyStatsService = {
  async getCareerStats() {
    return jockeyStatsRepository.getCareerStats();
  },

  async getSeasonStats(season) {
    if (!season) {
      season = new Date().getFullYear().toString();
    }
    return jockeyStatsRepository.getSeasonStats(season);
  },

  async getPerformanceHistory(limit) {
    if (!limit || limit < 1) {
      limit = 10;
    }
    return jockeyStatsRepository.getPerformanceHistory(limit);
  },

  formatCurrency(amount, currency = "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  },

  formatPercentage(value) {
    return `${Number(value).toFixed(1)}%`;
  },
};
