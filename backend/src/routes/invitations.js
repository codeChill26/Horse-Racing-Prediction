// backend/src/routes/invitations.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/jockeyInvitation.controller');
const authMiddleware = require('../middlewares/auth');

// Tất cả các API luồng này bắt buộc phải đi qua lớp Token gác cổng an ninh
router.get('/jockeys', authMiddleware, controller.searchJockeys);
router.get('/', authMiddleware, controller.getInvitations);
router.post('/', authMiddleware, controller.sendInvitation);
router.put('/:id/respond', authMiddleware, controller.respondInvitation);
router.post('/:id/confirm', authMiddleware, controller.confirmJockey);

module.exports = router;