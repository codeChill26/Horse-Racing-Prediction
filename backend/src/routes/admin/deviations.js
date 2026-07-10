// backend/src/routes/admin/deviations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminRefereeController = require('../../controllers/adminReferee.controller'); 

/**
 * API Lấy toàn bộ danh sách lệch kết quả trận đua của Trọng tài (Mục HIGH-17)
 * GET /api/admin/deviations
 */
router.get('/', authMiddleware, adminOnly, adminRefereeController.getDeviations);

module.exports = router;