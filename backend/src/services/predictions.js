const prisma = require('../config/prisma');

const MIN_BET = 10;
const MAX_BET_PCT = 0.5;

const MULTIPLIERS = {
  3: 1.0,
  2: 0.5,
  1: 0.2,
  0: 0,
};

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function computeOddsForEntry(entryId) {
  const entry = await prisma.raceEntry.findUnique({
    where: { entryId },
    include: {
      horse: {
        include: {
          results: true,
        },
      },
    },
  });

  if (!entry) throw httpError(`RaceEntry ${entryId} not found`, 404);

  const results = entry.horse.results;
  const totalStarts = results.length;

  if (totalStarts === 0) return 3.0;

  const wins = results.filter((r) => r.finishPosition === 1).length;
  const winRate = wins / totalStarts;

  const odds = 3.0 - winRate * 2.0;
  return Math.round(odds * 100) / 100;
}

class PredictionsService {

  async placeBet(spectatorId, raceId, entryIds, betAmount) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, status: true, tournamentId: true },
    });

    if (!race) throw httpError('Race not found', 404);
    if (race.status !== 'SCHEDULED') {
      throw httpError('Can only place bets on SCHEDULED races', 409);
    }

    const entries = await prisma.raceEntry.findMany({
      where: { entryId: { in: entryIds }, raceId },
      select: { entryId: true, status: true },
    });

    if (entries.length !== 3) {
      throw httpError('All 3 entries must belong to the specified race', 400);
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
      throw httpError(`Bet amount exceeds 50% of current balance. Max allowed: ${maxBet}`, 400);
    }

    const oddsPromises = entryIds.map((id) => computeOddsForEntry(id));
    const oddsValues = await Promise.all(oddsPromises);
    const oddsAvg = oddsValues.reduce((s, v) => s + v, 0) / 3;
    const oddsAvgRounded = Math.round(oddsAvg * 100) / 100;

    return prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.pointWallet.update({
        where: { walletId: wallet.walletId },
        data: {
          balance: { decrement: betAmount },
        },
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
          description: `Placed bet of ${betAmount} points on race #${raceId}`,
        },
      });

      const prediction = await tx.prediction.create({
        data: {
          spectatorId,
          raceId,
          entryId1: entryIds[0],
          entryId2: entryIds[1],
          entryId3: entryIds[2],
          betAmount,
          oddsAvgAtBet: oddsAvgRounded,
          status: 'PENDING',
        },
        include: {
          pick1: { include: { horse: { select: { horseId: true, name: true } } } },
          pick2: { include: { horse: { select: { horseId: true, name: true } } } },
          pick3: { include: { horse: { select: { horseId: true, name: true } } } },
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
        data: {
          balance: { increment: prediction.betAmount },
        },
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

  async publishResults(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, status: true, publishedAt: true },
    });

    if (!race) throw httpError('Race not found', 404);
    if (race.publishedAt) {
      throw httpError('Race results are already published', 409);
    }

    const results = await prisma.raceResult.findMany({
      where: { raceId },
      orderBy: { finishPosition: 'asc' },
      take: 3,
      select: { horseId: true, finishPosition: true },
    });

    if (results.length < 3) {
      throw httpError('Race must have at least 3 results (top 3 positions) to publish', 400);
    }

    const topEntryIds = await prisma.raceEntry.findMany({
      where: {
        raceId,
        horseId: { in: results.map((r) => r.horseId) },
        status: 'APPROVED',
      },
      select: { entryId: true, horseId: true },
    });

    const horseToEntryMap = {};
    for (const entry of topEntryIds) {
      horseToEntryMap[entry.horseId] = entry.entryId;
    }

    const top3EntryIds = results
      .filter((r) => horseToEntryMap[r.horseId])
      .map((r) => horseToEntryMap[r.horseId]);

    if (top3EntryIds.length < 3) {
      throw httpError('Could not map all top 3 results to approved entries', 400);
    }

    const predictions = await prisma.prediction.findMany({
      where: { raceId, status: 'PENDING' },
    });

    return prisma.$transaction(async (tx) => {
      for (const pred of predictions) {
        const picks = [pred.entryId1, pred.entryId2, pred.entryId3];
        const correctCount = picks.filter((pick) => top3EntryIds.includes(pick)).length;

        const multiplier = MULTIPLIERS[correctCount] || 0;

        let status;
        let payout = 0;

        if (correctCount === 3) {
          status = 'WON';
        } else if (correctCount === 2) {
          status = 'PARTIAL_WON';
        } else if (correctCount === 1) {
          status = 'PARTIAL_WON';
        } else {
          status = 'LOST';
        }

        if (multiplier > 0) {
          const oddsVal = Number(pred.oddsAvgAtBet);
          payout = Math.floor(pred.betAmount * multiplier * oddsVal);
        }

        if (payout > 0) {
          const wallet = await tx.pointWallet.findUnique({
            where: { userId: pred.spectatorId },
          });

          if (wallet) {
            const updatedWallet = await tx.pointWallet.update({
              where: { walletId: wallet.walletId },
              data: { balance: { increment: payout } },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.walletId,
                amount: payout,
                balanceAfter: updatedWallet.balance,
                referenceType: 'PREDICTION',
                type: 'BET_WIN',
                description: `Won ${payout} points from prediction #${pred.predictionId} (${correctCount}/3 correct)`,
              },
            });
          }
        }

        await tx.prediction.update({
          where: { predictionId: pred.predictionId },
          data: {
            status,
            payout,
            settledAt: new Date(),
          },
        });
      }

      const updatedRace = await tx.race.update({
        where: { raceId },
        data: {
          publishedAt: new Date(),
          status: 'FINISHED',
        },
      });

      return {
        race: updatedRace,
        settledCount: predictions.length,
      };
    });
  }

  async unpublishResults(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, publishedAt: true, status: true },
    });

    if (!race) throw httpError('Race not found', 404);
    if (!race.publishedAt) {
      throw httpError('Race results are not published. Cannot unpublish.', 409);
    }

    const predictions = await prisma.prediction.findMany({
      where: {
        raceId,
        status: { in: ['WON', 'PARTIAL_WON', 'LOST'] },
      },
    });

    return prisma.$transaction(async (tx) => {
      for (const pred of predictions) {
        if (pred.payout > 0) {
          const wallet = await tx.pointWallet.findUnique({
            where: { userId: pred.spectatorId },
          });

          if (wallet) {
            const updatedWallet = await tx.pointWallet.update({
              where: { walletId: wallet.walletId },
              data: { balance: { decrement: pred.payout } },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.walletId,
                amount: -pred.payout,
                balanceAfter: updatedWallet.balance,
                referenceType: 'PREDICTION',
                type: 'BET_WIN_REVERSAL',
                description: `Reversal: clawed back ${pred.payout} points from prediction #${pred.predictionId}`,
              },
            });
          }
        }

        const wallet = await tx.pointWallet.findUnique({
          where: { userId: pred.spectatorId },
        });

        if (wallet) {
          const updatedWallet = await tx.pointWallet.update({
            where: { walletId: wallet.walletId },
            data: { balance: { increment: pred.betAmount } },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.walletId,
              amount: pred.betAmount,
              balanceAfter: updatedWallet.balance,
              referenceType: 'PREDICTION',
              type: 'BET_REFUND',
              description: `Unpublish rollback: refunded ${pred.betAmount} points for prediction #${pred.predictionId}`,
            },
          });
        }

        await tx.prediction.update({
          where: { predictionId: pred.predictionId },
          data: {
            status: 'PENDING',
            payout: null,
            settledAt: null,
          },
        });
      }

      const updatedRace = await tx.race.update({
        where: { raceId },
        data: {
          publishedAt: null,
          status: 'SCHEDULED',
        },
      });

      return {
        race: updatedRace,
        rolledBackCount: predictions.length,
      };
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
        pick3: { include: { horse: { select: { horseId: true, name: true } } } },
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
        pick3: { include: { horse: { select: { horseId: true, name: true } } } },
      },
    });

    if (!prediction) throw httpError('Prediction not found', 404);
    if (prediction.spectatorId !== spectatorId) {
      throw httpError('Unauthorized', 403);
    }

    return prediction;
  }
}

module.exports = new PredictionsService();
