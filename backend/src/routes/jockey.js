// backend/src/routes/jockey.js

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const jockeyOnly = require('../middlewares/jockeyOnly');
const controller = require('../controllers/jockey.controller');

// Tất cả API trong router này đều yêu cầu xác thực + quyền JOCKEY
router.use(auth, jockeyOnly);

// Profile
router.get('/profile', controller.getProfile);
router.post('/profile', controller.updateProfile);

// Invitations
router.get('/invitations', controller.getInvitations);
router.post('/invitations/:id/respond', controller.respondInvitation);

// Races
router.get('/races', controller.getRaces);
router.get('/races/:raceId/history', controller.getRaceHistory);

// Notifications
router.get('/notifications', controller.getNotifications);
router.post('/notifications/:id/read', controller.markNotificationRead);

module.exports = router;
