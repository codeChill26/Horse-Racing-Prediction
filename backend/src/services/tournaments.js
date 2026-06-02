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
}

module.exports = new TournamentsService();
