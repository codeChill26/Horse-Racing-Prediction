const raceEntriesService = require('../services/raceEntries');
const oddsService = require('../services/odds');
const validator = require('../dto/raceEntry.dto');

async function createEntry(req, res) {
  try {
    const { raceId, horseId, jockeyId } = validator.validateCreateEntry(req.body, req.params);
    const ownerId = Number(req.user.sub);
    const entry = await raceEntriesService.createEntry(raceId, horseId, ownerId, jockeyId);

    return res.status(201).json({ message: 'Race entry created successfully', entry });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function reviewEntry(req, res) {
  try {
    const entryId = validator.parseEntryId(req.params);
    const review = validator.validateReviewEntry(req.body);
    const reviewerId = Number(req.user.sub);
    const entry = await raceEntriesService.reviewEntry(entryId, review, reviewerId);

    return res.status(200).json({ message: 'Race entry status updated successfully', entry });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function setRegistrationGate(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const { isOpen } = validator.validateRegistrationGate(req.body);
    const result = await raceEntriesService.setRegistrationGate(raceId, isOpen);

    return res.status(200).json({
      message: isOpen
        ? 'Race registration gate opened successfully'
        : 'Race registration gate closed successfully',
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function getRaceOdds(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const odds = await oddsService.getRaceOdds(raceId);
    return res.status(200).json({ odds });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  createEntry,
  reviewEntry,
  setRegistrationGate,
  getRaceOdds,
};
