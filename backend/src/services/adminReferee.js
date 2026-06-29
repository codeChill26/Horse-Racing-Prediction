const prisma = require('../config/prisma');

class AdminRefereeService {
  /**
   * Gán 2 trọng tài cho trận đấu
   */
  async assignRefereesToRace(raceId, refereeAId, refereeBId) {
    const race = await prisma.race.findUnique({
      where: { raceId: parseInt(raceId) }
    });

    if (!race) throw new Error('Trận đấu không tồn tại.');
    if (race.status !== 'SCHEDULED') {
      throw new Error('Chỉ có thể phân công trọng tài khi trận đấu ở trạng thái SCHEDULED.');
    }

    const referees = await prisma.user.findMany({
      where: { userId: { in: [parseInt(refereeAId), parseInt(refereeBId)] } }
    });

    if (referees.length < 2) {
      throw new Error('Một hoặc cả hai trọng tài được chỉ định không tồn tại trên hệ thống.');
    }

    return await prisma.race.update({
      where: { raceId: parseInt(raceId) },
      data: {
        refereeAId: parseInt(refereeAId),
        refereeBId: parseInt(refereeBId)
      }
    });
  }

  /**
   * Lấy dữ liệu hiển thị Side-by-Side khi bị PAUSED
   */
  async getConflictReviewData(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId: parseInt(raceId) },
      include: {
        refereeSubmissions: {
          include: {
            referee: { select: { userId: true, fullName: true, email: true } }
          }
        },
        officialRaceResult: true
      }
    });

    if (!race) throw new Error('Trận đấu không tồn tại.');
    if (race.status !== 'PAUSED') {
      throw new Error('Trận đấu không ở trạng thái xung đột (PAUSED) để rà soát.');
    }

    return race;
  }

  /**
   * Admin ghi đè kết quả cuối cùng kèm lý do bắt buộc
   */
  async resolveResultConflict(raceId, adminUserId, finalResults, reason) {
    return await prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({
        where: { raceId: parseInt(raceId) },
        include: { officialRaceResult: true }
      });

      if (!race) throw new Error('Trận đấu không tồn tại.');
      if (race.status !== 'PAUSED') throw new Error('Trận đấu phải ở trạng thái PAUSED mới có thể can thiệp xử lý.');

      await tx.officialRaceResult.update({
        where: { raceId: parseInt(raceId) },
        data: {
          matchStatus: 'RESOLVED',
          finalResults: finalResults,
          resolvedById: adminUserId,
          resolveReason: reason
        }
      });

      // Chuyển sang PENDING_RESULT để chờ bấm nút Publish kết quả ra bảng chung
      return await tx.race.update({
        where: { raceId: parseInt(raceId) },
        data: { status: 'PENDING_RESULT' }
      });
    });
  }
}

module.exports = new AdminRefereeService();