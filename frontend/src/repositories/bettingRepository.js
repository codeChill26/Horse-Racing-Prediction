import { getAccessToken } from '../utils/token'

async function readError(res, fallback) {
  let data = null
  try { data = await res.json() } catch { /* empty */ }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`)
}

function authHeaders() {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export const bettingRepository = {
  /** GET /api/races/open — danh sách race đang mở đặt cược */
  async getOpenRaces() {
    const res = await fetch('/api/races/open', { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được danh sách cuộc đua')
    const data = await res.json()
    return data?.races ?? []
  },

  /** GET /api/races/:id/detail — chi tiết race + entries + odds + career stats */
  async getRaceDetails(raceId) {
    const res = await fetch(`/api/races/${raceId}/detail`, { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được chi tiết cuộc đua')
    return res.json()
  },

  /** GET /api/predictions — lịch sử đặt cược của spectator */
  async getMyBets() {
    const res = await fetch('/api/predictions', { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được lịch sử đặt cược')
    const data = await res.json()
    return data?.predictions ?? []
  },

  /**
   * GET /api/predictions/my-stats — thống kê tổng quan của spectator.
   * Backend: predictions.js line 10 - router.get('/my-stats')
   * Trả về:
   *   {
   *     totalBets, totalSpent, totalWon, totalPayout, winRate, totalRaces,
   *     avgOdds, bestStreak, favoriteHorse, favoriteJockey,
   *     recentPerformance: [{ predictionId, raceName, result, profit, placedAt }]
   *   }
   */
  async getMyStats() {
    const res = await fetch('/api/predictions/my-stats', { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được thống kê đặt cược')
    const data = await res.json()
    return data?.stats ?? data
  },

  /** GET /api/predictions/:id — chi tiết một vé cược */
  async getBetDetails(predictionId) {
    const res = await fetch(`/api/predictions/${predictionId}`, { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được chi tiết đặt cược')
    const data = await res.json()
    return data?.prediction ?? data
  },

  /** POST /api/predictions — đặt cược */
  async placeBet({ raceId, betType, entryIds, betAmount }) {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ raceId, betType, entryIds, betAmount }),
    })
    if (!res.ok) await readError(res, 'Đặt cược thất bại')
    const data = await res.json()
    return data?.prediction ?? data
  },

  /** PUT /api/predictions/:id/cancel — hủy vé cược PENDING */
  async cancelBet(predictionId) {
    const res = await fetch(`/api/predictions/${predictionId}/cancel`, {
      method: 'PUT',
      headers: authHeaders(),
    })
    if (!res.ok) await readError(res, 'Hủy đặt cược thất bại')
    const data = await res.json()
    return data?.prediction ?? data
  },

  /**
   * POST /api/races/:raceId/ai-prediction — trả điểm xem gợi ý % thắng AI cho race.
   * Trừ điểm MỖI LẦN gọi (không cache) — trả về { predictions: [{horseId, horseName,
   * rank, winProbability}], pointsCharged, walletBalance }.
   */
  async viewAiPrediction(raceId) {
    const res = await fetch(`/api/races/${raceId}/ai-prediction`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) await readError(res, 'Không xem được gợi ý AI')
    return res.json()
  },
}
