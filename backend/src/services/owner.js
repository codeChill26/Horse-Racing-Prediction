// backend/src/services/owner.js

const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function openRaceSelect() {
  return {
    raceId: true,
    name: true,
    maxEntries: true,
    scheduledAt: true,
    registrationDeadline: true,
    registrationOpen: true,
    createdAt: true,
    tournament: {
      select: {
        tournamentId: true,
        name: true,
        status: true,
      },
    },
  };
}

function myEntrySelect() {
  return {
    entryId: true,
    status: true,
    rejectionReason: true,
    createdAt: true,
    updatedAt: true,
    race: {
      select: {
        raceId: true,
        name: true,
        registrationOpen: true,
        maxEntries: true,
        scheduledAt: true,
        tournament: { select: { tournamentId: true, name: true } },
      },
    },
    horse: {
      select: {
        horseId: true,
        name: true,
      },
    },
    jockey: {
      select: {
        userId: true,
        fullName: true,
        avatarUrl: true,
        weight: true,
      },
    },
  };
}

async function getHorseCareerStats(horseId) {
  const results = await prisma.raceResult.findMany({
    where: { horseId },
    select: { finishPosition: true },
  });

  const totalStarts = results.length;
  if (totalStarts === 0) return { totalStarts: 0, wins: 0, winRate: 0, avgPosition: 0 };

  const wins = results.filter((r) => r.finishPosition === 1).length;
  const finishSum = results.reduce((s, r) => s + r.finishPosition, 0);

  return {
    totalStarts,
    wins,
    winRate: Math.round((wins / totalStarts) * 10000) / 100,
    avgPosition: Math.round((finishSum / totalStarts) * 100) / 100,
  };
}

async function getJockeyCareerStats(jockeyId) {
  const entries = await prisma.raceEntry.findMany({
    where: { jockeyId, status: 'APPROVED' },
    select: { raceId: true, horseId: true },
  });

  if (entries.length === 0) return { totalStarts: 0, wins: 0, winRate: 0, avgPosition: 0 };

  const results = await prisma.raceResult.findMany({
    where: {
      OR: entries.map((e) => ({ raceId: e.raceId, horseId: e.horseId })),
    },
    select: { finishPosition: true },
  });

  const totalStarts = results.length;
  if (totalStarts === 0) return { totalStarts: 0, wins: 0, winRate: 0, avgPosition: 0 };

  const wins = results.filter((r) => r.finishPosition === 1).length;
  const finishSum = results.reduce((s, r) => s + r.finishPosition, 0);

  return {
    totalStarts,
    wins,
    winRate: Math.round((wins / totalStarts) * 10000) / 100,
    avgPosition: Math.round((finishSum / totalStarts) * 100) / 100,
  };
}

async function getPairCareerStats(horseId, jockeyId) {
  if (!jockeyId) return { totalStarts: 0, wins: 0, winRate: 0 };

  const pairEntries = await prisma.raceEntry.findMany({
    where: { horseId, jockeyId, status: 'APPROVED' },
    select: { raceId: true },
  });

  if (pairEntries.length === 0) return { totalStarts: 0, wins: 0, winRate: 0 };

  const raceIds = pairEntries.map((e) => e.raceId);
  const results = await prisma.raceResult.findMany({
    where: { raceId: { in: raceIds }, horseId },
    select: { finishPosition: true },
  });

  const totalStarts = results.length;
  if (totalStarts === 0) return { totalStarts: 0, wins: 0, winRate: 0 };

  const wins = results.filter((r) => r.finishPosition === 1).length;
  return {
    totalStarts,
    wins,
    winRate: Math.round((wins / totalStarts) * 10000) / 100,
  };
}

class OwnerService {
  async getRaceDetail(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: {
        raceId: true,
        name: true,
        status: true,
        maxEntries: true,
        scheduledAt: true,
        registrationOpen: true,
        registrationDeadline: true,
        tournament: { select: { tournamentId: true, name: true, status: true } },
      },
    });

    if (!race) throw httpError('Race not found', 404);

    const entries = await prisma.raceEntry.findMany({
      where: { raceId, status: 'APPROVED' },
      select: {
        entryId: true,
        horse: {
          select: {
            horseId: true,
            name: true,
            imageUrl: true,
          },
        },
        jockey: {
          select: {
            userId: true,
            fullName: true,
            avatarUrl: true,
            weight: true,
          },
        },
      },
    });

    const oddsRecords = await prisma.odds.findMany({
      where: { raceId },
      select: { entryId: true, oddsFinal: true },
    });

    const oddsMap = {};
    for (const o of oddsRecords) {
      oddsMap[o.entryId] = Number(o.oddsFinal);
    }

    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const horseStats = await getHorseCareerStats(entry.horse.horseId);
        let jockeyStats = null;
        let pairStats = null;

        if (entry.jockey) {
          jockeyStats = await getJockeyCareerStats(entry.jockey.userId);
          pairStats = await getPairCareerStats(entry.horse.horseId, entry.jockey.userId);
        }

        return {
          entryId: entry.entryId,
          horse: {
            ...entry.horse,
            careerStats: horseStats,
          },
          jockey: entry.jockey
            ? { ...entry.jockey, careerStats: jockeyStats }
            : null,
          pairCareerStats: pairStats,
          oddsFinal: oddsMap[entry.entryId] || null,
        };
      })
    );

    return {
      ...race,
      entries: enrichedEntries,
    };
  }


  async listOpenRaces() {
    const races = await prisma.race.findMany({
      where: { registrationOpen: true },
      orderBy: { scheduledAt: 'asc' },
      select: openRaceSelect(),
    });

    return Promise.all(
      races.map(async (race) => {
        const approved = await prisma.raceEntry.count({
          where: { raceId: race.raceId, status: 'APPROVED' },
        });
        const pending = await prisma.raceEntry.count({
          where: { raceId: race.raceId, status: 'PENDING' },
        });
        return {
          ...race,
          entryCounts: {
            approved,
            pending,
            total: approved + pending,
            maxEntries: race.maxEntries,
          },
        };
      })
    );
  }

  async listMyEntries(ownerId, { raceId, status } = {}) {
    const where = { horse: { ownerId } };
    if (raceId) where.raceId = raceId;
    if (status) where.status = status;

    return prisma.raceEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: myEntrySelect(),
    });
  }

  async listRaceEntries(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const entries = await prisma.raceEntry.findMany({
      where: { raceId, status: 'APPROVED' },
      orderBy: { entryId: 'asc' },
      select: {
        entryId: true,
        horse: {
          select: {
            horseId: true,
            name: true,
            owner: { select: { userId: true, fullName: true } },
          },
        },
        jockey: {
          select: {
            userId: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const odds = await prisma.odds.findMany({
      where: { raceId },
      select: { entryId: true, oddsFinal: true },
    });

    const oddsMap = {};
    for (const o of odds) {
      oddsMap[o.entryId] = o.oddsFinal;
    }

    return entries.map((e) => ({
      ...e,
      oddsFinal: oddsMap[e.entryId] || null,
    }));
  }
}

module.exports = new OwnerService();
