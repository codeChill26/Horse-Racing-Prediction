// backend/src/controllers/owner/notifications.controller.js

const notificationService = require('../../services/notifications');

async function getMyNotifications(req, res) {
  try {
    const userId = Number(req.user.sub);
    const onlyUnread = String(req.query.unread || '').toLowerCase() === 'true';
    const notifications = await notificationService.getMyNotifications(userId, { onlyUnread });
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function markNotificationRead(req, res) {
  try {
    const userId = Number(req.user.sub);
    const notificationId = parseInt(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }
    const updated = await notificationService.markRead(userId, notificationId);
    return res.status(200).json({ notification: updated });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const userId = Number(req.user.sub);
    const result = await notificationService.markAllRead(userId);
    return res.status(200).json({ updated: result.count });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
