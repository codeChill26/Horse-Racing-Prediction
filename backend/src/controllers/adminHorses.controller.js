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

async function listHorses(req, res) {
  try {
    const { status } = validator.validateListAdminHorses(req.query);
    const horses = await horsesService.listAdminHorses({ status });
    return res.status(200).json({ horses });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function getHorseById(req, res) {
  try {
    const horseId = parseHorseId(req, res);
    if (!horseId) return null;

    const horse = await horsesService.getAdminHorseById(horseId);
    return res.status(200).json({ horse });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function reviewHorse(req, res) {
  try {
    const horseId = parseHorseId(req, res);
    if (!horseId) return null;

    const review = validator.validateReviewHorse(req.body);
    const reviewerId = Number(req.user.sub);
    const horse = await horsesService.reviewHorse(horseId, review, reviewerId);

    return res.status(200).json({ message: 'Horse review updated successfully', horse });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  listHorses,
  getHorseById,
  reviewHorse,
};
