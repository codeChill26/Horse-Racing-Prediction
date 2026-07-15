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

// POST /api/admin/tournaments/:id/assign-referees
// body: { refereeAId, refereeBId } — gán 2 trọng tài cho TẤT CẢ race trong tournament
const adminRefereeController = require('../../controllers/adminReferee.controller');
router.post(
  '/:id/assign-referees',
  authMiddleware,
  adminOnly,
  adminRefereeController.assignRefereesToTournamentCtrl
);

// POST /api/admin/tournaments/:id/notify-owners
// body: { message: string } — gửi thông báo đến tất cả Horse Owner
router.post('/:id/notify-owners', authMiddleware, adminOnly, adminTournamentsController.notifyHorseOwners);

// GET /api/admin/tournaments/:id/entries
// Lấy RaceEntry của tất cả race thuộc tournament (dùng populate race form)
router.get('/:id/entries', authMiddleware, adminOnly, adminTournamentsController.getTournamentEntries);

module.exports = router;
