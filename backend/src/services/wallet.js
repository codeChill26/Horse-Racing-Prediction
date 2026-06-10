const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class WalletService {
  async getMyWallet(userId) {
    const wallet = await prisma.pointWallet.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true, email: true } } },
    });

    if (!wallet) throw httpError('Wallet not found', 404);
    return wallet;
  }

  async getMyTransactions(userId, { page = 1, limit = 20 } = {}) {
    const wallet = await prisma.pointWallet.findUnique({
      where: { userId },
      select: { walletId: true },
    });

    if (!wallet) throw httpError('Wallet not found', 404);

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.walletId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({
        where: { walletId: wallet.walletId },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminAdjustBalance(targetUserId, amount, reason, adminId) {
    if (!reason || !reason.trim()) {
      throw httpError('Reason is required for manual balance adjustment', 400);
    }

    if (!Number.isInteger(amount) || amount === 0) {
      throw httpError('Amount must be a non-zero integer', 400);
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.pointWallet.findUnique({
        where: { userId: targetUserId },
      });

      if (!wallet) throw httpError('Target user does not have a wallet', 404);
      if (wallet.isFrozen === 1) {
        throw httpError('Cannot adjust a frozen wallet', 409);
      }

      if (amount < 0) {
        const withdrawAmount = Math.abs(amount);
        if (wallet.balance < withdrawAmount) {
          throw httpError(
            `Insufficient balance. Current: ${wallet.balance}, attempted withdrawal: ${withdrawAmount}`,
            400
          );
        }
      }

      const updatedWallet = await tx.pointWallet.update({
        where: { walletId: wallet.walletId },
        data: { balance: { increment: amount } },
      });

      const description =
        amount > 0
          ? `Admin #${adminId} deposited ${amount} points: ${reason}`
          : `Admin #${adminId} withdrew ${Math.abs(amount)} points: ${reason}`;

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          amount,
          balanceAfter: updatedWallet.balance,
          referenceType: 'MANUAL_ADJUSTMENT',
          type: 'ADMIN_ADJUSTMENT',
          description,
        },
      });

      return {
        walletId: updatedWallet.walletId,
        userId: targetUserId,
        balance: updatedWallet.balance,
        adjustment: amount,
        reason,
      };
    });
  }

  async getAdminTransactionHistory(userId, { page = 1, limit = 20 } = {}) {
    const where = userId ? { wallet: { userId } } : {};

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          pointWallet: {
            select: {
              walletId: true,
              userId: true,
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async creditWeeklyBonus() {
    const spectators = await prisma.user.findMany({
      where: {
        role: { code: 'SPECTATOR' },
        isActive: true,
      },
      select: { userId: true },
    });

    let credited = 0;
    let skipped = 0;

    for (const spectator of spectators) {
      try {
        await prisma.$transaction(async (tx) => {
          let wallet = await tx.pointWallet.findUnique({
            where: { userId: spectator.userId },
          });

          if (!wallet) {
            wallet = await tx.pointWallet.create({
              data: {
                userId: spectator.userId,
                balance: 0,
                isFrozen: 0,
              },
            });
          }

          if (wallet.isFrozen === 1) {
            skipped++;
            return;
          }

          const updated = await tx.pointWallet.update({
            where: { walletId: wallet.walletId },
            data: { balance: { increment: 100 } },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.walletId,
              amount: 100,
              balanceAfter: updated.balance,
              referenceType: 'WEEKLY_BONUS',
              type: 'WEEKLY_BONUS',
              description: 'Weekly 100-point bonus (Monday)',
            },
          });

          credited++;
        });
      } catch (err) {
        console.error(`[WEEKLY BONUS] Failed for user #${spectator.userId}:`, err.message);
        skipped++;
      }
    }

    return { credited, skipped, total: spectators.length };
  }
}

module.exports = new WalletService();
