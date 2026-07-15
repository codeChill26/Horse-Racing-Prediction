const adminRefereeService = require('../services/adminReferee');
const socketEmitter = require('../socket/emitter');
const { validateAssignReferees, validateResolveConflict } = require('../dto/referee.dto');

class AdminRefereeController {
  async assignReferees(req, res) {
    try {
      const { id } = req.params;
      const validation = validateAssignReferees(req.body);
      if (!validation.valid) return res.status(400).json({ success: false, message: validation.error });

      const { refereeAId, refereeBId } = req.body;
      const result = await adminRefereeService.assignRefereesToRace(id, refereeAId, refereeBId);

      return res.status(200).json({ success: true, message: 'Phân công 2 trọng tài thành công.', data: result });
    } catch (error) {
      return res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  async assignRefereesToTournamentCtrl(req, res) {
    try {
      const { id } = req.params;
      const validation = validateAssignReferees(req.body);
      if (!validation.valid) return res.status(400).json({ success: false, message: validation.error });

      const tournamentId = Number(id);
      if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid tournament id' });
      }
      const { refereeAId, refereeBId } = req.body;
      const result = await adminRefereeService.assignRefereesToTournament(tournamentId, refereeAId, refereeBId);

      return res.status(200).json({
        success: true,
        message: `Phân công trọng tài cho ${result.succeeded}/${result.totalRaces} chặng đua trong giải.`,
        data: result,
      });
    } catch (error) {
      return res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  async reviewConflict(req, res) {
    try {
      const { id } = req.params;
      const data = await adminRefereeService.getConflictReviewData(id);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  async resolveConflict(req, res) {
    try {
      const { id } = req.params;
      const adminUserId = Number(req.user.sub);

      const validation = validateResolveConflict(req.body);
      if (!validation.valid) return res.status(400).json({ success: false, message: validation.error });

      const { finalResults, reason } = req.body;
      const result = await adminRefereeService.resolveResultConflict(id, adminUserId, finalResults, reason);

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
        success: true,
        message: 'Xử lý xung đột thành công! Trận đấu đã kết thúc.',
        data: result.race
      });
    } catch (error) {
      return res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }
   
  // Thêm hàm này vào trong file adminReferee.controller.js hiện tại của bạn
  async  getDeviations(req, res) {
  try {
    const statusFilter = req.query.status || 'CONFLICTED';
    const deviations = await adminRefereeService.getDeviationsList(statusFilter);
    return res.status(200).json({ deviations });
   } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
   }
  }
  
}


module.exports = new AdminRefereeController();