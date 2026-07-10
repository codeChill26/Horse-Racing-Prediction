// backend/src/services/adminRaces.js
const prisma = require('../config/prisma');
const socketEmitter = require('../socket/emitter');

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
      include: {
        tournament: { select: { tournamentId: true, name: true, status: true } },
        refereeA: { select: { userId: true, fullName: true, avatarUrl: true } },
        refereeB: { select: { userId: true, fullName: true, avatarUrl: true } },
        entries: {
          include: {
            horse: {
              include: {
                owner: { select: { userId: true, fullName: true, email: true } }
              }
            },
            jockey: { select: { userId: true, fullName: true, email: true } }
          }
        },
        predictions: true
      }
    });

    if (!race) throw httpError('Race not found', 404);

    const approvedEntriesCount = race.entries.filter((e) => e.status === 'APPROVED').length;

    // Định hình cấu trúc mảng Entries chính xác theo đặc tả Frontend mong muốn
    const mappedEntries = race.entries.map((e) => ({
      entryId: e.entryId,
      horseId: e.horseId,
      horseName: e.horse.name,
      jockeyId: e.jockeyId,
      jockeyName: e.jockey?.fullName || 'N/A',
      ownerName: e.horse.owner?.fullName || 'N/A',
      gate: e.entryId, // Sử dụng mã định danh làm số cổng xuất phát mặc định
      status: e.status,
      submittedAt: e.createdAt
    }));

    // Tính toán các thông số thống kê dòng tiền
    const totalPool = race.predictions.reduce((sum, p) => sum + p.betAmount, 0);
    const totalBets = race.predictions.length;
    const participantCount = new Set(race.predictions.map((p) => p.spectatorId)).size;

    return {
      raceId: race.raceId,
      tournamentId: race.tournamentId,
      tournamentName: race.tournament?.name || 'N/A',
      name: race.name,
      scheduledAt: race.scheduledAt,
      registrationDeadline: race.registrationDeadline,
      registrationOpen: race.registrationOpen,
      status: race.status,
      maxEntries: race.maxEntries,
      approvedEntriesCount,
      refereeA: race.refereeA,
      refereeB: race.refereeB,
      entries: mappedEntries,
      statistics: {
        totalPool,
        totalBets,
        participantCount
      }
    };
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

  async listAllRaces({ status } = {}) {
    const where = {};
    if (status) where.status = status;

    return prisma.race.findMany({
      where,
      orderBy: { raceId: 'asc' },
      select: adminRaceSelect(),
    });
  }
}

module.exports = new AdminRacesService();
