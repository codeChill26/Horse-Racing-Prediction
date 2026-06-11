const express = require('express');
const router = express.Router({ mergeParams: true });

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminLegsController = require('../../controllers/adminLegs.controller');

// GET /api/admin/tournaments/:tournamentId/legs - List legs in tournament
router.get('/', authMiddleware, adminOnly, adminLegsController.listLegs);

// POST /api/admin/tournaments/:tournamentId/legs - Create leg in tournament
router.post('/', authMiddleware, adminOnly, adminLegsController.createLeg);

// GET /api/admin/legs/:id - Get single leg
router.get('/:id', authMiddleware, adminOnly, adminLegsController.getLegById);

// PATCH /api/admin/legs/:id - Update leg
router.patch('/:id', authMiddleware, adminOnly, adminLegsController.updateLeg);

// DELETE /api/admin/legs/:id - Delete leg (must have no races)
router.delete('/:id', authMiddleware, adminOnly, adminLegsController.deleteLeg);

module.exports = router;
