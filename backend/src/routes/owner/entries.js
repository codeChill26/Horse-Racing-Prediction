const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const horseOwnerOnly = require('../../middlewares/horseOwnerOnly');
const ownerController = require('../../controllers/owner.controller');

// GET /api/entries/mine - Owner's entries
router.get('/mine', authMiddleware, horseOwnerOnly, ownerController.listMyEntries);

module.exports = router;
