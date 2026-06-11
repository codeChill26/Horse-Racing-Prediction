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

async function listRacesByLeg(req, res) {
  try {
    const legId = Number(req.params.legId);
    if (!Number.isInteger(legId) || legId <= 0) {
      return res.status(400).json({ error: 'Invalid leg id' });
    }
    const races = await adminRacesService.listRacesByLeg(legId);
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

module.exports = {
  listRacesByTournament,
  listRacesByLeg,
  getRaceById,
  createRace,
  updateRace,
  deleteRace,
};
