import { bettingRepository } from '../repositories/bettingRepository'
import { getAccessToken } from '../utils/token'

const MIN_BET_AMOUNT = 10

export const bettingService = {
  /** Lấy danh sách race đang mở đặt cược */
  async getOpenRaces() {
    return bettingRepository.getOpenRaces()
  },

  /** Lấy chi tiết race với entries, odds real-time và career stats */
  async getRaceBettingInfo(raceId) {
    return bettingRepository.getRaceDetails(raceId)
  },

  /** Lấy lịch sử đặt cược của user */
  async getMyBets() {
    return bettingRepository.getMyBets()
  },

  /** Lấy thống kê tổng quan (win rate, tổng thắng/thua, ngựa/kỵ sĩ yêu thích, ...) */
  async getMyStats() {
    return bettingRepository.getMyStats()
  },

  /** Lấy chi tiết một vé cược */
  async getBetDetails(predictionId) {
    return bettingRepository.getBetDetails(predictionId)
  },

  /**
   * Đặt cược — validate client-side trước khi gửi API.
   * @param {object} params
   * @param {number}   params.raceId
   * @param {string}   params.betType  — WIN | PLACE | SHOW | QUINELLA | EXACTA
   * @param {number[]} params.entryIds — [entryId] (WIN/PLACE/SHOW) hoặc [e1, e2] (QUINELLA/EXACTA)
   * @param {number}   params.betAmount
   * @param {number}   params.walletBalance — số dư hiện tại (để validate client-side)
   */
  async placeBet({ raceId, betType, entryIds, betAmount, walletBalance = 0 }) {
    if (!getAccessToken()) {
      throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
    }
    if (!betAmount || betAmount < MIN_BET_AMOUNT) {
      throw new Error(`Số điểm đặt cược tối thiểu là ${MIN_BET_AMOUNT} điểm.`)
    }
    const maxAllowed = Math.floor(walletBalance * 0.5)
    if (betAmount > maxAllowed) {
      throw new Error(`Số điểm đặt cược không được vượt quá 50% số dư (tối đa ${maxAllowed} điểm).`)
    }

    return bettingRepository.placeBet({ raceId, betType, entryIds, betAmount })
  },

  /** Hủy đặt cược (race phải còn SCHEDULED, vé phải PENDING) */
  async cancelBet(predictionId) {
    return bettingRepository.cancelBet(predictionId)
  },

  /** Xem gợi ý % thắng từ AI cho 1 race — tốn điểm mỗi lần gọi (không cache). */
  async viewAiPrediction(raceId) {
    if (!raceId) throw new Error('Thiếu ID chặng đua')
    return bettingRepository.viewAiPrediction(raceId)
  },
}
