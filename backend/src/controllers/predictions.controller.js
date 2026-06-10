const predictionsService = require('../services/predictions');
const validator = require('../dto/prediction.dto');

async function placeBet(req, res) {
  try {
    const { spectatorId, raceId, entryIds, betAmount } = validator.validatePlaceBet(req.body, req.user.sub);
    const prediction = await predictionsService.placeBet(spectatorId, raceId, entryIds, betAmount);
    return res.status(201).json({ message: 'Bet placed successfully', prediction });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function cancelPrediction(req, res) {
  try {
    const predictionId = validator.validateCancelPrediction(req.params);
    const spectatorId = Number(req.user.sub);
    const prediction = await predictionsService.cancelPrediction(spectatorId, predictionId);
    return res.status(200).json({ message: 'Prediction cancelled successfully', prediction });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function listMyPredictions(req, res) {
  try {
    const spectatorId = Number(req.user.sub);
    const predictions = await predictionsService.listMyPredictions(spectatorId);
    return res.status(200).json({ predictions });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function getPredictionById(req, res) {
  try {
    const predictionId = Number(req.params.id);
    if (!Number.isInteger(predictionId) || predictionId <= 0) {
      return res.status(400).json({ error: 'Invalid prediction id' });
    }
    const spectatorId = Number(req.user.sub);
    const prediction = await predictionsService.getPredictionById(spectatorId, predictionId);
    return res.status(200).json({ prediction });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function publishRaceResults(req, res) {
  try {
    const raceId = validator.validatePublishResults(req.params);
    const result = await predictionsService.publishResults(raceId);
    return res.status(200).json({
      message: 'Race results published and settlements completed successfully',
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function unpublishRaceResults(req, res) {
  try {
    const raceId = validator.validateUnpublishResults(req.params);
    const result = await predictionsService.unpublishResults(raceId);
    return res.status(200).json({
      message: 'Race results unpublished and rollback completed successfully',
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  placeBet,
  cancelPrediction,
  listMyPredictions,
  getPredictionById,
  publishRaceResults,
  unpublishRaceResults,
};
