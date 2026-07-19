// backend/src/controllers/adminRaces.controller.js

const adminRacesService = require('../services/adminRaces');
const adminRaceBetsService = require('../services/adminRaceBets');
const aiPredictionService = require('../services/aiPrediction');
const aiRiskService = require('../services/aiRisk');
const oddsService = require('../services/odds');
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
    return res.status(200).json(race);
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
    
    if (!entries && req.body.entryIds && req.body.action) {
      const targetStatus = req.body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      entries = req.body.entryIds.map((id) => ({
        entryId: id,
        status: targetStatus,
        reason: req.body.reason || null
      }));
    }

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

async function getAiOddsSuggestion(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const marginRaw = req.query?.margin;
    const margin =
      marginRaw === undefined || marginRaw === '' ? undefined : Number(marginRaw);
    if (margin !== undefined && (Number.isNaN(margin) || margin < 0)) {
      return res.status(400).json({ error: 'margin must be a non-negative number' });
    }

    const result = await aiPredictionService.getRaceOddsSuggestion(raceId, { margin });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function getRiskAssessment(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const treasury = validator.parseTreasury(req.query);

    const result = await aiRiskService.getRaceRiskAssessment(raceId, { treasury });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}
    async function applyOddsSuggestions(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const entries = validator.validateApplyOddsSuggestions(req.body);
    const odds = await oddsService.applyOddsSuggestions(raceId, entries);
    return res.status(200).json({ message: 'Áp dụng odds thành công', odds });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function listAllRaces(req, res) {
  try {
    const { page, pageSize, status } = req.query;
    const result = await adminRacesService.listAllRaces({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50,
      status
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

async function handleRaceList(req, res) {
  if (req.params.tournamentId) {
    return listRacesByTournament(req, res);
  } else {
    return listAllRaces(req, res);
  }
}

async function updateRegistrationGate(req, res) {
  try {
    const { id } = req.params;
    const { isOpen } = req.body;
    const race = await adminRacesService.updateRegistrationGate(id, isOpen);
    return res.status(200).json({ message: 'Cập nhật cổng đăng ký thành công', race });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function assignReferees(req, res) {
  try {
    const { id } = req.params;
    const { refereeAId, refereeBId } = req.body;
    const race = await adminRacesService.assignReferees(id, refereeAId, refereeBId);
    return res.status(200).json({ message: 'Phân công trọng tài thành công', race });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
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
  getAiOddsSuggestion,
  getRiskAssessment,
  applyOddsSuggestions,
  listAllRaces,
  handleRaceList,
  updateRegistrationGate,
  assignReferees,
  listRacePredictions,
  listRaceWalletActivity,
};

async function listRacePredictions(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const result = await adminRaceBetsService.listPredictionsByRace(raceId);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function listRaceWalletActivity(req, res) {
  try {
    const raceId = validator.parseRaceId(req.params);
    const result = await adminRaceBetsService.listWalletActivityByRace(raceId);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}
