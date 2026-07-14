const adminRefereeService = require('../services/adminReferee');
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

      return res.status(200).json({
        success: true,
        message: 'Xử lý xung đột thành công! Trận đấu chuyển sang PENDING_RESULT.',
        data: result
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