// backend/src/controllers/tournaments.controller.js

const tournamentsService = require('../services/tournaments');

async function listPublicTournaments(req, res) {
  try {
    const tournaments = await tournamentsService.listPublicTournaments();
    return res.status(200).json({ tournaments });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function getPublicTournamentById(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament id' });
    }

    const tournament = await tournamentsService.getPublicTournamentById(tournamentId);
    return res.status(200).json({ tournament });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function listPublicRacesByTournamentId(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament id' });
    }

    const races = await tournamentsService.listPublicRacesByTournamentId(tournamentId);
    return res.status(200).json({ races });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

module.exports = {
  listPublicTournaments,
  getPublicTournamentById,
  listPublicRacesByTournamentId,
};
