// backend/src/services/aiPrediction.js
//
// Cầu nối giữa backend Node và AI service (FastAPI, ai/service/main.py).
// Vai trò: CHỈ ĐỀ XUẤT. Gọi POST /predict-odds để lấy xác suất thắng + odds gợi ý
// cho các ngựa ĐÃ DUYỆT của một cuộc đua, KHÔNG ghi đè bảng Odds (odds.js vẫn là
// nguồn odds chính thức). Admin xem gợi ý này rồi tự quyết.

const prisma = require('../config/prisma');

// URL của AI service. Đổi trong .env nếu chạy chỗ khác (vd Docker: http://ai:8000).
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
// Thời gian chờ tối đa khi gọi AI (ms). Để rộng vì lần gọi ĐẦU TIÊN sau khi bật
// service phải nạp model.pkl (cold start) có thể mất >8s; các lần sau <1s.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Tuổi ngựa = năm diễn ra đua - năm sinh. Ưu tiên birthYear, rồi tới dateOfBirth.
// Thiếu cả hai -> null để model tự impute.
function computeAge(horse, race) {
  const refYear = race?.scheduledAt
    ? new Date(race.scheduledAt).getFullYear()
    : new Date().getFullYear();

  if (horse.birthYear) return refYear - horse.birthYear;
  if (horse.dateOfBirth) return refYear - new Date(horse.dateOfBirth).getFullYear();
  return null;
}

// Gọi AI service, bọc lỗi mạng/timeout thành httpError rõ ràng cho Admin.
async function callPredictOdds(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${AI_SERVICE_URL}/predict-odds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    // ECONNREFUSED (service chưa bật) hoặc AbortError (quá hạn).
    const reason = err.name === 'AbortError' ? 'quá thời gian chờ' : 'không kết nối được';
    throw httpError(
      `AI service ${reason} tại ${AI_SERVICE_URL}. Hãy chắc chắn service đang chạy ` +
        `(uvicorn ai.service.main:app --port 8000).`,
      502
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw httpError(`AI service trả lỗi HTTP ${res.status}: ${text.slice(0, 200)}`, 502);
  }

  return res.json();
}

// Fetch race + entries APPROVED, gọi AI service, khớp ngược prediction -> entry.
// Dùng chung cho cả bản đầy đủ (Admin, có fairOdds/suggestedOdds) và bản rút gọn
// (Spectator, chỉ winProbability) — tránh lặp code gọi AI 2 nơi.
async function fetchAiPredictions(raceId, { margin } = {}) {
  const race = await prisma.race.findUnique({
    where: { raceId },
    select: { raceId: true, name: true, scheduledAt: true },
  });
  if (!race) throw httpError('Race not found', 404);

  const entries = await prisma.raceEntry.findMany({
    where: { raceId, status: 'APPROVED' },
    select: {
      entryId: true,
      weightLb: true,
      saddleNumber: true,
      horse: {
        select: {
          horseId: true,
          name: true,
          birthYear: true,
          dateOfBirth: true,
          officialRating: true,
          racingPostRating: true,
        },
      },
      jockey: { select: { userId: true, fullName: true } },
    },
  });

  if (entries.length === 0) {
    throw httpError('Race has no APPROVED entries to predict.', 409);
  }

  // Map dữ liệu DB -> đúng "hình dạng" mà ai/service mong đợi (HorseIn).
  const horses = entries.map((e) => ({
    horseName: e.horse.name,
    OR: e.horse.officialRating,
    RPR: e.horse.racingPostRating,
    age: computeAge(e.horse, race),
    weightLb: e.weightLb,
    saddle: e.saddleNumber,
    jockeyName: e.jockey?.fullName ?? null,
    // App không có khái niệm "Trainer" -> AI service tự dùng winrate trung bình.
  }));

  const payload = { horses };
  if (margin !== undefined) payload.margin = margin;

  const { predictions } = await callPredictOdds(payload);

  // Pydantic ở AI service loại bỏ field lạ, nên entryId không đi kèm response.
  // Ta khớp ngược prediction -> entry theo tên ngựa (trong 1 đua tên không trùng).
  const byName = new Map(entries.map((e) => [e.horse.name, e]));

  return { race, entries, predictions: predictions || [], byName };
}

class AiPredictionService {
  // Lấy gợi ý odds từ AI cho toàn bộ ngựa ĐÃ DUYỆT của một cuộc đua — bản ĐẦY ĐỦ
  // cho Admin (kèm fairOdds/suggestedOdds để tham khảo set odds thật).
  async getRaceOddsSuggestion(raceId, { margin } = {}) {
    const { race, predictions, byName } = await fetchAiPredictions(raceId, { margin });

    const suggestions = predictions.map((p) => {
      const entry = byName.get(p.horseName);
      return {
        entryId: entry?.entryId ?? null,
        horseId: entry?.horse.horseId ?? null,
        horseName: p.horseName,
        jockeyName: entry?.jockey?.fullName ?? null,
        rank: p.rank,
        winProbability: p.win_probability, // %
        fairOdds: p.fair_odds,
        suggestedOdds: p.suggested_odds,
      };
    });

    return {
      raceId: race.raceId,
      raceName: race.name,
      source: 'AI_PREDICTION_ENGINE',
      note: 'Đây là gợi ý từ AI (chỉ tham khảo), chưa ghi vào bảng Odds chính thức.',
      suggestions,
    };
  }

  // Bản RÚT GỌN cho Spectator (tính năng trả điểm) — CHỈ trả winProbability, không
  // lộ fairOdds/suggestedOdds (đó là công cụ định giá nội bộ của Admin, không phải
  // thứ Spectator trả điểm để xem).
  async getSpectatorWinPrediction(raceId) {
    const { race, predictions, byName } = await fetchAiPredictions(raceId, {});

    const predictionsOut = predictions
      .map((p) => {
        const entry = byName.get(p.horseName);
        return {
          horseId: entry?.horse.horseId ?? null,
          horseName: p.horseName,
          rank: p.rank,
          winProbability: p.win_probability,
        };
      })
      .sort((a, b) => a.rank - b.rank);

    return {
      raceId: race.raceId,
      raceName: race.name,
      source: 'AI_PREDICTION_ENGINE',
      note: 'Gợi ý tham khảo từ AI, không đảm bảo kết quả thực tế.',
      predictions: predictionsOut,
    };
  }
}

module.exports = new AiPredictionService();
