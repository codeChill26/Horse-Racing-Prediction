const express = require('express');
const router = express.Router({ mergeParams: true });

const authMiddleware = require('../middlewares/auth');
const horseOwnerOnly = require('../middlewares/horseOwnerOnly');
const raceEntriesController = require('../controllers/raceEntries.controller');

// POST /api/races/:raceId/entries
// Also used by POST /api/entries with raceId in body.
router.post('/', authMiddleware, horseOwnerOnly, raceEntriesController.createEntry);

module.exports = router;
