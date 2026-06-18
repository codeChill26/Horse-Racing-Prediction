/**
 * Betting Service - Logic nghiệp vụ đặt cược cho Spectator
 */

import { bettingRepository } from '../repositories/bettingRepository'
import { getMyProfile } from '../api/auth'
import { getAccessToken } from '../utils/token'

// Số điểm tối thiểu khi đặt cược
const MIN_BET_AMOUNT = 10
// Số điểm tối đa khi đặt cược
const MAX_BET_AMOUNT = 10000

export const bettingService = {
  /**
   * Lấy danh sách race đang mở đặt cược
   */
  async getOpenRaces() {
    const races = await bettingRepository.getRaces()
    // Chỉ lấy race ở trạng thái cho phép đặt cược
    return races.filter(r =>
      r.status === 'Scheduled' ||
      r.status === 'Registrations Open' ||
      r.status === 'Upcoming' ||
      r.bettingOpen === true
    )
  },

  /**
   * Lấy chi tiết race với danh sách ngựa và odds
   */
  async getRaceBettingInfo(raceId) {
    return await bettingRepository.getRaceDetails(raceId)
  },

  /**
   * Lấy lịch sử đặt cược của user
   */
  async getMyBets() {
    return await bettingRepository.getMyBets()
  },

  /**
   * Đặt cược - validate đầy đủ trước khi gửi API
   */
  async placeBet({ raceId, horseId, amount }) {
    const token = getAccessToken()
    if (!token) throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')

    // Validate số tiền
    if (!amount || amount < MIN_BET_AMOUNT) {
      throw new Error(`Số điểm đặt cược tối thiểu là ${MIN_BET_AMOUNT} điểm.`)
    }
    if (amount > MAX_BET_AMOUNT) {
      throw new Error(`Số điểm đặt cược tối đa là ${MAX_BET_AMOUNT} điểm.`)
    }

    // Kiểm tra số dư ví
    const profile = await getMyProfile(token)
    const balance = profile?.pointWallet?.balance ?? 0
    if (balance < amount) {
      throw new Error(`Số dư không đủ. Bạn chỉ có ${balance.toLocaleString('vi-VN')} điểm.`)
    }

    return await bettingRepository.placeBet({ raceId, horseId, amount })
  },

  /**
   * Hủy đặt cược
   */
  async cancelBet(betId) {
    return await bettingRepository.cancelBet(betId)
  },

  /**
   * Lấy chi tiết một bet
   */
  async getBetDetails(betId) {
    return await bettingRepository.getBetDetails(betId)
  },
}
