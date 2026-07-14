// backend/src/services/aiRisk.js
//
// Cầu nối giữa backend Node và AI service (FastAPI, ai/service/main.py) — Agent 2.
// Vai trò: CHỈ ĐỀ XUẤT. Gọi POST /risk-score để lấy risk score + odds đề xuất
// dựa trên các cược ĐANG MỞ (PENDING) của một cuộc đua. KHÔNG ghi đè bảng Odds
// (odds.js vẫn là nguồn odds chính thức). Admin xem gợi ý này rồi tự quyết.

const prisma = require('../config/prisma');

// URL của AI service. Đổi trong .env nếu chạy chỗ khác (vd Docker: http://ai:8000).
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
// Thời gian chờ tối đa khi gọi AI (ms). Để rộng vì lần gọi ĐẦU TIÊN sau khi bật
// service phải nạp model (cold start); các lần sau nhanh hơn nhiều.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Gọi AI service, bọc lỗi mạng/timeout thành httpError rõ ràng cho Admin.
async function callRiskScore(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${AI_SERVICE_URL}/risk-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
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

// Gom betAmount + số người cược riêng biệt theo từng entry, tính trên các
// Prediction còn PENDING (đã đặt, chưa chốt kết quả). Một vé QUINELLA/EXACTA
// chọn 2 entry (entryId1 + entryId2) -> cộng dồn stake vào cả 2 cửa, vì nhà cái
// phải trả vé đó nếu MỘT TRONG HAI cửa liên quan về đúng như đã chọn.
async function getOpenExposureByEntry(raceId) {
  const predictions = await prisma.prediction.findMany({
    where: { raceId, status: 'PENDING' },
    select: { entryId1: true, entryId2: true, betAmount: true, spectatorId: true },
  });

  const exposure = new Map(); // entryId -> { totalBet, bettors: Set<spectatorId> }

  const addStake = (entryId, amount, spectatorId) => {
    if (!entryId) return;
    if (!exposure.has(entryId)) exposure.set(entryId, { totalBet: 0, bettors: new Set() });
    const bucket = exposure.get(entryId);
    bucket.totalBet += amount;
    bucket.bettors.add(spectatorId);
  };

  for (const p of predictions) {
    addStake(p.entryId1, p.betAmount, p.spectatorId);
    addStake(p.entryId2, p.betAmount, p.spectatorId);
  }

  return exposure;
}

class AiRiskService {
  // Lấy đánh giá rủi ro từ AI cho các cửa cược đã có Odds của một cuộc đua.
  async getRaceRiskAssessment(raceId, { treasury }) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, name: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const odds = await prisma.odds.findMany({
      where: { raceId },
      include: {
        entry: { include: { horse: { select: { horseId: true, name: true } } } },
      },
    });

    if (odds.length === 0) {
      throw httpError(
        'Race has no computed odds yet. Odds are calculated automatically once the registration gate is closed.',
        409
      );
    }

    const exposure = await getOpenExposureByEntry(raceId);

    // Map dữ liệu DB -> đúng "hình dạng" mà ai/service mong đợi (RiskHorseIn).
    const horses = odds.map((o) => {
      const bucket = exposure.get(o.entryId);
      return {
        horseName: o.entry.horse.name,
        current_odds: Number(o.oddsFinal),
        total_bet: bucket ? bucket.totalBet : 0,
        num_bettors: bucket ? bucket.bettors.size : 0,
      };
    });

    const result = await callRiskScore({ treasury, horses });

    // Pydantic response chỉ trả horseName, khớp ngược -> entry như aiPrediction.js.
    const byName = new Map(odds.map((o) => [o.entry.horse.name, o]));
    const horseDetails = (result.horses || []).map((h) => {
      const o = byName.get(h.horseName);
      const bucket = o ? exposure.get(o.entryId) : undefined;
      return {
        entryId: o?.entryId ?? null,
        horseId: o?.entry.horse.horseId ?? null,
        horseName: h.horseName,
        currentOdds: h.current_odds,
        totalBet: h.total_bet,
        numBettors: bucket ? bucket.bettors.size : 0,
        poolShare: h.pool_share,
        liabilityIfWin: h.liability_if_win,
        suggestedOdds: h.suggested_odds,
        reason: h.reason,
      };
    });

    return {
      raceId: race.raceId,
      raceName: race.name,
      source: 'AI_RISK_ENGINE',
      note: 'Đây là gợi ý từ AI (chỉ tham khảo), chưa ghi vào bảng Odds chính thức.',
      riskScore: result.risk_score,
      riskLevel: result.risk_level,
      totalPool: result.total_pool,
      worstCaseLiability: result.worst_case_liability,
      treasury: result.treasury,
      horses: horseDetails,
    };
  }
}

module.exports = new AiRiskService();
