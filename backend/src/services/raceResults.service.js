// backend/src/services/raceResults.service.js

const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Lấy kết quả chi tiết 1 race cho Spectator.
 * Chỉ trả kết quả khi race đã FINISHED và đã published.
 * Kết quả được ghép từ OfficialRaceResult.finalResults (rank) + RaceResult (finishPosition)
 * + RaceEntry (horse/jockey/gate/odds).
 */
async function getRaceResults(raceId) {
  const race = await prisma.race.findUnique({
    where: { raceId: parseInt(raceId) },
    include: {
      tournament: { select: { tournamentId: true, name: true } },
      entries: {
        include: {
          horse: { select: { horseId: true, name: true } },
          jockey: { select: { userId: true, fullName: true } },
        },
      },
    },
  });

  if (!race) throw httpError('Trận đấu không tồn tại.', 404);

  // Chỉ trả kết quả khi race đã kết thúc và có official result
  const isFinished = race.status === 'FINISHED' || race.status === 'PENDING_RESULT';
  const officialResult = await prisma.officialRaceResult.findUnique({
    where: { raceId: parseInt(raceId) },
  });

  // Map entryId -> entry info
  const entryMap = {};
  for (const entry of race.entries) {
    entryMap[entry.entryId] = {
      entryId: entry.entryId,
      horseId: entry.horseId,
      horseName: entry.horse.name,
      jockeyId: entry.jockeyId || null,
      jockeyName: entry.jockey?.fullName || null,
      gate: entry.gateNumber || null,
      saddleNo: entry.saddleNo || null,
    };
  }

  // Nếu race đã FINISHED: lấy finishPosition từ RaceResult
  // Nếu chưa FINISHED nhưng có OfficialRaceResult (PENDING_RESULT): lấy rank từ finalResults
  const results = [];

  if (race.status === 'FINISHED') {
    const flatResults = await prisma.raceResult.findMany({
      where: { raceId: parseInt(raceId) },
    });
    const flatMap = {};
    for (const r of flatResults) {
      flatMap[r.horseId] = r.finishPosition;
    }

    for (const entry of race.entries) {
      const position = flatMap[entry.horseId] || null;
      results.push({
        ...entryMap[entry.entryId],
        rank: position,
        status: position ? 'FINISHED' : null,
      });
    }
  } else if (officialResult && officialResult.finalResults) {
    // Race chưa finish nhưng đã có official result (PENDING_RESULT)
    // Hiện kết quả nhưng đánh dấu là chưa chính thức
    const finalResults = Array.isArray(officialResult.finalResults)
      ? officialResult.finalResults
      : [];

    for (const entry of race.entries) {
      const found = finalResults.find(r => r.entryId === entry.entryId);
      results.push({
        ...entryMap[entry.entryId],
        rank: found ? (found.rank || found.finishPosition || null) : null,
        status: found ? 'OFFICIAL' : null,
      });
    }
  } else {
    // Race chưa có kết quả — trả danh sách entries không có rank
    for (const entry of race.entries) {
      results.push({
        ...entryMap[entry.entryId],
        rank: null,
        status: null,
      });
    }
  }

  // Sort: có rank thì xếp theo rank, không thì giữ thứ tự gate/saddleNo
  results.sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return 0;
  });

  return {
    raceId: race.raceId,
    raceName: race.name,
    tournamentId: race.tournament?.tournamentId,
    tournamentName: race.tournament?.name,
    status: race.status,
    publishedAt: race.publishedAt,
    matchStatus: officialResult?.matchStatus || null,
    results,
  };
}

/**
 * Lấy danh sách races đã kết thúc (FINISHED) của 1 tournament.
 * Dùng cho spectator xem lịch sử tournament.
 */
async function getTournamentRaceResults(tournamentId) {
  const races = await prisma.race.findMany({
    where: {
      tournamentId: parseInt(tournamentId),
      status: 'FINISHED',
    },
    include: {
      tournament: { select: { tournamentId: true, name: true } },
      entries: {
        include: {
          horse: { select: { horseId: true, name: true } },
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  const raceResults = [];

  for (const race of races) {
    const flatResults = await prisma.raceResult.findMany({
      where: { raceId: race.raceId },
    });
    const flatMap = {};
    for (const r of flatResults) {
      flatMap[r.horseId] = r.finishPosition;
    }

    const top3 = race.entries
      .map(e => ({
        entryId: e.entryId,
        horseId: e.horseId,
        horseName: e.horse.name,
        gate: e.gateNumber || null,
        finishPosition: flatMap[e.horseId] || null,
      }))
      .filter(e => e.finishPosition != null)
      .sort((a, b) => a.finishPosition - b.finishPosition)
      .slice(0, 3);

    raceResults.push({
      raceId: race.raceId,
      raceName: race.name,
      raceTime: race.raceTime,
      status: race.status,
      publishedAt: race.publishedAt,
      top3,
    });
  }

  return raceResults;
}

module.exports = {
  getRaceResults,
  getTournamentRaceResults,
};
