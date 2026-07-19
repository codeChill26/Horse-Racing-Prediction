// backend/src/routes/admin/violations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminUsersController = require('../../controllers/adminUsers.controller');

// Đảm bảo tất cả route dưới đây đều phải có quyền Admin
router.use(authMiddleware, adminOnly);

/**
 * GET /api/admin/violations (CRITICAL-11)
 * Admin lấy danh sách vi phạm
 */
router.get('/', adminUsersController.getViolationsList);

/**
 * GET /api/admin/violations/:id (CRITICAL-12)
 * Admin lấy chi tiết 1 vi phạm
 */
router.get('/:id', adminUsersController.getViolationById); // Chú ý: Cần định nghĩa hàm này trong controller

/**
 * POST /api/admin/violations/:id/start-review (CRITICAL-13)
 * Admin bắt đầu xử lý vi phạm
 */
router.post('/:id/start-review', adminUsersController.startReviewViolation); // Chú ý: Cần định nghĩa hàm này

/**
 * POST /api/admin/violations/:id/resolve (CRITICAL-14)
 * Admin quyết định xử phạt
 */
router.post('/:id/resolve', adminUsersController.resolveViolation);

/**
 * POST /api/admin/violations/:id/dismiss (CRITICAL-15)
 * Admin bác bỏ vi phạm
 */
router.post('/:id/dismiss', adminUsersController.dismissViolation);

/**
 * POST /api/admin/violations/direct-penalty
 * Admin xử phạt trực tiếp (tạo và resolve)
 */
router.post('/direct-penalty', adminUsersController.directPenaltyViolation);

module.exports = router;