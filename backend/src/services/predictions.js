const prisma = require('../config/prisma');

const MIN_BET = 10;
const MAX_BET_PCT = 0.5;

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class PredictionsService {

  async placeBet(spectatorId, raceId, betType, entryIds, betAmount) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, status: true },
    });

    if (!race) throw httpError('Race not found', 404);
    if (race.status !== 'SCHEDULED') {
      throw httpError('Can only place bets on SCHEDULED races', 409);
    }

    const spectator = await prisma.user.findUnique({
      where: { userId: spectatorId },
      select: { isActive: true },
    });

    if (!spectator) throw httpError('Spectator not found', 404);
    if (!spectator.isActive) throw httpError('Account is not active. Cannot place bets.', 403);

    const entries = await prisma.raceEntry.findMany({
      where: { entryId: { in: entryIds }, raceId },
      select: { entryId: true, status: true },
    });

    if (entries.length !== entryIds.length) {
      throw httpError('All entries must belong to the specified race', 400);
    }

    const allApproved = entries.every((e) => e.status === 'APPROVED');
    if (!allApproved) {
      throw httpError('All selected entries must be in APPROVED status', 409);
    }

    const wallet = await prisma.pointWallet.findUnique({
      where: { userId: spectatorId },
    });

    if (!wallet) throw httpError('Wallet not found. Spectator must have a wallet.', 404);
    if (wallet.isFrozen === 1) throw httpError('Your wallet is frozen. Cannot place bets.', 403);

    const maxBet = Math.floor(wallet.balance * MAX_BET_PCT);
    if (betAmount < MIN_BET) {
      throw httpError(`Minimum bet amount is ${MIN_BET} points`, 400);
    }
    if (betAmount > maxBet) {
      throw httpError(`Số điểm đặt cược vượt quá 50% số dư hiện tại. Tối đa cho phép: ${maxBet} điểm`, 400);
    }

    const oddsRecords = await prisma.odds.findMany({
      where: { entryId: { in: entryIds }, raceId },
      select: { entryId: true, oddsFinal: true },
    });

    if (oddsRecords.length !== entryIds.length) {
      throw httpError('Odds not calculated for all selected entries yet', 409);
    }

    const oddsMap = {};
    for (const o of oddsRecords) {
      oddsMap[o.entryId] = Number(o.oddsFinal);
    }

    let lockedOdds;
    if (['WIN', 'PLACE', 'SHOW'].includes(betType)) {
      lockedOdds = oddsMap[entryIds[0]];
    } else {
      lockedOdds = (oddsMap[entryIds[0]] + oddsMap[entryIds[1]]) / 2;
    }
    lockedOdds = Math.round(lockedOdds * 100) / 100;

    return prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.pointWallet.update({
        where: { walletId: wallet.walletId },
        data: { balance: { decrement: betAmount } },
      });

      if (updatedWallet.balance < 0) {
        throw httpError('Insufficient balance', 400);
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          amount: -betAmount,
          balanceAfter: updatedWallet.balance,
          referenceType: 'PREDICTION',
          type: 'BET_PLACED',
          description: `Placed ${betType} bet of ${betAmount} points on race #${raceId}`,
        },
      });

      const predictionData = {
        spectatorId,
        raceId,
        betType,
        entryId1: entryIds[0],
        betAmount,
        lockedOdds,
        status: 'PENDING',
      };

      if (entryIds[1] !== undefined) {
        predictionData.entryId2 = entryIds[1];
      }

      const prediction = await tx.prediction.create({
        data: predictionData,
        include: {
          pick1: { include: { horse: { select: { horseId: true, name: true } } } },
          pick2: { include: { horse: { select: { horseId: true, name: true } } } },
          race: { select: { raceId: true, name: true } },
        },
      });

      return prediction;
    });
  }

  async cancelPrediction(spectatorId, predictionId) {
    const prediction = await prisma.prediction.findUnique({
      where: { predictionId },
      include: { race: { select: { status: true } } },
    });

    if (!prediction) throw httpError('Prediction not found', 404);
    if (prediction.spectatorId !== spectatorId) {
      throw httpError('Unauthorized to cancel this prediction', 403);
    }
    if (prediction.status !== 'PENDING') {
      throw httpError('Only PENDING predictions can be cancelled', 409);
    }
    if (prediction.race.status !== 'SCHEDULED') {
      throw httpError('Can only cancel predictions for SCHEDULED races', 409);
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.pointWallet.findUnique({
        where: { userId: spectatorId },
      });

      if (!wallet) throw httpError('Wallet not found', 404);

      const updatedWallet = await tx.pointWallet.update({
        where: { walletId: wallet.walletId },
        data: { balance: { increment: prediction.betAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          amount: prediction.betAmount,
          balanceAfter: updatedWallet.balance,
          referenceType: 'PREDICTION',
          type: 'BET_REFUND',
          description: `Cancelled prediction #${predictionId} - refunded ${prediction.betAmount} points`,
        },
      });

      const updated = await tx.prediction.update({
        where: { predictionId },
        data: { status: 'REFUNDED' },
      });

      return updated;
    });
  }

  async listMyPredictions(spectatorId) {
    return prisma.prediction.findMany({
      where: { spectatorId },
      orderBy: { createdAt: 'desc' },
      include: {
        race: { select: { raceId: true, name: true, status: true } },
        pick1: { include: { horse: { select: { horseId: true, name: true } } } },
        pick2: { include: { horse: { select: { horseId: true, name: true } } } },
      },
    });
  }

  async getPredictionById(spectatorId, predictionId) {
    const prediction = await prisma.prediction.findUnique({
      where: { predictionId },
      include: {
        race: { select: { raceId: true, name: true, status: true, publishedAt: true } },
        pick1: { include: { horse: { select: { horseId: true, name: true } } } },
        pick2: { include: { horse: { select: { horseId: true, name: true } } } },
      },
    });

    if (!prediction) throw httpError('Prediction not found', 404);
    if (prediction.spectatorId !== spectatorId) {
      throw httpError('Unauthorized', 403);
    }

    return prediction;
  }

  async getBettingStats(spectatorId) {
    const predictions = await prisma.prediction.findMany({
      where: { spectatorId }
    }) || [];

    const totalBets = predictions.length;
    const totalInvested = predictions.reduce((sum, p) => sum + (Number(p.betAmount) || 0), 0);
    
    const wonBets = predictions.filter(p => p.status === 'WON' || p.status === 'PARTIAL_WON');
    const totalPayout = wonBets.reduce((sum, p) => sum + (Number(p.payout) || 0), 0);
    
    const winRate = totalBets === 0 ? 0 : Math.round((wonBets.length / totalBets) * 100);
    const netProfit = totalPayout - totalInvested;

    return {
      summary: {
        totalBets,
        totalInvested,
        totalPayout,
        netProfit,
        winRate
      },
      recentActivity: predictions.slice(0, 10).map(p => ({
        predictionId: p.predictionId,
        betType: p.betType,
        betAmount: p.betAmount,
        status: p.status,
        createdAt: p.createdAt
      }))
    };
  }

  /**
   * Lấy thống kê tổng quan các lượt cược
   */
  async getStats() {
    const stats = await prisma.prediction.groupBy({
      by: ['status'],
      _count: true
    });
    
    const total = await prisma.prediction.count();
    const totalPoolRaw = await prisma.prediction.aggregate({
      _sum: { betAmount: true }
    });

    return {
      totalPredictions: total,
      totalPool: totalPoolRaw._sum.betAmount || 0,
      won: stats.find(s => s.status === 'WON')?._count || 0,
      lost: stats.find(s => s.status === 'LOST')?._count || 0,
      pending: stats.find(s => s.status === 'PENDING')?._count || 0
    };
  }
}

module.exports = new PredictionsService();
