// backend/src/routes/referee.js

const express = require('express');
const router = express.Router();
const refereeController = require('../controllers/referee.controller');
const authenticateToken = require('../middlewares/auth');

// Áp dụng middleware xác thực JWT cho TOÀN BỘ các API phía dưới
router.use(authenticateToken);

// =======================================================================
// 1. CÁC API CŨ CỦA BẠN ĐÃ PHÁT TRIỂN TỪ ĐẦU (GIỮ NGUYÊN KHÔNG ĐỔI)
// =======================================================================

// API 1: Kích hoạt trận đấu
router.post('/races/:id/start', refereeController.startRace);

// API 2: Trọng tài nộp kết quả Blind Entry
router.post('/races/:id/submit', refereeController.submitResult);

// =======================================================================
// 2. CÁC API MỚI BỔ SUNG THÊM THEO YÊU CẦU CỦA TEAM FRONTEND
// =======================================================================

// Lấy danh sách trận đấu được phân công
router.get('/me/races', refereeController.getAssignedRaces);

// Lấy chi tiết một trận đấu cụ thể
router.get('/me/races/:raceId', refereeController.getRaceDetail);

// Lấy lịch sử nộp kết quả của trọng tài
router.get('/me/submissions', refereeController.getSubmissions);

// Lấy danh sách các trận đấu đang bị tranh chấp (Conflict)
router.get('/me/conflicts', refereeController.getConflicts);

// Lấy thông tin cá nhân và thống kê của trọng tài
router.get('/me/profile', refereeController.getProfile);

module.exports = router;