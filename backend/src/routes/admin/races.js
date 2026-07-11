const express = require('express');
const router = express.Router({ mergeParams: true });

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const raceEntriesController = require('../../controllers/raceEntries.controller');
const adminRacesController = require('../../controllers/adminRaces.controller');
const adminRefereeController = require('../../controllers/adminReferee.controller');

// GET /api/admin/tournaments/:tournamentId/races - List races by tournament
router.get('/', authMiddleware, adminOnly, adminRacesController.listRacesByTournament);

// POST /api/admin/tournaments/:tournamentId/races - Create a race
router.post('/', authMiddleware, adminOnly, adminRacesController.createRace);

// GET /api/admin/races/:id - Get single race
router.get('/:id', authMiddleware, adminOnly, adminRacesController.getRaceById);

// GET /api/admin/races/:id/entries - List all entries for a race
router.get('/:id/entries', authMiddleware, adminOnly, adminRacesController.listRaceEntries);

// GET /api/admin/races/:id/ai-odds - AI odds suggestion (Agent 1, advisory only)
router.get('/:id/ai-odds', authMiddleware, adminOnly, adminRacesController.getAiOddsSuggestion);

// GET /api/admin/races/:id/risk-score?treasury= - AI risk assessment (Agent 2, advisory only)
router.get('/:id/risk-score', authMiddleware, adminOnly, adminRacesController.getRiskAssessment);

// POST /api/admin/races/:id/bulk-review - Bulk approve/reject entries
router.post('/:id/bulk-review', authMiddleware, adminOnly, adminRacesController.bulkReviewEntries);

// PATCH /api/admin/races/:id - Update a race
router.patch('/:id', authMiddleware, adminOnly, adminRacesController.updateRace);

// DELETE /api/admin/races/:id - Delete a race
router.delete('/:id', authMiddleware, adminOnly, adminRacesController.deleteRace);

// PUT /api/admin/races/:id/registration-gate
router.put('/:id/registration-gate', authMiddleware, adminOnly, raceEntriesController.setRegistrationGate);


router.post('/:id/assign-referees', authMiddleware, adminOnly, adminRefereeController.assignReferees);
router.get('/:id/review-conflict', authMiddleware, adminOnly, adminRefereeController.reviewConflict);
router.post('/:id/resolve-conflict', authMiddleware, adminOnly, adminRefereeController.resolveConflict);


module.exports = router;
