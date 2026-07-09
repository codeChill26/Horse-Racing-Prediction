// Jockey Repository - Data access layer
// TODO: Replace mock data with real API calls

import { getAccessToken } from "../utils/token";
import {
  MOCK_JOCKEY_PROFILE,
  MOCK_JOCKEY_RACES,
  MOCK_JOCKEY_SCHEDULE,
  MOCK_JOCKEY_NOTIFICATIONS,
  MOCK_HORSES_ASSIGNED,
  MOCK_RACE_COMPETITORS,
} from "../data/mockJockeyData";

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// ============================================
// Profile Repository
// ============================================

export const jockeyProfileRepository = {
  async getProfile() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me', { headers: authHeaders() });
    // if (!res.ok) throw new Error('Failed to fetch profile');
    // return res.json();
    await delay(300);
    return structuredClone(MOCK_JOCKEY_PROFILE);
  },

  async updateProfile(data) {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me', {
    //   method: 'PUT',
    //   headers: authHeaders(),
    //   body: JSON.stringify(data)
    // });
    // if (!res.ok) throw new Error('Failed to update profile');
    // return res.json();
    await delay(500);
    return { ...MOCK_JOCKEY_PROFILE, ...data };
  },

  async updateAvatar(file) {
    // TODO: Replace mock with real API
    // const formData = new FormData();
    // formData.append('avatar', file);
    // const res = await fetch('/api/jockeys/me/avatar', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${getAccessToken()}` },
    //   body: formData
    // });
    // if (!res.ok) throw new Error('Failed to upload avatar');
    // return res.json();
    await delay(800);
    return { avatarUrl: URL.createObjectURL(file) };
  },
};

// ============================================
// Races Repository
// ============================================

export const jockeyRaceRepository = {
  async getMyRaces(filters = {}) {
    // TODO: Replace mock with real API
    // const params = new URLSearchParams(filters);
    // const res = await fetch(`/api/jockeys/me/races?${params}`, {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch races');
    // return res.json();
    await delay(400);
    let races = structuredClone(MOCK_JOCKEY_RACES);

    if (filters.status) {
      races = races.filter((r) => r.status === filters.status);
    }
    if (filters.surface) {
      races = races.filter((r) => r.surface === filters.surface);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      races = races.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          r.tournamentName.toLowerCase().includes(searchLower) ||
          r.venue.toLowerCase().includes(searchLower)
      );
    }

    return races;
  },

  async getRaceById(raceId) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/races/${raceId}`, { headers: authHeaders() });
    // if (!res.ok) throw new Error('Race not found');
    // return res.json();
    await delay(300);
    const race = MOCK_JOCKEY_RACES.find((r) => r.id === raceId || r.raceId === raceId);
    if (!race) throw new Error("Race not found");
    return structuredClone(race);
  },

  async getCompetitors(raceId) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/races/${raceId}/competitors`, {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch competitors');
    // return res.json();
    await delay(300);
    return structuredClone(MOCK_RACE_COMPETITORS);
  },

  async confirmParticipation(raceId) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/races/${raceId}/confirm`, {
    //   method: 'POST',
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to confirm participation');
    // return res.json();
    await delay(500);
    return { success: true, message: "Participation confirmed" };
  },

  async requestScratching(raceId, reason) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/races/${raceId}/scratch`, {
    //   method: 'POST',
    //   headers: authHeaders(),
    //   body: JSON.stringify({ reason })
    // });
    // if (!res.ok) throw new Error('Failed to submit scratching request');
    // return res.json();
    await delay(600);
    return { success: true, message: "Scratching request submitted" };
  },
};

// ============================================
// Schedule Repository
// ============================================

export const jockeyScheduleRepository = {
  async getSchedule() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/schedule', { headers: authHeaders() });
    // if (!res.ok) throw new Error('Failed to fetch schedule');
    // return res.json();
    await delay(350);
    return structuredClone(MOCK_JOCKEY_SCHEDULE);
  },

  async getUpcomingRaces() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/schedule/upcoming', {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch upcoming races');
    // return res.json();
    await delay(300);
    return structuredClone(MOCK_JOCKEY_SCHEDULE.upcoming);
  },

  async getPastRaces() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/schedule/past', {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch past races');
    // return res.json();
    await delay(300);
    return structuredClone(MOCK_JOCKEY_SCHEDULE.past);
  },
};

// ============================================
// Horses Repository
// ============================================

export const jockeyHorseRepository = {
  async getAssignedHorses() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/horses', { headers: authHeaders() });
    // if (!res.ok) throw new Error('Failed to fetch horses');
    // return res.json();
    await delay(350);
    return structuredClone(MOCK_HORSES_ASSIGNED);
  },

  async getHorseById(horseId) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/horses/${horseId}`, { headers: authHeaders() });
    // if (!res.ok) throw new Error('Horse not found');
    // return res.json();
    await delay(300);
    const horse = MOCK_HORSES_ASSIGNED.find((h) => h.horseId === horseId);
    if (!horse) throw new Error("Horse not found");
    return structuredClone(horse);
  },

  async updateHorseStatus(horseId, status) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/horses/${horseId}/status`, {
    //   method: 'PUT',
    //   headers: authHeaders(),
    //   body: JSON.stringify({ status })
    // });
    // if (!res.ok) throw new Error('Failed to update horse status');
    // return res.json();
    await delay(400);
    return { success: true, status };
  },
};

// ============================================
// Notifications Repository
// ============================================

export const jockeyNotificationRepository = {
  async getNotifications() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/notifications', {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch notifications');
    // return res.json();
    await delay(300);
    return structuredClone(MOCK_JOCKEY_NOTIFICATIONS);
  },

  async markAsRead(notificationId) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/notifications/${notificationId}/read`, {
    //   method: 'PUT',
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to mark notification as read');
    // return res.json();
    await delay(200);
    return { success: true };
  },

  async markAllAsRead() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/notifications/read-all', {
    //   method: 'PUT',
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to mark all as read');
    // return res.json();
    await delay(300);
    return { success: true };
  },

  async deleteNotification(notificationId) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/notifications/${notificationId}`, {
    //   method: 'DELETE',
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to delete notification');
    // return res.json();
    await delay(200);
    return { success: true };
  },

  async getUnreadCount() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/notifications/unread-count', {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to get unread count');
    // return res.json();
    await delay(200);
    return {
      count: MOCK_JOCKEY_NOTIFICATIONS.filter((n) => !n.read).length,
    };
  },
};

// ============================================
// Statistics Repository
// ============================================

export const jockeyStatsRepository = {
  async getCareerStats() {
    // TODO: Replace mock with real API
    // const res = await fetch('/api/jockeys/me/stats/career', {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch career stats');
    // return res.json();
    await delay(350);
    return {
      totalRaces: MOCK_JOCKEY_PROFILE.totalRaces,
      totalWins: MOCK_JOCKEY_PROFILE.totalWins,
      totalTopThree: MOCK_JOCKEY_PROFILE.totalTopThree,
      winRate: MOCK_JOCKEY_PROFILE.winRate,
      topThreeRate: MOCK_JOCKEY_PROFILE.topThreeRate,
      careerEarnings: MOCK_JOCKEY_PROFILE.careerEarnings,
      yearsExperience: MOCK_JOCKEY_PROFILE.yearsExperience,
    };
  },

  async getSeasonStats(season = "2026") {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/jockeys/me/stats/season/${season}`, {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch season stats');
    // return res.json();
    await delay(300);
    const profile = MOCK_JOCKEY_PROFILE;
    return {
      season,
      races: profile.stats.racesThisSeason,
      wins: profile.stats.winsThisSeason,
      podiums: profile.stats.podiumsThisSeason,
      winRate: ((profile.stats.winsThisSeason / profile.stats.racesThisSeason) * 100).toFixed(1),
      podiumRate: ((profile.stats.podiumsThisSeason / profile.stats.racesThisSeason) * 100).toFixed(1),
      totalDistance: profile.stats.totalDistance,
      avgFinishTime: profile.stats.avgFinishTime,
    };
  },

  async getPerformanceHistory(limit = 10) {
    // TODO: Replace mock with real API
    // const res = await fetch(`/api/jockeys/me/stats/history?limit=${limit}`, {
    //   headers: authHeaders()
    // });
    // if (!res.ok) throw new Error('Failed to fetch performance history');
    // return res.json();
    await delay(300);
    return profile.recentPerformances.slice(0, limit);
  },
};

// Helper to access profile for stats
const profile = MOCK_JOCKEY_PROFILE;
