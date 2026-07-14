// backend/src/routes/admin/settlement.js

const express = require('express');
const router = express.Router();
const settlementController = require('../../controllers/settlement.controller');
const auth = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');

/**
 * @route   POST /api/admin/races/:raceId/publish
 * @desc    Admin kích hoạt nút "Publish Result" công bố kết quả và tự động trả thưởng
 * @access  Chỉ dành riêng cho nhóm Admin bảo mật
 */
router.post('/:raceId/publish', auth, adminOnly, settlementController.publishResult);

/**
 * @route   POST /api/admin/races/:raceId/unpublish
 * @desc    Admin thu hồi kết quả trận đua, thực hiện hoàn tác điểm ví người chơi và đưa trận đấu về PENDING_RESULT
 * @access  Private (Chỉ Quản trị viên - Admin)
 */
router.post('/:raceId/unpublish', auth, adminOnly, settlementController.unpublishResult);

module.exports = router;