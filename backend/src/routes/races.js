const express = require('express');
const router = express.Router();

const ownerController = require('../controllers/owner.controller');
const raceEntriesController = require('../controllers/raceEntries.controller');
const predictionsController = require('../controllers/predictions.controller');
const authMiddleware = require('../middlewares/auth');
const spectatorOnly = require('../middlewares/spectatorOnly');

// GET /api/races/bettable - Race khán giả có thể đặt cược (SCHEDULED + tournament OPEN/ONGOING).
// Phải đặt TRƯỚC /:id để tránh bị match bởi 'bettable' như 1 race id.
router.get('/bettable', ownerController.listBettableRaces);

// GET /api/races/open - List all races with registration open
router.get('/open', ownerController.listOpenRaces);

// GET /api/races/:id/entries - List APPROVED entries for a race
router.get('/:id/entries', ownerController.listRaceEntries);

// GET /api/races/:id/detail - Full race detail with entries, odds, career stats
router.get('/:id/detail', ownerController.getRaceDetail);

// GET /api/races/:id/odds - Get calculated odds for a race (route chính thức theo tài liệu)
router.get('/:id/odds', raceEntriesController.getRaceOdds);

// POST /api/races/:raceId/ai-prediction - Spectator trả điểm xem gợi ý % thắng từ AI
// (chỉ winProbability, không lộ fairOdds/suggestedOdds — đó là công cụ định giá của Admin).
router.post(
  '/:raceId/ai-prediction',
  authMiddleware,
  spectatorOnly,
  predictionsController.viewAiPrediction
);

module.exports = router;