const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class AdminRaceBetsService {
  /**
   * Lấy toàn bộ predictions của 1 race kèm thông tin spectator + entries.
   * Dùng cho admin giám sát lượt cược.
   */
  async listPredictionsByRace(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, name: true, status: true, scheduledAt: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const predictions = await prisma.prediction.findMany({
      where: { raceId },
      orderBy: { createdAt: 'desc' },
      include: {
        spectator: { select: { userId: true, fullName: true, email: true } },
        pick1: {
          include: { horse: { select: { horseId: true, name: true } } },
        },
        pick2: {
          include: { horse: { select: { horseId: true, name: true } } },
        },
      },
    });

    const shaped = predictions.map((p) => ({
      predictionId: p.predictionId,
      spectatorId: p.spectatorId,
      spectatorName: p.spectator?.fullName ?? null,
      spectatorEmail: p.spectator?.email ?? null,
      betType: p.betType,
      entryId1: p.entryId1,
      entry1Name: p.pick1?.horse?.name ?? `#${p.entryId1}`,
      entryId2: p.entryId2 ?? null,
      entry2Name: p.pick2?.horse?.name ?? null,
      betAmount: p.betAmount,
      lockedOdds: Number(p.lockedOdds),
      status: p.status,
      payout: p.payout ?? 0,
      createdAt: p.createdAt,
      settledAt: p.settledAt ?? null,
    }));

    const totalBetAmount = shaped.reduce((sum, p) => sum + (p.betAmount || 0), 0);
    const totalBettors = new Set(shaped.map((p) => p.spectatorId)).size;

    return {
      race: {
        raceId: race.raceId,
        name: race.name,
        status: race.status,
        scheduledAt: race.scheduledAt,
      },
      predictions: shaped,
      totalBetAmount,
      totalBettors,
    };
  }

  /**
   * Lấy lịch sử wallet transactions của các spectators đã từng đặt cược cho race.
   * Lọc theo (referenceType='PREDICTION' AND referenceId IN predictionIds)
   *   HOẶC (wallet.userId IN spectatorIds AND type IN BET_* AND createdAt >= race.scheduledAt).
   * Nhóm theo spectatorId để FE render accordion.
   */
  async listWalletActivityByRace(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, name: true, status: true, scheduledAt: true, createdAt: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const predictions = await prisma.prediction.findMany({
      where: { raceId },
      select: { predictionId: true, spectatorId: true, createdAt: true },
    });

    if (predictions.length === 0) {
      return {
        race: {
          raceId: race.raceId,
          name: race.name,
          status: race.status,
          scheduledAt: race.scheduledAt,
        },
        spectators: [],
      };
    }

    const predictionIds = predictions.map((p) => p.predictionId);
    const spectatorIds = [...new Set(predictions.map((p) => p.spectatorId))];
    const since = race.scheduledAt ?? race.createdAt;

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          {
            referenceType: 'PREDICTION',
            referenceId: { in: predictionIds.map((id) => BigInt(id)) },
          },
          {
            pointWallet: { userId: { in: spectatorIds } },
            type: { in: ['BET_PLACED', 'BET_REFUND', 'BET_WIN', 'BET_WIN_REVERSAL'] },
            createdAt: { gte: since },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        pointWallet: { select: { userId: true } },
      },
    });

    const spectatorsMap = new Map();
    for (const sid of spectatorIds) {
      spectatorsMap.set(sid, { spectatorId: sid, transactions: [] });
    }
    for (const tx of transactions) {
      const ownerId = tx.pointWallet?.userId;
      if (ownerId === undefined || ownerId === null) continue;
      if (!spectatorsMap.has(ownerId)) {
        spectatorsMap.set(ownerId, { spectatorId: ownerId, transactions: [] });
      }
      spectatorsMap.get(ownerId).transactions.push({
        transactionId: Number(tx.transactionId),
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        type: tx.type,
        referenceType: tx.referenceType ?? null,
        referenceId: tx.referenceId !== null && tx.referenceId !== undefined ? Number(tx.referenceId) : null,
        description: tx.description ?? null,
        createdAt: tx.createdAt,
      });
    }

    const spectators = await prisma.user.findMany({
      where: { userId: { in: Array.from(spectatorsMap.keys()) } },
      select: { userId: true, fullName: true, email: true },
    });
    const userInfoMap = new Map(spectators.map((u) => [u.userId, u]));

    const shapedSpectators = Array.from(spectatorsMap.values()).map((s) => {
      const info = userInfoMap.get(s.spectatorId);
      return {
        spectatorId: s.spectatorId,
        fullName: info?.fullName ?? null,
        email: info?.email ?? null,
        transactions: s.transactions,
      };
    });

    return {
      race: {
        raceId: race.raceId,
        name: race.name,
        status: race.status,
        scheduledAt: race.scheduledAt,
      },
      spectators: shapedSpectators,
    };
  }
}

module.exports = new AdminRaceBetsService();