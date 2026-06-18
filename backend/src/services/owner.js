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

class OwnerService {
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
    const where = {
      horse: { ownerId },
    };
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
      select: {
        entryId: true,
        oddsFinal: true,
      },
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
