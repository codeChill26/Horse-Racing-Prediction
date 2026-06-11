const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const spectatorOnly = require('../middlewares/spectatorOnly');
const predictionsController = require('../controllers/predictions.controller');

// POST /api/predictions - Place a bet (Spectator only)
router.post('/', authMiddleware, spectatorOnly, predictionsController.placeBet);

// GET /api/predictions - List my predictions
router.get('/', authMiddleware, predictionsController.listMyPredictions);

// GET /api/predictions/:id - Get prediction detail
router.get('/:id', authMiddleware, predictionsController.getPredictionById);

// PUT /api/predictions/:id/cancel - Cancel a pending prediction
router.put('/:id/cancel', authMiddleware, spectatorOnly, predictionsController.cancelPrediction);

module.exports = router;
