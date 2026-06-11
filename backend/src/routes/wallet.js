const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const walletController = require('../controllers/wallet.controller');

// GET /api/wallet - Get my wallet balance
router.get('/', authMiddleware, walletController.getMyWallet);

// GET /api/wallet/transactions - Get my transaction history
router.get('/transactions', authMiddleware, walletController.getMyTransactions);

module.exports = router;
