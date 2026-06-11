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
    legId: true,
    name: true,
    scheduledAt: true,
    registrationDeadline: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    leg: { select: { legId: true, name: true } },
    _count: { select: { entries: true, predictions: true } },
  };
}

class AdminRacesService {
  async listRacesByTournament(tournamentId) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    return prisma.race.findMany({
      where: { tournamentId },
      orderBy: [{ legId: { sort: 'asc', nulls: 'last' } }, { raceId: 'asc' }],
      select: adminRaceSelect(),
    });
  }

  async listRacesByLeg(legId) {
    const leg = await prisma.leg.findUnique({ where: { legId }, select: { legId: true } });
    if (!leg) throw httpError('Leg not found', 404);

    return prisma.race.findMany({
      where: { legId },
      orderBy: { raceId: 'asc' },
      select: adminRaceSelect(),
    });
  }

  async getRaceById(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: {
        ...adminRaceSelect(),
        leg: { select: { legId: true, name: true } },
        tournament: { select: { tournamentId: true, name: true, status: true } },
      },
    });

    if (!race) throw httpError('Race not found', 404);
    return race;
  }

  async createRace(tournamentId, { name, legId, scheduledAt, registrationDeadline }) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true, status: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    if (legId !== undefined) {
      const leg = await prisma.leg.findUnique({ where: { legId }, select: { legId: true, tournamentId: true } });
      if (!leg) throw httpError('Leg not found', 404);
      if (leg.tournamentId !== tournamentId) throw httpError('Leg does not belong to this tournament', 400);
    }

    return prisma.race.create({
      data: {
        tournamentId,
        name,
        legId: legId ?? null,
        scheduledAt: scheduledAt ?? null,
        registrationDeadline: registrationDeadline ?? null,
        status: 'SCHEDULED',
      },
      select: adminRaceSelect(),
    });
  }

  async updateRace(raceId, { name, legId, scheduledAt, registrationDeadline }) {
    const existing = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, tournamentId: true, status: true },
    });

    if (!existing) throw httpError('Race not found', 404);
    if (existing.status === 'FINISHED' || existing.status === 'CANCELLED') {
      throw httpError('Cannot update a FINISHED or CANCELLED race', 409);
    }

    if (legId !== undefined) {
      const leg = await prisma.leg.findUnique({ where: { legId }, select: { legId: true, tournamentId: true } });
      if (!leg) throw httpError('Leg not found', 404);
      if (leg.tournamentId !== existing.tournamentId) throw httpError('Leg does not belong to this tournament', 400);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (legId !== undefined) updateData.legId = legId || null;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;
    if (registrationDeadline !== undefined) updateData.registrationDeadline = registrationDeadline;

    return prisma.race.update({
      where: { raceId },
      data: updateData,
      select: adminRaceSelect(),
    });
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
