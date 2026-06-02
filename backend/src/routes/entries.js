const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const adminOnly = require('../middlewares/adminOnly');
const horseOwnerOnly = require('../middlewares/horseOwnerOnly');
const raceEntriesController = require('../controllers/raceEntries.controller');

// POST /api/entries
router.post('/', authMiddleware, horseOwnerOnly, raceEntriesController.createEntry);

// PUT /api/entries/:id/status
router.put('/:id/status', authMiddleware, adminOnly, raceEntriesController.reviewEntry);

module.exports = router;
