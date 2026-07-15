const adminRefereeService = require('../services/adminReferee');
const socketEmitter = require('../socket/emitter');

class AdminDeviationsController {
  // GET /api/admin/deviations
  async listDeviations(req, res) {
    try {
      const { page, pageSize, status } = req.query;
      const result = await adminRefereeService.listDeviations({ page, pageSize, status });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message });
    }
  }

  // GET /api/admin/deviations/:id
  async getDeviationDetail(req, res) {
    try {
      const { id } = req.params;
      const result = await adminRefereeService.getDeviationDetail(id);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  // POST /api/admin/deviations/:id/resolve
  async resolveDeviation(req, res) {
    try {
      const { id } = req.params; // id = officialResultId
      const { finalResults, reason } = req.body;
      const adminUserId = Number(req.user.sub) || req.user.userId;

      const result = await adminRefereeService.resolveDeviationById(id, adminUserId, finalResults, reason);

      // Emit socket event for race finished
      const raceResultPayload = {
        raceId: result.race.raceId,
        raceName: result.race.name,
        status: 'FINISHED',
        results: result.results
      };
      socketEmitter.emitToRace(result.race.raceId, 'race:finished', raceResultPayload);
      socketEmitter.emitToAdmin('race:finished', raceResultPayload);

      return res.status(200).json({
        message: 'Đã phân xử thành công kết quả xung đột',
        race: result.race
      });
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }
}

module.exports = new AdminDeviationsController();