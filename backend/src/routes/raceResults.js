// backend/src/routes/raceResults.js

const express = require('express');
const router = express.Router();
const raceResultsController = require('../controllers/raceResults.controller');

// GET /api/public/races/:id/results - Kết quả chi tiết 1 race cho Spectator
router.get('/races/:id/results', raceResultsController.getRaceResults);

// GET /api/public/tournaments/:id/race-results - Danh sách race results của 1 tournament
router.get('/tournaments/:id/race-results', raceResultsController.getTournamentRaceResults);

module.exports = router;
