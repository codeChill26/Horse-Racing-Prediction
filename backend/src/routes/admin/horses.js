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

module.exports = router;
