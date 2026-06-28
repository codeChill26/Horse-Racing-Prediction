// backend/src/controllers/adminRaces.controller.js

const adminRacesService = require('../services/adminRaces');
const validator = require('../dto/race.dto');

async function listRacesByTournament(req, res) {
  try {
    const tournamentId = validator.parseTournamentId(req.params);
    const races = await adminRacesService.listRacesByTournament(tournamentId);
    return res.status(200).json({ races });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function getRaceById(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const race = await adminRacesService.getRaceById(raceId);
    return res.status(200).json({ race });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function createRace(req, res) {
  try {
    const tournamentId = validator.parseTournamentId(req.params);
    const validatedBody = validator.validateCreateRace(req.body);
    const race = await adminRacesService.createRace(tournamentId, validatedBody);
    return res.status(201).json({ message: 'Race created successfully', race });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function updateRace(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const validatedBody = validator.validateUpdateRace(req.body);
    const race = await adminRacesService.updateRace(raceId, validatedBody);
    return res.status(200).json({ message: 'Race updated successfully', race });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function deleteRace(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const result = await adminRacesService.deleteRace(raceId);
    return res.status(200).json({ message: 'Race deleted successfully' });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function listRaceEntries(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const status = req.query?.status || undefined;
    const result = await adminRacesService.listRaceEntries(raceId, { status });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function bulkReviewEntries(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries must be a non-empty array.' });
    }

    const allowedStatuses = ['APPROVED', 'REJECTED'];
    for (const e of entries) {
      if (!e.entryId) return res.status(400).json({ error: 'Each entry must have an entryId.' });
      if (!allowedStatuses.includes(e.status)) {
        return res.status(400).json({ error: `Invalid status for entry ${e.entryId}. Allowed: APPROVED, REJECTED` });
      }
      if (e.status === 'REJECTED' && !e.reason) {
        return res.status(400).json({ error: `reason is required when rejecting entry ${e.entryId}.` });
      }
    }

    const reviewerId = Number(req.user.sub);
    const summary = await adminRacesService.bulkReviewEntries(raceId, entries, reviewerId);
    return res.status(200).json({ message: 'Bulk review completed', summary });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

module.exports = {
  listRacesByTournament,
  getRaceById,
  createRace,
  updateRace,
  deleteRace,
  listRaceEntries,
  bulkReviewEntries,
};
