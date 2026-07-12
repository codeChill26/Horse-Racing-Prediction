/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service tổng hợp lịch thi đấu cho Horse Owner.
 *
 * Lưu ý: Backend chưa có endpoint `/api/races/mine` hoặc
 * `/api/horse-owners/me/schedule` riêng. Service này tổng hợp từ:
 *   - GET /api/horses/mine         (ngựa của tôi)
 *   - GET /api/tournaments         (giải đấu public)
 *   - GET /api/tournaments/:id/races (chặng đua theo giải)
 *   - local cache (localStorage)   (các entry owner vừa tạo)
 *
 * TODO: Replace mock cache with real API when backend endpoint is available.
 * MOCK DATA: Backend API cho "lịch thi đấu của owner" chưa có sẵn.
 */

import { horseService } from "./horseService";
import { tournamentService } from "./tournamentService";
import { raceService } from "./raceService";

const CACHE_KEY = "horse_owner_race_entries_v1";

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(entries) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded — ignore */
  }
}

export const horseOwnerScheduleService = {
  /**
   * Lưu entry vừa đăng ký vào local cache (mock).
   * Được gọi sau khi owner đăng ký ngựa thành công.
   */
  cacheEntry(entry) {
    if (!entry) return;
    const list = readCache();
    const exists = list.some(
      (e) =>
        e.raceId === entry.raceId && e.horseId === entry.horseId,
    );
    if (!exists) {
      list.push({
        ...entry,
        cachedAt: new Date().toISOString(),
      });
      writeCache(list);
    }
  },

  /**
   * Đọc các entry đã cache (mock data).
   */
  getCachedEntries() {
    return readCache();
  },

  /**
   * Tổng hợp lịch thi đấu cho owner:
   * - Lấy tất cả chặng đua từ các giải OPEN/ONGOING
   * - Gắn cờ nếu race có ngựa của owner đã đăng ký (từ cache)
   */
  async buildSchedule() {
    const [horses, tournaments, cachedEntries] = await Promise.all([
      horseService.getMyHorses().catch(() => []),
      tournamentService.getPublicTournaments().catch(() => []),
      Promise.resolve(readCache()),
    ]);

    const ownerHorseIds = new Set(horses.map((h) => h.horseId || h.id));

    // Lấy chặng đua của từng tournament
    const racesWithTournament = [];
    for (const t of tournaments) {
      try {
        const races = await raceService.getRacesByTournament(
          t.tournamentId || t.id,
        );
        for (const r of races) {
          racesWithTournament.push({
            ...r,
            tournament: {
              tournamentId: t.tournamentId || t.id,
              name: t.name,
              status: t.status,
            },
          });
        }
      } catch {
        /* skip tournament nếu lỗi */
      }
    }

    // Gắn thông tin đăng ký
    const schedule = racesWithTournament.map((race) => {
      const myEntries = cachedEntries
        .filter((e) => e.raceId === race.raceId || e.raceId === race.id)
        .filter((e) => ownerHorseIds.has(e.horseId));

      return {
        ...race,
        ownerEntries: myEntries,
        registered: myEntries.length > 0,
      };
    });

    return {
      horses,
      tournaments,
      races: schedule,
      cachedEntries,
    };
  },
};
