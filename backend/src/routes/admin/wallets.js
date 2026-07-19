const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const walletController = require('../../controllers/wallet.controller');

// GET /api/admin/wallets - List all wallets with user info and balance
router.get('/', authMiddleware, adminOnly, walletController.listAllWallets);

// POST /api/admin/wallets/:userId/adjust - Admin deposit/withdraw points
router.post('/:userId/adjust', authMiddleware, adminOnly, walletController.adminAdjustBalance);

// GET /api/admin/wallets/transactions - Admin view all transactions
router.get('/transactions', authMiddleware, adminOnly, walletController.adminGetTransactionHistory);

// GET /api/admin/wallets/:userId/transactions - Admin view user's transactions
router.get('/:userId/transactions', authMiddleware, adminOnly, walletController.adminGetTransactionHistory);

module.exports = router;
