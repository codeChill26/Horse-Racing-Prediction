// backend/src/controllers/settlement.controller.js

const settlementService = require('../services/settlement');
const { SettlementResultDto } = require('../dto/settlement.dto');
const socketEmitter = require('../socket/emitter');

class SettlementController {
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

      // 3. PHÁT THÔNG BÁO REAL-TIME QUA SOCKET.IO (Đã sửa đổi chống crash)
      try {
        // Kiểm tra xem module socketEmitter của bạn sử dụng hàm nào để gửi tin riêng biệt
        // Giải pháp an toàn nhất, tránh crash lỗi hàm là bọc trong khối try-catch độc lập:
        Object.entries(report.walletIncrements).forEach(([spectatorId, amount]) => {
          const messageData = {
            type: 'BET_WON',
            message: `Trận đấu mã số ${raceId} đã công bố kết quả! Tài khoản của bạn được cộng +${amount} điểm.`,
            addedAmount: amount
          };

          if (typeof socketEmitter.to === 'function') {
            // Định dạng chuẩn của Socket.io Server Emitter: io.to(room).emit(event, data)
            socketEmitter.to(`user_${spectatorId}`).emit('WALLET_UPDATED', messageData);
          } else if (typeof socketEmitter.sendToUser === 'function') {
            socketEmitter.sendToUser(parseInt(spectatorId), 'WALLET_UPDATED', messageData);
          } else {
            // Giải pháp dự phòng: Phát event tổng lên cho client tự lọc theo spectatorId cá nhân
            socketEmitter.broadcast('WALLET_UPDATED_GLOBAL', { spectatorId: parseInt(spectatorId), ...messageData });
          }
        });

        // Phát thông báo đổi trạng thái trận đấu cho toàn sàn UI
        if (typeof socketEmitter.broadcast === 'function') {
          socketEmitter.broadcast('RACE_FINISHED', {
            raceId: raceId,
            message: `Trận đua ${raceId} đã hoàn tất công bố kết quả.`
          });
        } else if (typeof socketEmitter.emit === 'function') {
          socketEmitter.emit('RACE_FINISHED', { raceId: raceId });
        }
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

      // HOÀN TÁC PHÁT THÔNG BÁO SOCKET (Đã bọc an toàn chống crash)
      try {
        Object.entries(report.walletDecrements).forEach(([spectatorId, amount]) => {
          const recallData = {
            type: 'BET_WIN_REVERSAL',
            message: `Kết quả trận đấu số ${raceId} đã bị Admin thu hồi để đối soát lại. Tài khoản bị trừ -${amount} điểm.`,
            recalledAmount: amount
          };

          if (typeof socketEmitter.to === 'function') {
            socketEmitter.to(`user_${spectatorId}`).emit('WALLET_UPDATED', recallData);
          } else if (typeof socketEmitter.sendToUser === 'function') {
            socketEmitter.sendToUser(parseInt(spectatorId), 'WALLET_UPDATED', recallData);
          }
        });

        if (typeof socketEmitter.broadcast === 'function') {
          socketEmitter.broadcast('RACE_UNPUBLISHED', { raceId: raceId });
        }
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