const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const adminUsersController = require('../controllers/adminUsers.controller');

// Bắt buộc đăng nhập
router.use(authMiddleware);

// Thêm Route: Lấy danh sách vi phạm của chính user (Chủ ngựa/Nài ngựa)
// MEDIUM-16: GET /api/me/violations
router.get('/violations', adminUsersController.getMyViolations);

// HIGH-20: GET /api/me/violations/:id - User xem chi tiết violation của chính mình
router.get('/violations/:id', adminUsersController.getMyViolationById);

module.exports = router;