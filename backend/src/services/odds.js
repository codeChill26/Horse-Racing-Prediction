const prisma = require('../config/prisma');
const { emitToRace } = require('../socket/emitter');

const HOUSE_MARGIN = 0.05;
const MIN_ODDS = 1.2;
const MAX_ODDS = 20.0;
const MIN_STRENGTH = 0.05;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function computeStrength(winRatePct, avgPosition, totalStarts) {
  if (!totalStarts || totalStarts === 0) return 0;

  const winRateDecimal = winRatePct / 100;
  const positionScore = avgPosition > 0 ? 1 / avgPosition : 0;

  return winRateDecimal * 0.6 + positionScore * 0.4;
}

// effectiveStrength phải là xác suất thắng ĐÃ CHUẨN HÓA trong phạm vi 1 race (tổng các
// entry cùng race = 1) — xem calculateAllOddsForRace. Chia (không phải nhân) cho
// (1 + margin) để odds trả THẤP hơn mức công bằng, đúng bản chất lợi nhuận nhà cái
// (giống công thức AI ở ai/predict.py: suggested = fair / (1 + margin)).
function computeFinalOdds(effectiveStrength) {
  const safeStrength = Math.max(effectiveStrength, MIN_STRENGTH);
  const oddsRaw = 1.0 / safeStrength;
  const oddsWithMargin = oddsRaw / (1 + HOUSE_MARGIN);
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

// Tính "sức mạnh" thô (horseStrength/jockeyStrength/totalStrength) của 1 entry —
// CHƯA quy đổi ra odds. Việc quy đổi phải chờ có đủ sức mạnh của TẤT CẢ entry cùng
// race để chuẩn hóa (xem calculateAllOddsForRace) — nếu quy đổi ngay ở đây, mỗi
// entry được tính "cô lập" và tổng xác suất ngầm định cả race sẽ không đảm bảo
// bằng 100% + margin (bug đã phát hiện: mỗi ngựa lấy 1/strength riêng, không ai
// so sánh tương quan với các ngựa còn lại trong cùng race).
async function computeEntryStrength(entryId) {
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

  return {
    raceId: entry.raceId,
    entryId: entry.entryId,
    horseStrength: round2(horseStrength),
    jockeyStrength: jockeyStrength !== null ? round2(jockeyStrength) : null,
    totalStrength,
  };
}

// Odds "cô lập" của 1 entry, KHÔNG chuẩn hóa theo race — không dùng để lưu Odds
// chính thức (xem calculateAllOddsForRace), chỉ giữ lại để debug/xem thử 1 entry
// độc lập nếu cần (chưa có nơi nào trong app gọi hàm này ngoài đây).
async function calculateOddsForEntry(entryId) {
  const s = await computeEntryStrength(entryId);
  return {
    ...s,
    totalStrength: round2(s.totalStrength),
    oddsRaw: round2(1.0 / Math.max(s.totalStrength, MIN_STRENGTH)),
    oddsFinal: computeFinalOdds(s.totalStrength),
  };
}

async function calculateAllOddsForRace(raceId) {
  const entries = await prisma.raceEntry.findMany({
    where: { raceId, status: 'APPROVED' },
    select: { entryId: true },
  });

  if (entries.length === 0) return [];

  // 1) Tính sức mạnh thô của từng entry (chưa quy đổi odds).
  const strengths = [];
  for (const entry of entries) {
    strengths.push(await computeEntryStrength(entry.entryId));
  }

  // 2) Chuẩn hóa thành xác suất thắng TƯƠNG ĐỐI trong race này (tổng luôn = 1),
  // rồi mới quy đổi sang odds — đảm bảo tổng xác suất ngầm định (1/oddsFinal) của
  // cả race = 100% + margin (trừ trường hợp hiếm bị chặn bởi MIN_ODDS/MAX_ODDS).
  // Nếu chưa con nào có lịch sử (tổng = 0) -> chia đều, giống cách ai/predict.py xử lý.
  const totalStrengthSum = strengths.reduce((sum, s) => sum + s.totalStrength, 0);
  const n = strengths.length;

  const results = strengths.map((s) => {
    const normalizedStrength = totalStrengthSum > 0 ? s.totalStrength / totalStrengthSum : 1 / n;
    return {
      raceId: s.raceId,
      entryId: s.entryId,
      horseStrength: s.horseStrength,
      jockeyStrength: s.jockeyStrength,
      totalStrength: round2(s.totalStrength),
      oddsRaw: round2(1.0 / Math.max(normalizedStrength, MIN_STRENGTH)),
      oddsFinal: computeFinalOdds(normalizedStrength),
    };
  });

  // 3. Cập nhật vào DB sử dụng Transaction để đảm bảo tính nhất quán
  const updatedOddsData = await prisma.$transaction(async (tx) => {
    // Xóa dữ liệu cũ của trận đấu
    await tx.odds.deleteMany({ where: { raceId } });

    const created = [];
    for (const odds of results) {
      const entryOdds = await tx.odds.create({
        data: {
          raceId: odds.raceId,
          entryId: odds.entryId,
          horseStrength: odds.horseStrength,
          jockeyStrength: odds.jockeyStrength,
          totalStrength: odds.totalStrength,
          oddsRaw: odds.oddsRaw,
          oddsFinal: odds.oddsFinal,
        },
        include: {
          entry: {
            include: {
              horse: { select: { name: true } },
              jockey: { select: { fullName: true } }
            }
          }
        }
      });
      created.push(entryOdds);
    }
    return created;
  });

  emitToRace(raceId, 'odds:updated', { 
    raceId, 
    odds: updatedOddsData 
  });

  return results;
}

// Admin áp dụng CẢ BỘ gợi ý odds (vd từ AI) cho TOÀN BỘ entries của 1 race trong
// 1 TRANSACTION duy nhất — KHÔNG cho sửa từng entry riêng lẻ. Lý do: nếu chỉ đổi 1
// con mà không đụng các con còn lại, tổng xác suất ngầm định (1/oddsFinal) của cả
// race sẽ lệch khỏi 100% + margin ngay lập tức, phá vỡ tính nhất quán mà
// calculateAllOddsForRace() vừa đảm bảo (xem thảo luận: sửa 1 con phải sửa lại
// tương quan với 4 con còn lại, không thể tách rời).
async function applyOddsSuggestions(raceId, entries) {
  const race = await prisma.race.findUnique({
    where: { raceId },
    select: { raceId: true, status: true, registrationOpen: true },
  });
  if (!race) throw httpError('Race not found', 404);

  if (race.status !== 'SCHEDULED') {
    throw httpError('Chỉ có thể sửa odds khi race đang ở trạng thái SCHEDULED', 409);
  }
  if (race.registrationOpen) {
    throw httpError(
      'Race đang mở đăng ký, chưa có odds để sửa. Đóng cổng đăng ký trước.',
      409
    );
  }

  const approvedEntries = await prisma.raceEntry.findMany({
    where: { raceId },
    select: { entryId: true, status: true },
  });
  const approvedEntryIds = new Set(
    approvedEntries.filter((e) => e.status === 'APPROVED').map((e) => e.entryId)
  );
  const approvedCount = approvedEntryIds.size;

  if (!Array.isArray(entries) || entries.length !== approvedCount) {
    throw httpError(
      `Phải áp dụng odds cho đủ tất cả ${approvedCount} entry APPROVED của race (nhận được ${entries?.length ?? 0})`,
      400
    );
  }

  for (const e of entries) {
    if (!approvedEntryIds.has(e.entryId)) {
      throw httpError(`Entry ${e.entryId} không thuộc race này`, 404);
    }
    if (!Number.isFinite(e.oddsFinal) || e.oddsFinal < MIN_ODDS || e.oddsFinal > MAX_ODDS) {
      throw httpError(`Odds phải trong khoảng ${MIN_ODDS} - ${MAX_ODDS} (entry ${e.entryId})`, 400);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const e of entries) {
      const row = await tx.odds.upsert({
        where: { entryId: e.entryId },
        update: {
          oddsRaw: round2(e.oddsFinal),
          oddsFinal: round2(e.oddsFinal),
        },
        create: {
          raceId,
          entryId: e.entryId,
          horseStrength: 0,
          jockeyStrength: null,
          totalStrength: 0,
          oddsRaw: round2(e.oddsFinal),
          oddsFinal: round2(e.oddsFinal),
        },
        include: {
          entry: {
            include: {
              horse: { select: { horseId: true, name: true } },
              jockey: { select: { fullName: true } },
            },
          },
        },
      });
      results.push(row);
    }
    return results;
  });

  emitToRace(raceId, 'odds:updated', { raceId, odds: updated });

  return updated;
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
  applyOddsSuggestions,
};
