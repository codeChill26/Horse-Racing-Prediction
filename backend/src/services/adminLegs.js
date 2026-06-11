// backend/src/services/adminLegs.js

const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function legSelect() {
  return {
    legId: true,
    tournamentId: true,
    name: true,
    legOrder: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { races: true } },
  };
}

class AdminLegsService {
  async listLegs(tournamentId) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    return prisma.leg.findMany({
      where: { tournamentId },
      orderBy: { legOrder: 'asc' },
      select: legSelect(),
    });
  }

  async getLegById(legId) {
    const leg = await prisma.leg.findUnique({
      where: { legId },
      select: {
        ...legSelect(),
        races: {
          orderBy: { raceId: 'asc' },
          select: {
            raceId: true,
            name: true,
            status: true,
            scheduledAt: true,
            registrationDeadline: true,
            _count: { select: { entries: true, predictions: true } },
          },
        },
      },
    });

    if (!leg) throw httpError('Leg not found', 404);
    return leg;
  }

  async createLeg(tournamentId, { name, legOrder }) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true, status: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    if (legOrder === undefined) {
      const maxLeg = await prisma.leg.findFirst({
        where: { tournamentId },
        orderBy: { legOrder: 'desc' },
        select: { legOrder: true },
      });
      legOrder = (maxLeg?.legOrder ?? 0) + 1;
    }

    return prisma.leg.create({
      data: { tournamentId, name, legOrder },
      select: legSelect(),
    });
  }

  async updateLeg(legId, { name, legOrder }) {
    const existing = await prisma.leg.findUnique({
      where: { legId },
      select: { legId: true, tournament: { select: { status: true } } },
    });

    if (!existing) throw httpError('Leg not found', 404);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (legOrder !== undefined) updateData.legOrder = legOrder;

    return prisma.leg.update({
      where: { legId },
      data: updateData,
      select: legSelect(),
    });
  }

  async deleteLeg(legId) {
    const existing = await prisma.leg.findUnique({
      where: { legId },
      select: { legId: true, tournament: { select: { status: true } } },
    });

    if (!existing) throw httpError('Leg not found', 404);

    const racesCount = await prisma.race.count({ where: { legId } });
    if (racesCount > 0) {
      throw httpError('Cannot delete leg because it contains races. Remove races first.', 409);
    }

    await prisma.leg.delete({ where: { legId } });
    return { action: 'DELETED' };
  }
}

module.exports = new AdminLegsService();
