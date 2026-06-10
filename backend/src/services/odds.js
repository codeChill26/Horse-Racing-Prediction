const prisma = require('../config/prisma');

const HOUSE_MARGIN = 0.05;
const MIN_ODDS = 1.2;
const MAX_ODDS = 20.0;
const MIN_STRENGTH = 0.05;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function computeStrength(winRatePct, avgPosition, totalStarts) {
  if (!totalStarts || totalStarts === 0) return 0;

  const winRateDecimal = winRatePct / 100;
  const positionScore = avgPosition > 0 ? 1 / avgPosition : 0;

  return winRateDecimal * 0.6 + positionScore * 0.4;
}

function computeFinalOdds(totalStrength) {
  const effectiveStrength = Math.max(totalStrength, MIN_STRENGTH);
  const oddsRaw = 1.0 / effectiveStrength;
  const oddsWithMargin = oddsRaw * (1 + HOUSE_MARGIN);
  const oddsFinal = Math.min(MAX_ODDS, Math.max(MIN_ODDS, oddsWithMargin));
  return round2(oddsFinal);
}

async function getHorseCareerStats(horseId) {
  const results = await prisma.raceResult.findMany({
    where: { horseId },
    select: { finishPosition: true },
  });

  const totalStarts = results.length;
  if (totalStarts === 0) return { totalStarts: 0, winRate: 0, avgPosition: 0 };

  const wins = results.filter((r) => r.finishPosition === 1).length;
  const finishSum = results.reduce((s, r) => s + r.finishPosition, 0);

  return {
    totalStarts,
    winRate: round2((wins / totalStarts) * 100),
    avgPosition: round2(finishSum / totalStarts),
  };
}

async function getJockeyCareerStats(jockeyId) {
  const entries = await prisma.raceEntry.findMany({
    where: { jockeyId, status: 'APPROVED' },
    select: { raceId: true, horseId: true },
  });

  if (entries.length === 0) return { totalStarts: 0, winRate: 0, avgPosition: 0 };

  const raceHorsePairs = entries.map((e) => ({ raceId: e.raceId, horseId: e.horseId }));

  const results = await prisma.raceResult.findMany({
    where: {
      OR: raceHorsePairs.map((p) => ({
        raceId: p.raceId,
        horseId: p.horseId,
      })),
    },
    select: { finishPosition: true },
  });

  const totalStarts = results.length;
  if (totalStarts === 0) return { totalStarts: 0, winRate: 0, avgPosition: 0 };

  const wins = results.filter((r) => r.finishPosition === 1).length;
  const finishSum = results.reduce((s, r) => s + r.finishPosition, 0);

  return {
    totalStarts,
    winRate: round2((wins / totalStarts) * 100),
    avgPosition: round2(finishSum / totalStarts),
  };
}

async function calculateOddsForEntry(entryId) {
  const entry = await prisma.raceEntry.findUnique({
    where: { entryId },
    select: { entryId: true, raceId: true, jockeyId: true, horseId: true },
  });

  if (!entry) throw new Error(`RaceEntry ${entryId} not found`);

  const horseStats = await getHorseCareerStats(entry.horseId);
  const horseStrength = computeStrength(horseStats.winRate, horseStats.avgPosition, horseStats.totalStarts);

  let jockeyStrength = null;
  if (entry.jockeyId) {
    const jockeyStats = await getJockeyCareerStats(entry.jockeyId);
    jockeyStrength = computeStrength(jockeyStats.winRate, jockeyStats.avgPosition, jockeyStats.totalStarts);
  }

  const totalStrength = jockeyStrength !== null
    ? horseStrength * 0.7 + jockeyStrength * 0.3
    : horseStrength;

  const oddsFinal = computeFinalOdds(totalStrength);

  return {
    raceId: entry.raceId,
    entryId: entry.entryId,
    horseStrength: round2(horseStrength),
    jockeyStrength: jockeyStrength !== null ? round2(jockeyStrength) : null,
    totalStrength: round2(totalStrength),
    oddsRaw: round2(1.0 / Math.max(totalStrength, MIN_STRENGTH)),
    oddsFinal,
  };
}

async function calculateAllOddsForRace(raceId) {
  const entries = await prisma.raceEntry.findMany({
    where: { raceId, status: 'APPROVED' },
    select: { entryId: true },
  });

  if (entries.length === 0) return [];

  const results = [];
  for (const entry of entries) {
    const odds = await calculateOddsForEntry(entry.entryId);
    results.push(odds);
  }

  await prisma.$transaction(async (tx) => {
    await tx.odds.deleteMany({ where: { raceId } });

    for (const odds of results) {
      await tx.odds.create({
        data: {
          raceId: odds.raceId,
          entryId: odds.entryId,
          horseStrength: odds.horseStrength,
          jockeyStrength: odds.jockeyStrength,
          totalStrength: odds.totalStrength,
          oddsRaw: odds.oddsRaw,
          oddsFinal: odds.oddsFinal,
        },
      });
    }
  });

  return results;
}

async function getRaceOdds(raceId) {
  const odds = await prisma.odds.findMany({
    where: { raceId },
    include: {
      entry: {
        include: {
          horse: { select: { horseId: true, name: true } },
          jockey: { select: { userId: true, fullName: true } },
        },
      },
    },
    orderBy: { oddsFinal: 'asc' },
  });

  return odds;
}

module.exports = {
  calculateOddsForEntry,
  calculateAllOddsForRace,
  getRaceOdds,
};
