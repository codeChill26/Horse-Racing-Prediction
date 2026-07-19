// backend/src/routes/admin/houseRevenue.js

const express = require('express');
const router = express.Router();
const settlementController = require('../../controllers/settlement.controller');
const auth = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');

/**
 * @route   GET /api/admin/house-revenue
 * @desc    Xem tổng tiền nhà cái thu về: HOUSE_REVENUE (lãi 10% tích lũy) + TREASURE_POOL
 *          (quỹ dự phòng). Chỉ đọc, không gắn với race cụ thể.
 * @access  Private (Admin)
 */
router.get('/', auth, adminOnly, settlementController.getHouseRevenue);

/**
 * @route   GET /api/admin/house-revenue/transactions?limit=&offset=
 * @desc    Sổ cái chi tiết cộng/trừ của nhà cái (HOUSE_MARGIN / TREASURE_IN / TREASURE_OUT).
 * @access  Private (Admin)
 */
router.get('/transactions', auth, adminOnly, settlementController.getHouseRevenueTransactions);

module.exports = router;
