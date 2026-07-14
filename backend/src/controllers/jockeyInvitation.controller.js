// backend/src/controllers/jockeyInvitation.controller.js
const service = require('../services/jockeyInvitation');
const validator = require('../dto/jockeyInvitation.dto');

class JockeyInvitationController {
  async searchJockeys(req, res) {
    try {
      const result = await service.searchJockeys(req.query);
      return res.status(200).json({ success: true, jockeys: result });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async sendInvitation(req, res) {
    try {
      const ownerId = req.user.sub;
      const validatedData = validator.validateSendInvitation(req.body);
      const result = await service.sendInvitation(ownerId, validatedData);
      return res.status(201).json({ message: 'Invitation sent successfully', invitation: result });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async getInvitations(req, res) {
    try {
      const userId = req.user.sub;
      const roleCode = req.user.role;
      const { status } = req.query;
      const result = await service.getInvitations(userId, roleCode, status);
      return res.status(200).json({ invitations: result });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async respondInvitation(req, res) {
    try {
      const jockeyId = req.user.sub;
      const invitationId = Number(req.params.id);
      const validatedData = validator.validateRespondInvitation(req.body);
      const result = await service.respondInvitation(jockeyId, invitationId, validatedData);
      return res.status(200).json({ message: 'Responded successfully', invitation: result });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  async confirmJockey(req, res) {
    try {
      const ownerId = req.user.sub;
      const invitationId = Number(req.params.id);
      const result = await service.confirmJockey(ownerId, invitationId);
      return res.status(200).json({ message: 'Jockey confirmed, other competing invitations auto-cancelled.', entry: result });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }
}

module.exports = new JockeyInvitationController();