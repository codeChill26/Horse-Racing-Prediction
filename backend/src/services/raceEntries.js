const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function entrySelect() {
  return {
    entryId: true,
    raceId: true,
    horseId: true,
    jockeyId: true,
    status: true,
    rejectionReason: true,
    reviewedById: true,
    reviewedAt: true,
    createdAt: true,
    updatedAt: true,
    horse: {
      select: {
        horseId: true,
        name: true,
        status: true,
      },
    },
    race: {
      select: {
        raceId: true,
        name: true,
        tournamentId: true,
        registrationOpen: true,
      },
    },
    jockey: {
      select: {
        userId: true,
        fullName: true,
        email: true,
        isActive: true,
        isProfileComplete: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    },
  };
}

function raceSelect() {
  return {
    raceId: true,
    tournamentId: true,
    name: true,
    scheduledAt: true,
    registrationOpen: true,
    registrationOpenedAt: true,
    registrationClosedAt: true,
    createdAt: true,
    updatedAt: true,
  };
}

class RaceEntriesService {
  async createEntry(raceId, horseId, ownerId, jockeyId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, registrationOpen: true },
    });

    if (!race) throw httpError('Race not found', 404);
    if (!race.registrationOpen) {
      throw httpError('Race registration gate is closed.', 409);
    }

    const horse = await prisma.horse.findUnique({
      where: { horseId },
      select: { horseId: true, ownerId: true, status: true },
    });

    if (!horse) throw httpError('Horse not found', 404);
    if (horse.ownerId !== ownerId) {
      throw httpError('You can only register your own horse.', 403);
    }
    if (horse.status !== 'APPROVED') {
      throw httpError('Only APPROVED horses can be registered for a race entry.', 409);
    }

    if (jockeyId) {
      const jockey = await prisma.user.findUnique({
        where: { userId: jockeyId },
        select: {
          userId: true,
          isActive: true,
          isProfileComplete: true,
          role: { select: { code: true } },
        },
      });

      if (!jockey) throw httpError('Jockey not found', 404);
      if (jockey.role?.code !== 'JOCKEY') {
        throw httpError('Selected user is not a jockey.', 409);
      }
      if (!jockey.isActive || !jockey.isProfileComplete) {
        throw httpError('Jockey must be active and profile-complete before entry submission.', 409);
      }
    }

    try {
      return await prisma.raceEntry.create({
        data: { raceId, horseId, jockeyId: jockeyId || undefined, status: 'PENDING' },
        select: entrySelect(),
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw httpError('Horse is already registered for this race.', 409);
      }
      throw error;
    }
  }

  async reviewEntry(entryId, { status, reason }, reviewerId) {
    const existing = await prisma.raceEntry.findUnique({
      where: { entryId },
      select: { entryId: true, status: true },
    });

    if (!existing) throw httpError('Race entry not found', 404);

    const data =
      status === 'APPROVED'
        ? {
            status: 'APPROVED',
            rejectionReason: null,
            reviewedById: reviewerId,
            reviewedAt: new Date(),
          }
        : {
            status: 'REJECTED',
            rejectionReason: reason,
            reviewedById: reviewerId,
            reviewedAt: new Date(),
          };

    return prisma.raceEntry.update({
      where: { entryId },
      data,
      select: entrySelect(),
    });
  }

  async setRegistrationGate(raceId, isOpen) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true },
    });

    if (!race) throw httpError('Race not found', 404);

    const now = new Date();

    if (isOpen) {
      const updatedRace = await prisma.race.update({
        where: { raceId },
        data: {
          registrationOpen: true,
          registrationOpenedAt: now,
          registrationClosedAt: null,
        },
        select: raceSelect(),
      });

      return { race: updatedRace, autoRejectedCount: 0 };
    }

    return prisma.$transaction(async (tx) => {
      const updatedRace = await tx.race.update({
        where: { raceId },
        data: {
          registrationOpen: false,
          registrationClosedAt: now,
        },
        select: raceSelect(),
      });

      const autoRejected = await tx.raceEntry.updateMany({
        where: { raceId, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Registration gate closed by admin.',
          reviewedAt: now,
        },
      });

      return { race: updatedRace, autoRejectedCount: autoRejected.count };
    });
  }
}

module.exports = new RaceEntriesService();
