// backend/src/routes/owner/notifications.js
// GET  /api/horse-owner/notifications           – list all (newest first)
const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const horseOwnerOnly = require('../../middlewares/horseOwnerOnly');
const controller = require('../../controllers/owner/notifications.controller');

// GET /api/horse-owner/notifications?unread=true
router.get('/', authMiddleware, horseOwnerOnly, controller.getMyNotifications);

// POST /api/horse-owner/notifications/:id/read
router.post('/:id/read', authMiddleware, horseOwnerOnly, controller.markNotificationRead);

// POST /api/horse-owner/notifications/read-all
router.post('/read-all', authMiddleware, horseOwnerOnly, controller.markAllNotificationsRead);

module.exports = router;
