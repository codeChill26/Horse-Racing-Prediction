const express = require('express');
const router = express.Router({ mergeParams: true });

const authMiddleware = require('../middlewares/auth');
const adminOnly = require('../middlewares/adminOnly');
const horseOwnerOnly = require('../middlewares/horseOwnerOnly');
const raceEntriesController = require('../controllers/raceEntries.controller');

// POST /api/races/:raceId/entries
// Also used by POST /api/entries with raceId in body.
router.post('/', authMiddleware, horseOwnerOnly, raceEntriesController.createEntry);

// PUT /api/entries/:id/status
// body: { status, reason?, weightLb?, saddleNumber? }
router.put('/:id/status', authMiddleware, adminOnly, raceEntriesController.reviewEntry);

// GET /api/races/:raceId/odds - Get calculated odds for a race
router.get('/odds', raceEntriesController.getRaceOdds);

module.exports = router;
