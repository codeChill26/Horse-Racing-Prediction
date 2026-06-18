// backend/src/services/tournaments.js

const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const PUBLIC_STATUSES = ['OPEN', 'ONGOING', 'FINISHED'];

function publicTournamentSelect() {
  return {
    tournamentId: true,
    name: true,
    description: true,
    status: true,
    startAt: true,
    endAt: true,
    createdAt: true,
    updatedAt: true,
  };
}

class TournamentsService {
  async listPublicTournaments() {
    return prisma.tournament.findMany({
      where: { status: { in: PUBLIC_STATUSES } },
      orderBy: { tournamentId: 'desc' },
      select: publicTournamentSelect(),
    });
  }

  async getPublicTournamentById(tournamentId) {
    const tournament = await prisma.tournament.findFirst({
      where: { tournamentId, status: { in: PUBLIC_STATUSES } },
      select: publicTournamentSelect(),
    });

    if (!tournament) throw httpError('Tournament not found', 404);
    return tournament;
  }

  async listTournamentRaces(tournamentId) {
    const tournament = await prisma.tournament.findFirst({
      where: { tournamentId, status: { in: PUBLIC_STATUSES } },
      select: { tournamentId: true },
    });
    if (!tournament) throw httpError('Tournament not found', 404);

    const races = await prisma.race.findMany({
      where: { tournamentId },
      orderBy: { raceId: 'asc' },
      select: {
        raceId: true,
        name: true,
        maxEntries: true,
        scheduledAt: true,
        registrationDeadline: true,
        registrationOpen: true,
        status: true,
      },
    });

    return Promise.all(
      races.map(async (race) => {
        const approved = await prisma.raceEntry.count({
          where: { raceId: race.raceId, status: 'APPROVED' },
        });
        return { ...race, entryCount: approved };
      })
    );
  }
}

module.exports = new TournamentsService();
