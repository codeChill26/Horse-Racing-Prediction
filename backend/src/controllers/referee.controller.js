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
      return res.status(error.status || 400).json({ success: false, message: error.message });
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
      return res.status(error.status || 400).json({ success: false, message: error.message });
    }
  }

  // BỔ SUNG HÀM BỊ THIẾU: Lấy danh sách trận đấu
  async getAssignedRaces(req, res) {
    try {
      // Lưu ý: Token của bạn có vẻ đang lưu ID ở req.user.sub (như bạn dùng ở hàm startRace) 
      // Nên mình sẽ đồng bộ dùng req.user.sub cho tất cả các hàm mới để tránh lỗi
      const refereeId = Number(req.user.sub) || req.user.userId;
      const races = await refereeService.getAssignedRaces(refereeId, req.query);
      return res.status(200).json({ races: races, pagination: { page: 1, pageSize: races.length, total: races.length } });
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
  }

  // ĐÃ SỬA TÊN: Đổi từ getAssignedRaceDetail thành getRaceDetail cho khớp Router
  async getRaceDetail(req, res) {
    try {
      const refereeId = Number(req.user.sub) || req.user.userId;
      const raceId = parseInt(req.params.raceId);
      const race = await refereeService.getRaceDetail(refereeId, raceId);
      if (!race) return res.status(404).json({ message: 'Trận đấu không tồn tại hoặc không thuộc quyền quản lý của bạn.' });
      return res.status(200).json(race);
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
  }

  async getSubmissions(req, res) {
    try {
      const refereeId = Number(req.user.sub) || req.user.userId;
      const submissions = await refereeService.getSubmissionsHistory(refereeId, req.query);
      return res.status(200).json({ submissions: submissions });
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
  }

  async getConflicts(req, res) {
    try {
      const refereeId = Number(req.user.sub) || req.user.userId;
      const conflicts = await refereeService.getConflictsList(refereeId);
      return res.status(200).json({ conflicts: conflicts });
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
  }

  async getProfile(req, res) {
    try {
      const refereeId = Number(req.user.sub) || req.user.userId;
      const profile = await refereeService.getRefereeProfile(refereeId);
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
  }

  async reportViolation(req, res) {
    try {
      const refereeUserId = Number(req.user.sub) || req.user.userId;
      const result = await refereeService.reportViolation(req.body, refereeUserId);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }
}

module.exports = new RefereeController();