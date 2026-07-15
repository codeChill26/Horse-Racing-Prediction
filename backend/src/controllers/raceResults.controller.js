// backend/src/controllers/raceResults.controller.js

const raceResultsService = require('../services/raceResults.service');

/**
 * GET /api/public/races/:id/results
 * Lấy kết quả chi tiết 1 race cho Spectator.
 * Endpoint công khai — không yêu cầu auth.
 */
async function getRaceResults(req, res) {
  try {
    const raceId = Number(req.params.id);
    if (!Number.isInteger(raceId) || raceId <= 0) {
      return res.status(400).json({ error: 'Invalid race id' });
    }
    const results = await raceResultsService.getRaceResults(raceId);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

/**
 * GET /api/public/tournaments/:id/race-results
 * Lấy danh sách race results của 1 tournament.
 * Endpoint công khai — không yêu cầu auth.
 */
async function getTournamentRaceResults(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament id' });
    }
    const results = await raceResultsService.getTournamentRaceResults(tournamentId);
    return res.status(200).json({ races: results });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  getRaceResults,
  getTournamentRaceResults,
};
