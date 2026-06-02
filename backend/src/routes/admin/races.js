const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const raceEntriesController = require('../../controllers/raceEntries.controller');

// PUT /api/admin/races/:id/registration-gate
router.put('/:id/registration-gate', authMiddleware, adminOnly, raceEntriesController.setRegistrationGate);

module.exports = router;
