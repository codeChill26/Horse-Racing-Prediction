const express = require('express');
const router = express.Router();
const refereeController = require('../controllers/referee.controller');
const authenticateToken = require('../middlewares/auth');

router.use(authenticateToken);

// API 1: Kích hoạt trận đấu
router.post('/races/:id/start', refereeController.startRace);

// API 2: Trọng tài nộp kết quả Blind Entry
router.post('/races/:id/submit', refereeController.submitResult);

module.exports = router;