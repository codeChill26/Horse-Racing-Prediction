// backend/src/services/settlement.service.js

const prisma = require('../config/prisma'); // Import prisma instance từ config hiện tại của bạn

class SettlementService {
  /**
   * Tính toán và quyết toán vé cược, cập nhật ví tiền, cân đối quỹ dự phòng.
   * Toàn bộ luồng được bọc trong database transaction để đảm bảo tính toàn vẹn (Atomic).
   */
  async settleAndPublishRace(raceId) {
    return await prisma.$transaction(async (tx) => {
      
      // 1. Kiểm tra điều kiện tiên quyết và trạng thái trận đua
      const race = await tx.race.findUnique({
        where: { raceId: raceId },
        include: {
          officialRaceResult: true,
          predictions: { where: { status: 'PENDING' } }
        }
      });

      if (!race) throw new Error(`Trận đấu mang ID ${raceId} không tồn tại.`);
      // Cho phép publish khi:
      // 1. PENDING_RESULT - luồng bình thường (referee đã submit, admin publish)
      // 2. FINISHED nhưng chưa settle (publishedAt = null) - fix data cũ hoặc edge case
      if (race.status !== 'PENDING_RESULT' && !(race.status === 'FINISHED' && !race.publishedAt)) {
        throw new Error(`Trận đấu phải ở trạng thái PENDING_RESULT hoặc FINISHED (chưa settle). Hiện tại: ${race.status}`);
      }
      if (!race.officialRaceResult) {
        throw new Error('Chưa tìm thấy dữ liệu đối chiếu kết quả trọng tài (OfficialRaceResult).');
      }

      const finalResultsArray = race.officialRaceResult.finalResults;

      if (!Array.isArray(finalResultsArray)) {
        throw new Error('Dữ liệu kết quả chính thức finalResults không phải là một mảng hợp lệ.');
      }

      // 2. Trích xuất thông tin Top 3 định danh từ JSON kết quả chính thức
      // Định dạng JSON mẫu: [{"entryId": 10, "rank": 1}, {"entryId": 12, "rank": 2}, {"entryId": 15, "rank": 3}]
      const rank1 = finalResultsArray.find(r => r.rank === 1 || r.finishPosition === 1);
      const rank2 = finalResultsArray.find(r => r.rank === 2 || r.finishPosition === 2);
      const rank3 = finalResultsArray.find(r => r.rank === 3 || r.finishPosition === 3);

      if (!rank1 || !rank2 || !rank3) {
        throw new Error('Dữ liệu finalResults không hợp lệ, yêu cầu đầy đủ vị trí Top 3.');
      }

      const entry1 = rank1.entryId;
      const entry2 = rank2.entryId;
      const entry3 = rank3.entryId;

      // Tính tổng Pool cược thu được của trận đấu
      const allPredictions = await tx.prediction.findMany({ where: { raceId: raceId } });
      const totalPool = allPredictions.reduce((sum, p) => sum + p.betAmount, 0);

      let actualTotalPayout = 0;
      const walletIncrements = {};
      // Track all spectators who bet — needed for sending notifications to both winners AND losers
      const spectatorBetDetails = {}; // { [spectatorId]: { betAmount, won, payout } }
      const predictionUpdates = [];

      // 3. Quét danh sách vé cược & Đối chiếu Thắng / Thua (Settlement Engine)
      for (const pred of race.predictions) {
        let isWon = false;
        let payout = 0;

        const type = pred.betType;
        const pick1 = pred.entryId1;
        const pick2 = pred.entryId2;
        const stake = pred.betAmount;
        const odds = Number(pred.lockedOdds);

        if (type === 'WIN') {
          if (pick1 === entry1) {
            isWon = true;
            payout = Math.floor(stake * odds);
          }
        }
        else if (type === 'PLACE') {
          if (pick1 === entry1 || pick1 === entry2) {
            isWon = true;
            payout = Math.floor(stake * odds * 0.7);
          }
        }
        else if (type === 'SHOW') {
          if ([entry1, entry2, entry3].includes(pick1)) {
            isWon = true;
            payout = Math.floor(stake * odds * 0.5);
          }
        }
        else if (type === 'QUINELLA') {
          if ([entry1, entry2].includes(pick1) && [entry1, entry2].includes(pick2)) {
            isWon = true;
            payout = Math.floor(stake * odds * 1.5);
          }
        }
        else if (type === 'EXACTA') {
          if (pick1 === entry1 && pick2 === entry2) {
            isWon = true;
            payout = Math.floor(stake * odds * 2.0);
          }
        }

        if (isWon) {
          actualTotalPayout += payout;
          predictionUpdates.push({
            predictionId: pred.predictionId,
            data: { status: 'WON', payout: payout, settledAt: new Date() }
          });

          if (!walletIncrements[pred.spectatorId]) walletIncrements[pred.spectatorId] = 0;
          walletIncrements[pred.spectatorId] += payout;
        } else {
          predictionUpdates.push({
            predictionId: pred.predictionId,
            data: { status: 'LOST', payout: 0, settledAt: new Date() }
          });
        }

        // Track per-spectator details for notification payload
        if (!spectatorBetDetails[pred.spectatorId]) {
          spectatorBetDetails[pred.spectatorId] = {
            totalBetAmount: 0,
            won: false,
            totalPayout: 0,
          };
        }
        spectatorBetDetails[pred.spectatorId].totalBetAmount += stake;
        if (isWon) {
          spectatorBetDetails[pred.spectatorId].won = true;
          spectatorBetDetails[pred.spectatorId].totalPayout += payout;
        }
      }

      // Thực thi cập nhật trạng thái các vé cược
      for (const update of predictionUpdates) {
        await tx.prediction.update({
          where: { predictionId: update.predictionId },
          data: update.data
        });
      }

      // 4. Khấu trừ phí vận hành sàn (10% House Margin) và cân đối dòng tiền quỹ
      const houseMargin = Math.floor(totalPool * 0.10);
      const netPool = totalPool - houseMargin;
      const treasureBalanceChange = netPool - actualTotalPayout;

      // Cộng dồn phí vận hành nhà cái vào SystemSetting
      await tx.systemSetting.upsert({
        where: { key: 'HOUSE_REVENUE' },
        update: { value: { increment: houseMargin } },
        create: { key: 'HOUSE_REVENUE', value: houseMargin, description: 'Doanh thu trích từ phí vận hành cược' }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: null, // Giao dịch hệ thống tổng công khai
          amount: houseMargin,
          balanceAfter: 0, 
          referenceType: 'Race',
          referenceId: BigInt(raceId),
          type: 'HOUSE_MARGIN',
          description: `Trích 10% phí vận hành sàn từ trận đua số ${raceId}`
        }
      });

      // Cân đối Quỹ dự phòng (Treasure Pool)
      await tx.systemSetting.upsert({
        where: { key: 'TREASURE_POOL' },
        update: { value: { increment: treasureBalanceChange } },
        create: { key: 'TREASURE_POOL', value: treasureBalanceChange, description: 'Quỹ dự phòng cân đối rủi ro dòng tiền' }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: null,
          amount: treasureBalanceChange,
          balanceAfter: 0,
          referenceType: 'Race',
          referenceId: BigInt(raceId),
          type: treasureBalanceChange >= 0 ? 'TREASURE_IN' : 'TREASURE_OUT',
          description: treasureBalanceChange >= 0 
            ? `Nạp điểm thặng dư trận ${raceId} vào quỹ dự phòng.` 
            : `Trích xuất quỹ dự phòng bù lỗ thâm hụt chi trả thưởng trận ${raceId}.`
        }
      });

      // Giải ngân tiền thưởng trực tiếp về PointWallet người chơi thắng cuộc
      for (const [spectatorIdStr, payoutAmount] of Object.entries(walletIncrements)) {
        const spectatorId = parseInt(spectatorIdStr);

        const wallet = await tx.pointWallet.findUnique({ where: { userId: spectatorId } });
        if (!wallet) throw new Error(`Không thấy ví điểm của Spectator ID ${spectatorId}`);
        if (wallet.isFrozen === 1) throw new Error(`Ví của Spectator ID ${spectatorId} đang bị đóng băng.`);

        const newBalance = wallet.balance + payoutAmount;

        // Lưu ý: Ràng buộc rowVersion chống race condition tự chạy ở tầng PostgreSQL thông qua cấu trúc Prisma update
        const updatedWallet = await tx.pointWallet.update({
          where: { userId: spectatorId },
          data: { balance: newBalance }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: updatedWallet.walletId,
            amount: payoutAmount,
            balanceAfter: newBalance,
            referenceType: 'Race',
            referenceId: BigInt(raceId),
            type: 'BET_WIN',
            description: `Nhận điểm thưởng thắng cược trận đấu ${raceId}.`
          }
        });
      }

      // 5. Đồng bộ kết quả xếp hạng vào bảng phẳng RaceResult để tối ưu hóa UI thống kê
      for (const resItem of finalResultsArray) {
        const entryData = await tx.raceEntry.findUnique({ where: { entryId: resItem.entryId } });
        if (entryData) {
          await tx.raceResult.upsert({
            where: { raceId_horseId: { raceId: raceId, horseId: entryData.horseId } },
            update: { finishPosition: resItem.rank },
            create: { raceId: raceId, horseId: entryData.horseId, finishPosition: resItem.rank }
          });
        }
      }

      // Đóng gói và chuyển trạng thái trận đấu sang FINISHED
      const publishedAt = new Date();
      const updatedRace = await tx.race.update({
        where: { raceId: raceId },
        data: { status: 'FINISHED', publishedAt: publishedAt }
      });

      return {
        raceId: raceId,
        status: updatedRace.status,
        totalPool: totalPool,
        houseMargin: houseMargin,
        actualTotalPayout: actualTotalPayout,
        treasureBalanceChange: treasureBalanceChange,
        walletIncrements: walletIncrements,
        // Per-spectator breakdown for notifications (wins AND losses)
        spectatorBetDetails: spectatorBetDetails,
        publishedAt: publishedAt
      };
    });
  }

  /**
   * Bộ máy THU HỒI KẾT QUẢ VÀ ĐẢO NGƯỢC DÒNG TIỀN (Rollback Engine).
   * Chạy trọn vẹn trong một Prisma.$transaction để đảm bảo tính nguyên tố (Atomic).
   */
  async unpublishRace(raceId) {
    return await prisma.$transaction(async (tx) => {
      
      // 1. Kiểm tra trạng thái trận đấu
      const race = await tx.race.findUnique({
        where: { raceId: raceId },
        include: {
          predictions: { 
            where: { 
              status: { in: ['WON', 'LOST'] } 
            } 
          }
        }
      });

      if (!race) throw new Error(`Trận đấu mang ID ${raceId} không tồn tại.`);
      if (race.status !== 'FINISHED') {
        throw new Error(`Chỉ có thể thu hồi trận đấu đã kết thúc (FINISHED). Trạng thái hiện tại: ${race.status}`);
      }

      // Tính toán lại tổng pool cược để hoàn tác các quỹ hệ thống
      const totalPool = race.predictions.reduce((sum, p) => sum + p.betAmount, 0);
      const houseMargin = Math.floor(totalPool * 0.10);
      
      let totalPayoutToRecall = 0;
      const walletDecrements = {};

      // 2. Lọc danh sách vé cược thắng để chuẩn bị đòi lại tiền
      // Track ALL spectators (winners + losers) for notifications
      const spectatorBetDetails = {};
      for (const pred of race.predictions) {
        if (!spectatorBetDetails[pred.spectatorId]) {
          spectatorBetDetails[pred.spectatorId] = { totalBetAmount: 0, won: false, recallPayout: 0 };
        }
        spectatorBetDetails[pred.spectatorId].totalBetAmount += pred.betAmount;

        if (pred.status === 'WON') {
          const payoutAmount = pred.payout || 0;
          totalPayoutToRecall += payoutAmount;
          spectatorBetDetails[pred.spectatorId].won = true;
          spectatorBetDetails[pred.spectatorId].recallPayout = payoutAmount;

          if (!walletDecrements[pred.spectatorId]) walletDecrements[pred.spectatorId] = 0;
          walletDecrements[pred.spectatorId] += payoutAmount;
        }
      }

      const netPool = totalPool - houseMargin;
      const originalTreasureBalanceChange = netPool - totalPayoutToRecall;

      // 3. Hoàn tác dòng tiền hệ thống trong SystemSetting (Trừ ngược lại tiền đã cộng)
      await tx.systemSetting.update({
        where: { key: 'HOUSE_REVENUE' },
        data: { value: { decrement: houseMargin } }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: null,
          amount: -houseMargin,
          balanceAfter: 0,
          referenceType: 'Race',
          referenceId: BigInt(raceId),
          type: 'ADMIN_ADJUSTMENT',
          description: `Thu hồi 10% phí vận hành sàn do hủy công bố kết quả trận ${raceId}`
        }
      });

      // Hoàn tác số dư Quỹ dự phòng (Treasure Pool)
      await tx.systemSetting.update({
        where: { key: 'TREASURE_POOL' },
        data: { value: { decrement: originalTreasureBalanceChange } }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: null,
          amount: -originalTreasureBalanceChange,
          balanceAfter: 0,
          referenceType: 'Race',
          referenceId: BigInt(raceId),
          type: 'ADMIN_ADJUSTMENT',
          description: `Hoàn tác quỹ dự phòng do hủy công bố kết quả trận ${raceId}`
        }
      });

      // 4. Thu hồi tiền thưởng từ ví điểm của Spectator và ghi nhận lịch sử BET_WIN_REVERSAL
      for (const [spectatorIdStr, recallAmount] of Object.entries(walletDecrements)) {
        const spectatorId = parseInt(spectatorIdStr);

        const wallet = await tx.pointWallet.findUnique({ where: { userId: spectatorId } });
        if (!wallet) throw new Error(`Không thấy ví điểm của người chơi ID: ${spectatorId}`);
        
        // Tính toán số dư mới (Chấp nhận việc số dư bị âm tạm thời nếu người chơi đã lỡ tiêu hết tiền thưởng)
        const newBalance = wallet.balance - recallAmount;

        const updatedWallet = await tx.pointWallet.update({
          where: { userId: spectatorId },
          data: { balance: newBalance }
        });

        // Tạo hóa đơn thu hồi (Sử dụng mã loại giao dịch BET_WIN_REVERSAL có sẵn trong schema của bạn)
        await tx.walletTransaction.create({
          data: {
            walletId: updatedWallet.walletId,
            amount: -recallAmount,
            balanceAfter: newBalance,
            referenceType: 'Race',
            referenceId: BigInt(raceId),
            type: 'BET_WIN_REVERSAL',
            description: `Thu hồi điểm thưởng thắng cược trận ${raceId} do Admin thực hiện lệnh Unpublish.`
          }
        });
      }

      // 5. Đưa trạng thái các vé cược (Cả WON và LOST) quay trở lại thành PENDING
      await tx.prediction.updateMany({
        where: { raceId: raceId },
        data: {
          status: 'PENDING',
          payout: null,
          settledAt: null
        }
      });

      // 6. Xóa dữ liệu bảng kết quả phẳng RaceResult để giải phóng vị trí xếp hạng cũ
      await tx.raceResult.deleteMany({
        where: { raceId: raceId }
      });

      // 7. Chuyển trạng thái trận đua ngược về PENDING_RESULT
      const updatedRace = await tx.race.update({
        where: { raceId: raceId },
        data: {
          status: 'PENDING_RESULT',
          publishedAt: null
        }
      });

      return {
        raceId: raceId,
        status: updatedRace.status,
        recalledTotalPayout: totalPayoutToRecall,
        walletDecrements: walletDecrements,
        // Per-spectator breakdown for notifications (wins AND losses)
        spectatorBetDetails: spectatorBetDetails,
      };
    });
  }

  /**
   * CRITICAL-10: Lấy settlement summary của race đã publish.
   * Tái dựng các chỉ số tài chính từ bảng Prediction (settled) + Race.publishedAt.
   * Idempotent — chỉ đọc, không ghi.
   */
  async getSettlementSummary(raceId) {
    if (!Number.isInteger(raceId) || raceId <= 0) {
      throw Object.assign(new Error('Invalid raceId'), { status: 400 });
    }

    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, status: true, publishedAt: true },
    });

    if (!race) {
      throw Object.assign(new Error('Race not found'), { status: 404 });
    }

    if (race.status !== 'FINISHED' || !race.publishedAt) {
      throw Object.assign(new Error('Race chưa được publish'), { status: 404 });
    }

    const predictions = await prisma.prediction.findMany({
      where: { raceId },
      select: { status: true, betAmount: true, payout: true },
    });

    const totalPool = predictions.reduce((sum, p) => sum + p.betAmount, 0);
    const actualTotalPayout = predictions.reduce((sum, p) => sum + (p.payout || 0), 0);
    const houseMargin = Math.floor(totalPool * 0.10);
    const netPool = totalPool - houseMargin;
    const treasureBalanceChange = netPool - actualTotalPayout;

    const settledCount = predictions.length;
    const wonCount = predictions.filter((p) => p.status === 'WON').length;
    const lostCount = predictions.filter((p) => p.status === 'LOST').length;
    const refundedCount = predictions.filter((p) => p.status === 'REFUNDED').length;
    const partialWonCount = predictions.filter((p) => p.status === 'PARTIAL_WON').length;

    return {
      raceId: race.raceId,
      status: race.status,
      totalPool,
      houseMargin,
      netPool,
      actualTotalPayout,
      treasureBalanceChange,
      settledCount,
      wonCount,
      lostCount,
      refundedCount,
      partialWonCount,
      publishedAt: race.publishedAt,
    };
  }
}

module.exports = new SettlementService();