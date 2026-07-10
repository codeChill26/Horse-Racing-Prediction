// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const usersController = require('../controllers/adminUsers.controller'); 

/**
 * API Lấy danh sách vi phạm cá nhân phục vụ trang Profile (Mục HIGH-16)
 * GET /api/me/violations
 */
router.get('/violations', authMiddleware, usersController.getMyViolations);

module.exports = router;