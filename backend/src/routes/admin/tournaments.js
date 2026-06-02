// backend/src/routes/admin/tournaments.js

const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminTournamentsController = require('../../controllers/adminTournaments.controller');

// GET /api/admin/tournaments?status=DRAFT
router.get('/', authMiddleware, adminOnly, adminTournamentsController.listTournaments);

// GET /api/admin/tournaments/:id
router.get('/:id', authMiddleware, adminOnly, adminTournamentsController.getTournamentById);

// POST /api/admin/tournaments
router.post('/', authMiddleware, adminOnly, adminTournamentsController.createTournament);

// PATCH /api/admin/tournaments/:id
router.patch('/:id', authMiddleware, adminOnly, adminTournamentsController.updateTournament);

// PATCH /api/admin/tournaments/:id/status
// body: { status: 'OPEN' | 'ONGOING' | 'FINISHED' | 'CANCELLED', cancelReason?: string }
router.patch('/:id/status', authMiddleware, adminOnly, adminTournamentsController.changeStatus);

// DELETE /api/admin/tournaments/:id
// If tournament contains races, it will be CANCELLED instead. Provide body/query { reason }.
router.delete('/:id', authMiddleware, adminOnly, adminTournamentsController.deleteTournament);

module.exports = router;
