const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const raceEntriesController = require('../../controllers/raceEntries.controller');
const predictionsController = require('../../controllers/predictions.controller');

// PUT /api/admin/races/:id/registration-gate
router.put('/:id/registration-gate', authMiddleware, adminOnly, raceEntriesController.setRegistrationGate);

// POST /api/admin/races/:id/publish - Publish race results & trigger settlement
router.post('/:id/publish', authMiddleware, adminOnly, predictionsController.publishRaceResults);

// POST /api/admin/races/:id/unpublish - Unpublish race results & rollback settlement
router.post('/:id/unpublish', authMiddleware, adminOnly, predictionsController.unpublishRaceResults);

module.exports = router;
