// backend/src/routes/admin/violations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminUsersController = require('../../controllers/adminUsers.controller');

/**
 * GET /api/admin/violations
 * Admin lấy toàn bộ danh sách vi phạm của hệ thống (Mục CRITICAL-10)
 */
router.get('/', authMiddleware, adminOnly, adminUsersController.getViolationsList);

/**
 * POST /api/referee/violations/reporter
 * Trọng tài thực hiện nộp báo cáo vi phạm mới (Mục CRITICAL-10)
 */
router.post('/reporter', authMiddleware, adminUsersController.reportViolation);

/**
 * POST /api/admin/violations/:id/resolve
 * Admin đưa ra quyết định xử phạt vi phạm (Mục CRITICAL-10)
 */
router.post('/:id/resolve', authMiddleware, adminOnly, adminUsersController.resolveViolation);

module.exports = router;