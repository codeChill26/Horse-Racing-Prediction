// backend/src/routes/referee.js

const express = require('express');
const router = express.Router();
const refereeController = require('../controllers/referee.controller');
const authenticateToken = require('../middlewares/auth');
const refereeOnly = require('../middlewares/refereeOnly');


// Áp dụng middleware xác thực JWT cho TOÀN BỘ các API phía dưới
router.use(authenticateToken);
// Chặn mọi role khác ngoài RACE_REFEREE truy cập các API vận hành trận đấu/nghiệp vụ trọng tài
router.use(refereeOnly);

// =======================================================================
// 1. CÁC API VẬN HÀNH TRẬN ĐẤU
// =======================================================================
// Kích hoạt trận đấu
router.post('/races/:id/start', refereeController.startRace);
// Trọng tài nộp kết quả Blind Entry
router.post('/races/:id/submit', refereeController.submitResult);

// =======================================================================
// 2. CÁC API THÔNG TIN TRỌNG TÀI
// =======================================================================
router.get('/me/races', refereeController.getAssignedRaces);
router.get('/me/races/:raceId', refereeController.getRaceDetail);
router.get('/me/submissions', refereeController.getSubmissions);
router.get('/me/conflicts', refereeController.getConflicts);
router.get('/me/profile', refereeController.getProfile);

// =======================================================================
// 3. API BÁO CÁO VI PHẠM (Chuyển chuẩn kiến trúc từ Admin sang Referee)
// =======================================================================
// POST /api/referee/violations
router.post('/violations', refereeController.reportViolation);

// =======================================================================
// 4. API THÔNG BÁO (Notification dành cho trọng tài)
// =======================================================================
// GET /api/referee/me/notifications?unread=true
router.get('/me/notifications', refereeController.getMyNotifications);
// POST /api/referee/me/notifications/:id/read
router.post('/me/notifications/:id/read', refereeController.markNotificationRead);
// POST /api/referee/me/notifications/read-all
router.post('/me/notifications/read-all', refereeController.markAllNotificationsRead);
// POST /api/referee/me/notifications/:id/respond { response: 'ACCEPTED'|'REFUSED', reason? }
router.post('/me/notifications/:id/respond', refereeController.respondAssignment);

module.exports = router;