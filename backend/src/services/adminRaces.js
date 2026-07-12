// backend/src/services/adminRaces.js

const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function adminRaceSelect() {
  return {
    raceId: true,
    tournamentId: true,
    name: true,
    maxEntries: true,
    scheduledAt: true,
    registrationDeadline: true,
    status: true,
    registrationOpen: true,
    registrationOpenedAt: true,
    registrationClosedAt: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { entries: true, predictions: true } },
  };
}

class AdminRacesService {
  async listRacesByTournament(tournamentId) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    return prisma.race.findMany({
      where: { tournamentId },
      orderBy: { raceId: 'asc' },
      select: adminRaceSelect(),
    });
  }

  async getRaceById(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: {
        ...adminRaceSelect(),
        tournament: { select: { tournamentId: true, name: true, status: true } },
      },
    });

    if (!race) throw httpError('Race not found', 404);
    return race;
  }

  async createRace(tournamentId, { name, maxEntries, scheduledAt, registrationDeadline }) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true, status: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    return prisma.race.create({
      data: {
        tournamentId,
        name,
        maxEntries: maxEntries ?? 8,
        scheduledAt: scheduledAt ?? null,
        registrationDeadline: registrationDeadline ?? null,
        status: 'SCHEDULED',
      },
      select: adminRaceSelect(),
    });
  }

  async updateRace(raceId, { name, maxEntries, scheduledAt, registrationDeadline }) {
    const existing = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, tournamentId: true, status: true },
    });

    if (!existing) throw httpError('Race not found', 404);
    if (existing.status === 'FINISHED' || existing.status === 'CANCELLED') {
      throw httpError('Cannot update a FINISHED or CANCELLED race', 409);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (maxEntries !== undefined) updateData.maxEntries = maxEntries;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;
    if (registrationDeadline !== undefined) updateData.registrationDeadline = registrationDeadline;

    return prisma.race.update({
      where: { raceId },
      data: updateData,
      select: adminRaceSelect(),
    });
  }

  async listRaceEntries(raceId, { status } = {}) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, name: true, maxEntries: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const where = { raceId };
    if (status) where.status = status;

    const entries = await prisma.raceEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        entryId: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
        horse: {
          select: {
            horseId: true,
            name: true,
            owner: { select: { userId: true, fullName: true, email: true } },
          },
        },
        jockey: {
          select: { userId: true, fullName: true, email: true, weight: true },
        },
        reviewedBy: {
          select: { userId: true, fullName: true },
        },
      },
    });

    const approvedCount = entries.filter((e) => e.status === 'APPROVED').length;

    return { race, entries, approvedCount };
  }

  async bulkReviewEntries(raceId, reviews, reviewerId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, maxEntries: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const results = { approved: 0, rejected: 0, errors: [] };

    await prisma.$transaction(async (tx) => {
      for (const review of reviews) {
        const { entryId, status, reason } = review;

        if (status === 'APPROVED') {
          const approvedCount = await tx.raceEntry.count({
            where: { raceId, status: 'APPROVED' },
          });
          if (approvedCount >= race.maxEntries) {
            results.errors.push({
              entryId,
              error: `Race has reached its maximum of ${race.maxEntries} entries.`,
            });
            continue;
          }
        }

        const existing = await tx.raceEntry.findUnique({
          where: { entryId },
          select: { entryId: true, raceId: true, status: true },
        });

        if (!existing || existing.raceId !== raceId) {
          results.errors.push({ entryId, error: 'Entry not found or not in this race.' });
          continue;
        }
        if (existing.status !== 'PENDING') {
          results.errors.push({ entryId, error: `Entry is already ${existing.status}.` });
          continue;
        }

        const now = new Date();
        const data =
          status === 'APPROVED'
            ? {
                status: 'APPROVED',
                rejectionReason: null,
                reviewedById: reviewerId,
                reviewedAt: now,
              }
            : {
                status: 'REJECTED',
                rejectionReason: reason || null,
                reviewedById: reviewerId,
                reviewedAt: now,
              };

        await tx.raceEntry.update({ where: { entryId }, data });

        if (status === 'APPROVED') results.approved++;
        else results.rejected++;
      }
    });

    return results;
  }

  async deleteRace(raceId) {
    const existing = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, status: true },
    });

    if (!existing) throw httpError('Race not found', 404);

    const entriesCount = await prisma.raceEntry.count({ where: { raceId } });
    if (entriesCount > 0) {
      throw httpError('Cannot delete race because it has entries. Cancel the race instead.', 409);
    }

    const predictionsCount = await prisma.prediction.count({ where: { raceId } });
    if (predictionsCount > 0) {
      throw httpError('Cannot delete race because it has predictions. Cancel the race instead.', 409);
    }

    await prisma.race.delete({ where: { raceId } });
    return { action: 'DELETED' };
  }
}

module.exports = new AdminRacesService();
