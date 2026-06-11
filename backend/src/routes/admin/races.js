const express = require('express');
const router = express.Router({ mergeParams: true });

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const raceEntriesController = require('../../controllers/raceEntries.controller');
const predictionsController = require('../../controllers/predictions.controller');
const adminRacesController = require('../../controllers/adminRaces.controller');

// GET /api/admin/tournaments/:tournamentId/races - List races by tournament
router.get('/', authMiddleware, adminOnly, adminRacesController.listRacesByTournament);

// POST /api/admin/tournaments/:tournamentId/races - Create a race
router.post('/', authMiddleware, adminOnly, adminRacesController.createRace);

// GET /api/admin/races/:id - Get single race
router.get('/:id', authMiddleware, adminOnly, adminRacesController.getRaceById);

// PATCH /api/admin/races/:id - Update a race
router.patch('/:id', authMiddleware, adminOnly, adminRacesController.updateRace);

// DELETE /api/admin/races/:id - Delete a race
router.delete('/:id', authMiddleware, adminOnly, adminRacesController.deleteRace);

// GET /api/admin/legs/:legId/races - List races by leg
router.get('/by-leg/:legId', authMiddleware, adminOnly, adminRacesController.listRacesByLeg);

// PUT /api/admin/races/:id/registration-gate
router.put('/:id/registration-gate', authMiddleware, adminOnly, raceEntriesController.setRegistrationGate);

// POST /api/admin/races/:id/publish - Publish race results & trigger settlement
router.post('/:id/publish', authMiddleware, adminOnly, predictionsController.publishRaceResults);

// POST /api/admin/races/:id/unpublish - Unpublish race results & rollback settlement
router.post('/:id/unpublish', authMiddleware, adminOnly, predictionsController.unpublishRaceResults);

module.exports = router;
