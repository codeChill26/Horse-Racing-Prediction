// backend/src/services/ratingUpdate.js
//
// Cập nhật OR/RPR của ngựa SAU khi đua có kết quả — RULE-BASED (KHÔNG dùng ML).
// Rating thật ngoài đời do handicapper chấm bằng công thức theo thành tích, nên ở đây
// ta dùng luật đơn giản theo VỊ TRÍ VỀ ĐÍCH. Gọi khi kết quả thành chính thức:
//   - referee.js  : nhánh AUTO_MATCHED (2 trọng tài khớp)
//   - adminReferee: resolveResultConflict -> RESOLVED (admin chốt)
//
// Delta theo vị trí (n = số ngựa hoàn thành):
//   nhất  -> +3
//   nhì   -> +1
//   nửa trên còn lại -> 0 (giữ nguyên)
//   nửa dưới -> -2
//   DNF/DQ  -> -3 (coi như thành tích kém nhất)
// OR/RPR được kẹp trong [40, 180] cho hợp lý. RPR áp cùng delta với OR (đơn giản hóa).

const prisma = require('../config/prisma');

const RATING_MIN = 40;
const RATING_MAX = 180;

function positionDelta(rank, totalFinishers, isDnf, isDq) {
  if (isDnf || isDq) return -3;
  if (rank === 1) return 3;
  if (rank === 2) return 1;
  return rank <= totalFinishers / 2 ? 0 : -2;
}

function clamp(v) {
  return Math.max(RATING_MIN, Math.min(RATING_MAX, v));
}

/**
 * Áp luật cập nhật OR/RPR cho toàn bộ ngựa trong một race đã có finalResults.
 * @param {number} raceId
 * @param {object} tx - prisma transaction client (nên gọi trong cùng transaction ghi
 *                      finalResults để chạy đúng 1 lần, tránh cộng dồn nhiều lần).
 * @returns {{updated:number}}
 */
async function applyPositionRatingUpdates(raceId, tx = prisma) {
  const rid = parseInt(raceId);
  const official = await tx.officialRaceResult.findUnique({
    where: { raceId: rid },
    select: { finalResults: true },
  });

  const rows = Array.isArray(official?.finalResults) ? official.finalResults : [];
  if (rows.length === 0) return { updated: 0 };

  // entryId -> ngựa (kèm rating hiện tại) để cộng delta.
  const entryIds = rows.map((r) => r.entryId).filter((x) => Number.isInteger(x));
  const entries = await tx.raceEntry.findMany({
    where: { entryId: { in: entryIds } },
    select: {
      entryId: true,
      horseId: true,
      horse: { select: { officialRating: true, racingPostRating: true } },
    },
  });
  const byEntry = new Map(entries.map((e) => [e.entryId, e]));

  // Số ngựa thực sự hoàn thành (loại DNF/DQ) để tính mốc "nửa trên / nửa dưới".
  const finishers = rows.filter((r) => !r.isDnf && !r.isDq).length || rows.length;

  let updated = 0;
  for (const r of rows) {
    const e = byEntry.get(r.entryId);
    if (!e) continue;

    const delta = positionDelta(r.rank, finishers, r.isDnf, r.isDq);
    if (delta === 0) continue; // không đổi -> khỏi ghi DB

    const { officialRating, racingPostRating } = e.horse;
    await tx.horse.update({
      where: { horseId: e.horseId },
      data: {
        ...(officialRating != null ? { officialRating: clamp(officialRating + delta) } : {}),
        ...(racingPostRating != null ? { racingPostRating: clamp(racingPostRating + delta) } : {}),
      },
    });
    updated += 1;
  }

  return { updated };
}

module.exports = { applyPositionRatingUpdates, positionDelta };
