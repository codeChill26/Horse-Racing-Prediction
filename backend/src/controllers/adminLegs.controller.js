// backend/src/controllers/adminLegs.controller.js

const adminLegsService = require('../services/adminLegs');
const validator = require('../dto/leg.dto');

async function listLegs(req, res) {
  try {
    const tournamentId = validator.parseTournamentId(req.params);
    const legs = await adminLegsService.listLegs(tournamentId);
    return res.status(200).json({ legs });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function getLegById(req, res) {
  try {
    const legId = validator.parseLegId(req.params);
    const leg = await adminLegsService.getLegById(legId);
    return res.status(200).json({ leg });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function createLeg(req, res) {
  try {
    const tournamentId = validator.parseTournamentId(req.params);
    const validatedBody = validator.validateCreateLeg(req.body);
    const leg = await adminLegsService.createLeg(tournamentId, validatedBody);
    return res.status(201).json({ message: 'Leg created successfully', leg });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function updateLeg(req, res) {
  try {
    const legId = validator.parseLegId(req.params);
    const validatedBody = validator.validateUpdateLeg(req.body);
    const leg = await adminLegsService.updateLeg(legId, validatedBody);
    return res.status(200).json({ message: 'Leg updated successfully', leg });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function deleteLeg(req, res) {
  try {
    const legId = validator.parseLegId(req.params);
    const result = await adminLegsService.deleteLeg(legId);
    return res.status(200).json({ message: 'Leg deleted successfully' });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

module.exports = {
  listLegs,
  getLegById,
  createLeg,
  updateLeg,
  deleteLeg,
};
