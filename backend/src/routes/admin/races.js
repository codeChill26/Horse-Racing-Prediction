// backend/src/routes/admin/races.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const raceEntriesController = require('../../controllers/raceEntries.controller');
const adminRacesController = require('../../controllers/adminRaces.controller'); // Khớp với adminRaces.controller.js có sẵn
const adminRefereeController = require('../../controllers/adminReferee.controller');

// GET /api/admin/races HOẶC /api/admin/tournaments/:tournamentId/races
// 👉 Đã chuyển toàn bộ quyền xử lý cho hàm handleRaceList của Controller
router.get('/', authMiddleware, adminOnly, adminRacesController.handleRaceList);

// POST /api/admin/tournaments/:tournamentId/races - Create a race
router.post('/', authMiddleware, adminOnly, adminRacesController.createRace);

// GET /api/admin/races/:id - Get single race
router.get('/:id', authMiddleware, adminOnly, adminRacesController.getRaceById);

// GET /api/admin/races/:id/entries - List all entries for a race
router.get('/:id/entries', authMiddleware, adminOnly, adminRacesController.listRaceEntries);

// GET /api/admin/races/:id/ai-odds - AI odds suggestion (Agent 1, advisory only)
router.get('/:id/ai-odds', authMiddleware, adminOnly, adminRacesController.getAiOddsSuggestion);

// GET /api/admin/races/:id/risk-score?treasury= - AI risk assessment (Agent 2, advisory only)
router.get('/:id/risk-score', authMiddleware, adminOnly, adminRacesController.getRiskAssessment);

// PATCH /api/admin/races/:id/odds - Admin áp dụng TOÀN BỘ odds mới cho cả race cùng lúc
// (vd theo gợi ý AI) - không hỗ trợ sửa từng entry riêng lẻ để tránh lệch tổng margin.
router.patch('/:id/odds', authMiddleware, adminOnly, adminRacesController.applyOddsSuggestions);

// POST /api/admin/races/:id/bulk-review - Bulk approve/reject entries
router.post('/:id/bulk-review', authMiddleware, adminOnly, adminRacesController.bulkReviewEntries);

// PATCH /api/admin/races/:id - Update a race
router.patch('/:id', authMiddleware, adminOnly, adminRacesController.updateRace);

// DELETE /api/admin/races/:id - Delete a race
router.delete('/:id', authMiddleware, adminOnly, adminRacesController.deleteRace);

// PUT /api/admin/races/:id/registration-gate
router.put('/:id/registration-gate', authMiddleware, adminOnly, raceEntriesController.setRegistrationGate);

// GET /api/admin/races/:id/predictions — list all spectators' bets for a race (admin)
router.get('/:id/predictions', authMiddleware, adminOnly, adminRacesController.listRacePredictions);

// GET /api/admin/races/:id/wallet-activity — wallet transactions of bettors for a race (admin)
router.get('/:id/wallet-activity', authMiddleware, adminOnly, adminRacesController.listRaceWalletActivity);

router.post('/:id/assign-referees', authMiddleware, adminOnly, adminRefereeController.assignReferees);
router.get('/:id/review-conflict', authMiddleware, adminOnly, adminRefereeController.reviewConflict);
router.post('/:id/resolve-conflict', authMiddleware, adminOnly, adminRefereeController.resolveConflict);

module.exports = router;