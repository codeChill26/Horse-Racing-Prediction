const horsesService = require('../services/horses');
const validator = require('../dto/horse.dto');

function parseHorseId(req, res) {
  const horseId = Number(req.params.id);
  if (!Number.isInteger(horseId) || horseId <= 0) {
    res.status(400).json({ error: 'Invalid horse id' });
    return null;
  }
  return horseId;
}

async function createHorse(req, res) {
  try {
    const ownerId = Number(req.user.sub);
    const data = validator.validateCreateHorse(req.body);
    const horse = await horsesService.createHorse(ownerId, data);
    return res.status(201).json({ message: 'Horse submitted for approval', horse });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function listMyHorses(req, res) {
  try {
    const ownerId = Number(req.user.sub);
    const horses = await horsesService.listOwnerHorses(ownerId);
    return res.status(200).json({ horses });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function listApprovedHorses(req, res) {
  try {
    const horses = await horsesService.listApprovedHorses();
    return res.status(200).json({ horses });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function getPublicHorseById(req, res) {
  try {
    const horseId = parseHorseId(req, res);
    if (!horseId) return null;

    const horse = await horsesService.getPublicHorseById(horseId);
    return res.status(200).json({ horse });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  createHorse,
  listMyHorses,
  listApprovedHorses,
  getPublicHorseById,
};
