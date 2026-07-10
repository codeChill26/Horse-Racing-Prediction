const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminDeviationsController = require('../../controllers/adminDeviations.controller');

router.use(authMiddleware, adminOnly);

// Lấy danh sách kết quả lệch
router.get('/', adminDeviationsController.listDeviations);

// Lấy chi tiết 1 kết quả lệch để so sánh
router.get('/:id', adminDeviationsController.getDeviationDetail);

// Admin chốt kết quả cuối cùng cho độ lệch
router.post('/:id/resolve', adminDeviationsController.resolveDeviation);

module.exports = router;