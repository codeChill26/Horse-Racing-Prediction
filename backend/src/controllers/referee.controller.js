const refereeService = require('../services/referee');
const { validateRefereeSubmission } = require('../dto/referee.dto');

class RefereeController {
  async startRace(req, res) {
    try {
      const { id } = req.params;
      const refereeUserId = Number(req.user.sub);

      const result = await refereeService.startRace(id, refereeUserId);
      return res.status(200).json({
        success: true,
        message: 'Trận đấu đã chính thức bắt đầu (IN_PROGRESS). Toàn bộ cổng cược đã bị khóa.',
        data: result
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async submitResult(req, res) {
    try {
      const { id } = req.params;
      const refereeUserId = Number(req.user.sub);
      const { rawResults } = req.body;

      const validation = validateRefereeSubmission(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      const report = await refereeService.submitRaceResult(id, refereeUserId, rawResults);
      return res.status(200).json({
        success: true,
        status: report.status,
        message: report.message
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new RefereeController();