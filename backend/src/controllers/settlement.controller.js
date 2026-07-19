// backend/src/controllers/settlement.controller.js

const settlementService = require('../services/settlement');
const { SettlementResultDto } = require('../dto/settlement.dto');
const socketEmitter = require('../socket/emitter');

class SettlementController {
  async getSettlementSummary(req, res) {
    const raceId = Number(req.params.id);
    if (!Number.isInteger(raceId) || raceId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid raceId' });
    }
    try {
      const summary = await settlementService.getSettlementSummary(raceId);
      return res.status(200).json({ settlement: summary });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/admin/settlement/:raceId/preview-publish
   * Trả về breakdown per-spectator (won/lost/payout) DỰ KIẾN
   * trước khi admin xác nhận publish.
   * Idempotent — chỉ đọc, không ghi.
   */
  async previewPublish(req, res) {
    const raceId = Number(req.params.raceId);
    if (!Number.isInteger(raceId) || raceId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid raceId' });
    }
    try {
      const preview = await settlementService.previewPublish(raceId);
      return res.status(200).json({ success: true, preview });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({ success: false, message: error.message });
    }
  }

  async publishResult(req, res) {
    const raceId = parseInt(req.params.raceId);

    if (isNaN(raceId)) {
      return res.status(400).json({ success: false, message: 'Tham số định danh trận đua (raceId) không đúng định dạng.' });
    }

    try {
      // 1. Thực thi bộ máy quyết toán dòng tiền tài chính trong DB
      const report = await settlementService.settleAndPublishRace(raceId);
      
      // 2. Đóng gói dữ liệu qua lớp DTO đầu ra
      const outputData = new SettlementResultDto(report);

      // 3. PHÁT THÔNG BÁO REAL-TIME QUA SOCKET.IO
      try {
        // Gửi thông báo cho TẤT CẢ spectator đã đặt cược (thắng + thua)
        // Mô hình NET: addedAmount = chỉ phần LÃI (gross − stake).
        //                grossPayout = tổng gross (admin thấy ở Prediction.payout).
        Object.entries(report.spectatorBetDetails).forEach(([spectatorId, details]) => {
          const isWinner = details.won;

          if (isWinner) {
            // Người thắng: ví cộng NET (chỉ lãi). Tránh cộng stake 2 lần.
            const netProfit = details.totalNetProfit ?? Math.max(0, (details.totalPayout || 0) - (details.totalBetAmount || 0));
            const grossPayout = details.totalPayout || 0;
            const messageData = {
              type: 'BET_WON',
              raceId: raceId,
              addedAmount: netProfit,        // ví cộng (NET)
              grossPayout: grossPayout,      // tổng gross (cho FE hiển thị breakdown)
              payoutModel: 'NET',
              betAmount: details.totalBetAmount,
              message: `Trận #${raceId}: Đặt ${details.totalBetAmount} điểm × odd → nhận lãi +${netProfit} điểm (gồm ${grossPayout} gross − ${details.totalBetAmount} stake).`
            };
            socketEmitter.emitToUser(parseInt(spectatorId), 'WALLET_UPDATED', messageData);
          } else {
            // Người thua: không nhận gì, nhưng vẫn thông báo để họ biết
            const messageData = {
              type: 'BET_LOST',
              raceId: raceId,
              betAmount: details.totalBetAmount,
              message: `Trận #${raceId}: Đặt ${details.totalBetAmount} điểm → không trúng.`
            };
            socketEmitter.emitToUser(parseInt(spectatorId), 'WALLET_UPDATED', messageData);
          }
        });

        // Phát thông báo đổi trạng thái trận đấu cho toàn sàn UI
        socketEmitter.emitToAll('RACE_FINISHED', {
          raceId: raceId,
          message: `Trận đua #${raceId} đã hoàn tất công bố kết quả.`
        });
      } catch (socketErr) {
        console.warn('[SOCKET WARNING] Không thể phát tín hiệu real-time, nhưng dữ liệu DB đã lưu an toàn:', socketErr.message);
      }

      // 4. Trả về phản hồi HTTP thành công cho Client/Swagger
      return res.status(200).json({
        success: true,
        message: 'Công bố kết quả trận đấu và quyết toán tiền thưởng thành công trọn vẹn.',
        data: outputData
      });

    } catch (error) {
      console.error(`[CRITICAL SETTLEMENT ERROR] Trận đấu ${raceId} thất bại:`, error.message);
      return res.status(400).json({
        success: false,
        message: error.message || 'Đã xảy ra sự cố trong quá trình quyết toán chuỗi dòng tiền.'
      });
    }
  }

  async unpublishResult(req, res) {
    const raceId = parseInt(req.params.raceId);

    if (isNaN(raceId)) {
      return res.status(400).json({ success: false, message: 'Tham số định danh trận đua (raceId) không đúng định dạng.' });
    }

    try {
      const report = await settlementService.unpublishRace(raceId);

      // HOÀN TÁC PHÁT THÔNG BÁO SOCKET
      try {
        // Gửi thông báo cho TẤT CẢ spectator (winners + losers đều thông báo)
        Object.entries(report.spectatorBetDetails).forEach(([spectatorId, details]) => {
          const messageData = {
            type: 'BET_WIN_REVERSAL',
            raceId: raceId,
            recalledAmount: details.recallPayout || 0,
            betAmount: details.totalBetAmount,
            wasWinner: details.won,
            message: `Kết quả trận #${raceId} đã bị Admin thu hồi để đối soát lại.`
          };
          socketEmitter.emitToUser(parseInt(spectatorId), 'WALLET_UPDATED', messageData);
        });

        socketEmitter.emitToAll('RACE_UNPUBLISHED', { raceId: raceId });
      } catch (socketErr) {
        console.warn('[SOCKET WARNING] Không thể phát tín hiệu hủy real-time:', socketErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Thu hồi kết quả trận đấu, đóng gói hoàn tác ví và các quỹ hệ thống thành công.',
        data: {
          raceId: report.raceId,
          status: report.status,
          recalledTotalPayout: report.recalledTotalPayout,
          affectedWinnersCount: Object.keys(report.walletDecrements).length
        }
      });

    } catch (error) {
      console.error(`[UNPUBLISH ERROR] Trận đấu ${raceId} thất bại:`, error.message);
      return res.status(400).json({
        success: false,
        message: error.message || 'Đã xảy ra sự cố trong quá trình thu hồi quyết toán.'
      });
    }
  }
}

module.exports = new SettlementController();