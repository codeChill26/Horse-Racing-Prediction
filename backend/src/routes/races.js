const express = require('express');
const router = express.Router();

const ownerController = require('../controllers/owner.controller');

// GET /api/races/open - List all races with registration open
router.get('/open', ownerController.listOpenRaces);

// GET /api/races/:id/entries - List APPROVED entries for a race
router.get('/:id/entries', ownerController.listRaceEntries);

module.exports = router;
