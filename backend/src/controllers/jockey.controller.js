// backend/src/controllers/jockey.controller.js

const jockeyService = require('../services/jockey');
const validator = require('../dto/jockey.dto');

class JockeyController {
  // ============================================================
  // PROFILE
  // ============================================================

  async getProfile(req, res) {
    try {
      const userId = Number(req.user.sub);
      const result = await jockeyService.getProfile(userId);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = Number(req.user.sub);
      const validated = validator.validateUpdateProfile(req.body);
      const result = await jockeyService.updateProfile(userId, validated);
      return res.status(200).json({ profile: result });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  // ============================================================
  // INVITATIONS
  // ============================================================

  async getInvitations(req, res) {
    try {
      const jockeyId = Number(req.user.sub);
      const { status } = req.query;
      const pagination = validator.parsePagination(req.query);
      const result = await jockeyService.getInvitations(jockeyId, {
        status,
        ...pagination,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async respondInvitation(req, res) {
    try {
      const jockeyId = Number(req.user.sub);
      const invitationId = Number(req.params.id);
      const validated = validator.validateRespondInvitation(req.body);
      const result = await jockeyService.respondInvitation(jockeyId, invitationId, validated);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  // ============================================================
  // RACES
  // ============================================================

  async getRaces(req, res) {
    try {
      const jockeyId = Number(req.user.sub);
      const { status } = req.query;
      const pagination = validator.parsePagination(req.query);
      const result = await jockeyService.getAssignedRaces(jockeyId, {
        status,
        ...pagination,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async getRaceHistory(req, res) {
    try {
      const jockeyId = Number(req.user.sub);
      const result = await jockeyService.getRaceHistory(jockeyId);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  async getNotifications(req, res) {
    try {
      const userId = Number(req.user.sub);
      const isReadRaw = req.query?.isRead;
      let isRead;
      if (isReadRaw === 'true') isRead = true;
      else if (isReadRaw === 'false') isRead = false;
      const pagination = validator.parsePagination(req.query);
      const result = await jockeyService.getNotifications(userId, {
        isRead,
        ...pagination,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async markNotificationRead(req, res) {
    try {
      const userId = Number(req.user.sub);
      const notificationId = Number(req.params.id);
      const result = await jockeyService.markNotificationRead(userId, notificationId);
      return res.status(200).json({ notification: result });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }
}

module.exports = new JockeyController();
