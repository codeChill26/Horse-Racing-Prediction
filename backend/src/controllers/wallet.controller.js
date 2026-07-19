const walletService = require('../services/wallet');

async function listAllWallets(req, res) {
  try {
    const wallets = await walletService.listAllWallets();
    return res.status(200).json({ wallets });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

async function getMyWallet(req, res) {
  try {
    const userId = Number(req.user.sub);
    const wallet = await walletService.getMyWallet(userId);
    return res.status(200).json({ wallet });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function getMyTransactions(req, res) {
  try {
    const userId = Number(req.user.sub);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const result = await walletService.getMyTransactions(userId, { page, limit });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function adminAdjustBalance(req, res) {
  try {
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const { amount, reason } = req.body;
    const adminId = Number(req.user.sub);
    const result = await walletService.adminAdjustBalance(targetUserId, amount, reason, adminId);
    return res.status(200).json({ message: 'Balance adjusted successfully', ...result });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

async function adminGetTransactionHistory(req, res) {
  try {
    const userId = req.params.userId ? Number(req.params.userId) : undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const result = await walletService.getAdminTransactionHistory(userId, { page, limit });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  listAllWallets,
  getMyWallet,
  getMyTransactions,
  adminAdjustBalance,
  adminGetTransactionHistory,
};
