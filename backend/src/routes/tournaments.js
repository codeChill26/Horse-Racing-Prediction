// backend/src/routes/tournaments.js

const express = require('express');
const router = express.Router();

const tournamentsController = require('../controllers/tournaments.controller');

// Public endpoints: Draft tournaments are NOT visible here.

// GET /api/tournaments
router.get('/', tournamentsController.listPublicTournaments);

// GET /api/tournaments/:id
router.get('/:id', tournamentsController.getPublicTournamentById);

// GET /api/tournaments/:id/races
router.get('/:id/races', tournamentsController.listTournamentRaces);

module.exports = router;
