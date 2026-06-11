/**
 * Betting Repository - Giao tiếp API đặt cược
 */

import { getAccessToken } from '../utils/token'

async function readError(res, fallback) {
  let data = null
  try {
    data = await res.json()
  } catch { /* empty */ }
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
  /** Lấy tất cả các race để đặt cược */
  async getRaces() {
    const res = await fetch('/api/races', { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được danh sách cuộc đua')
    const data = await res.json()
    return data?.races ?? []
  },

  /** Lấy chi tiết một race + danh sách ngựa tham gia */
  async getRaceDetails(raceId) {
    const res = await fetch(`/api/races/${raceId}`, { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được chi tiết cuộc đua')
    const data = await res.json()
    return data?.race ?? data
  },

  /** Lấy lịch sử đặt cược của spectator */
  async getMyBets() {
    const res = await fetch('/api/bets/my', { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được lịch sử đặt cược')
    const data = await res.json()
    return data?.bets ?? []
  },

  /** Đặt cược cho một ngựa */
  async placeBet({ raceId, horseId, amount }) {
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ raceId, horseId, amount }),
    })
    if (!res.ok) await readError(res, 'Đặt cược thất bại')
    const data = await res.json()
    return data?.bet ?? data
  },

  /** Hủy đặt cược (nếu race chưa bắt đầu) */
  async cancelBet(betId) {
    const res = await fetch(`/api/bets/${betId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) await readError(res, 'Hủy đặt cược thất bại')
    return true
  },

  /** Lấy chi tiết một bet */
  async getBetDetails(betId) {
    const res = await fetch(`/api/bets/${betId}`, { headers: authHeaders() })
    if (!res.ok) await readError(res, 'Không tải được chi tiết đặt cược')
    const data = await res.json()
    return data?.bet ?? data
  },
}
