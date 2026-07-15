const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminHorsesController = require('../../controllers/adminHorses.controller');

// GET /api/admin/horses?status=PENDING
router.get('/', authMiddleware, adminOnly, adminHorsesController.listHorses);

// GET /api/admin/horses/:id
router.get('/:id', authMiddleware, adminOnly, adminHorsesController.getHorseById);

// PATCH /api/admin/horses/:id/status
// body: { status: 'APPROVED' | 'REJECTED', reason?: string }
router.patch('/:id/status', authMiddleware, adminOnly, adminHorsesController.reviewHorse);

// PATCH /api/admin/horses/:id/rating
// body: { officialRating?: number, racingPostRating?: number }
router.patch('/:id/rating', authMiddleware, adminOnly, adminHorsesController.updateRating);

// POST /api/admin/horses/:id/revoke
// body: { reason: string }
// Nghiệp vụ Thu hồi tư cách hoạt động của Ngựa và tự động hủy chuỗi bản ghi liên đới từ PROCESS.md
router.post('/:id/revoke', authMiddleware, adminOnly, adminHorsesController.revokeHorse);

module.exports = router;
