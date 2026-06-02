const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const horseOwnerOnly = require('../middlewares/horseOwnerOnly');
const horsesController = require('../controllers/horses.controller');

// GET /api/horses
router.get('/', horsesController.listApprovedHorses);

// GET /api/horses/mine
router.get('/mine', authMiddleware, horseOwnerOnly, horsesController.listMyHorses);

// POST /api/horses
router.post('/', authMiddleware, horseOwnerOnly, horsesController.createHorse);

// GET /api/horses/:id
router.get('/:id', horsesController.getPublicHorseById);

module.exports = router;
