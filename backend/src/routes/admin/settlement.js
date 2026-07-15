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
 * @route   GET /api/admin/races/:id/settlement
 * @desc    CRITICAL-10: Lấy settlement summary (totalPool, payouts, win/lost counts...) sau khi race đã publish
 * @access  Private (Chỉ Quản trị viên - Admin)
 */
router.get('/:id/settlement', auth, adminOnly, settlementController.getSettlementSummary);

router.post('/:raceId/unpublish', auth, adminOnly, settlementController.unpublishResult);

module.exports = router;