// backend/src/controllers/owner.controller.js

const ownerService = require('../services/owner');
const validator = require('../dto/owner.dto');

async function listOpenRaces(req, res) {
  try {
    const races = await ownerService.listOpenRaces();
    return res.status(200).json({ races });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function listMyEntries(req, res) {
  try {
    const ownerId = Number(req.user.sub);
    const query = validator.validateListMyEntries(req.query);
    const entries = await ownerService.listMyEntries(ownerId, query);
    return res.status(200).json({ entries });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function listRaceEntries(req, res) {
  try {
    const raceId = Number(req.params.id);
    if (!Number.isInteger(raceId) || raceId <= 0) {
      return res.status(400).json({ error: 'Invalid race id' });
    }
    const entries = await ownerService.listRaceEntries(raceId);
    return res.status(200).json({ entries });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function getRaceDetail(req, res) {
  try {
    const raceId = Number(req.params.id);
    if (!Number.isInteger(raceId) || raceId <= 0) {
      return res.status(400).json({ error: 'Invalid race id' });
    }
    const detail = await ownerService.getRaceDetail(raceId);
    return res.status(200).json(detail);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  listOpenRaces,
  listMyEntries,
  listRaceEntries,
  getRaceDetail,
};
