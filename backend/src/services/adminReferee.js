const prisma = require('../config/prisma');
const { applyPositionRatingUpdates } = require('./ratingUpdate');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class AdminRefereeService {
  /**
   * Gán 2 trọng tài cho trận đấu
   */
  async assignRefereesToRace(raceId, refereeAId, refereeBId) {
    const race = await prisma.race.findUnique({
      where: { raceId: parseInt(raceId) }
    });

    if (!race) throw httpError('Trận đấu không tồn tại.', 404);
    if (race.status !== 'SCHEDULED') {
      throw httpError('Chỉ có thể phân công trọng tài khi trận đấu ở trạng thái SCHEDULED.', 409);
    }

    const referees = await prisma.user.findMany({
      where: { userId: { in: [parseInt(refereeAId), parseInt(refereeBId)] } },
      include: { role: true }
    });

    if (referees.length < 2) {
     throw httpError('Một hoặc cả hai trọng tài được chỉ định không tồn tại trên hệ thống.', 404);
    }

    const invalidRoleUser = referees.find((u) => u.role.code !== 'RACE_REFEREE');
    if (invalidRoleUser) {
      throw httpError(
          `Người dùng "${invalidRoleUser.fullName}" (id: ${invalidRoleUser.userId}) không có vai trò RACE_REFEREE, không thể phân công làm trọng tài.`,
          400
      );
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

    if (!race) throw httpError('Trận đấu không tồn tại.', 404);
    if (race.status !== 'PAUSED') {
      throw httpError('Trận đấu không ở trạng thái xung đột (PAUSED) để rà soát.', 409);
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

      if (!race) throw httpError('Trận đấu không tồn tại.', 404);
      if (race.status !== 'PAUSED') throw httpError('Trận đấu phải ở trạng thái PAUSED mới có thể can thiệp xử lý.', 409);

      await tx.officialRaceResult.update({
        where: { raceId: parseInt(raceId) },
        data: {
          matchStatus: 'RESOLVED',
          finalResults: finalResults,
          resolvedById: adminUserId,
          resolveReason: reason
        }
      });

      // Kết quả đã chốt -> cập nhật OR/RPR theo vị trí về đích (rule-based).
      await applyPositionRatingUpdates(parseInt(raceId), tx);

      // Chuyển sang PENDING_RESULT để chờ bấm nút Publish kết quả ra bảng chung
      return await tx.race.update({
        where: { raceId: parseInt(raceId) },
        data: { status: 'PENDING_RESULT' }
      });
    });
  }

  async getDeviationsList(statusFilter) {
    const deviations = await prisma.officialRaceResult.findMany({
      where: {
        matchStatus: statusFilter
      },
      include: {
        race: {
          select: {
            name: true,
            scheduledAt: true,
            refereeA: { select: { fullName: true } },
            refereeB: { select: { fullName: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return deviations.map(d => ({
      deviationId: d.officialResultId,
      raceId: d.raceId,
      raceName: d.race.name,
      scheduledAt: d.race.scheduledAt,
      refereeA: d.race.refereeA?.fullName || 'N/A',
      refereeB: d.race.refereeB?.fullName || 'N/A',
      status: d.matchStatus,
      rawResults: d.finalResults,
      createdAt: d.createdAt
    }));
  }

  async listDeviations({ page = 1, pageSize = 10, status } = {}) {
    const skip = (page - 1) * pageSize;
    const where = status ? { matchStatus: status } : { matchStatus: 'CONFLICTED' };

    const [total, deviations] = await prisma.$transaction([
      prisma.officialRaceResult.count({ where }),
      prisma.officialRaceResult.findMany({
        where,
        skip, take: parseInt(pageSize),
        include: {
          race: { select: { name: true, refereeAId: true, refereeBId: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, page: parseInt(page), pageSize: parseInt(pageSize), deviations };
  }

  async getDeviationDetail(resultId) {
  const conflict = await prisma.officialRaceResult.findUnique({
    where: { officialResultId: parseInt(resultId) },
    include: {
      race: { include: { refereeSubmissions: true, refereeA: true, refereeB: true } }
    }
  });
    if (!conflict) throw httpError('Deviation not found', 404);
    return conflict;
  }

  /**
 * Wrapper cho nhóm route /api/admin/deviations — tại đây `:id` LUÔN LÀ officialResultId
 * (khớp với GET /api/admin/deviations/:id dùng getDeviationDetail), KHÔNG PHẢI raceId.
 */
async resolveDeviationById(officialResultId, adminUserId, finalResults, reason) {
  const deviation = await prisma.officialRaceResult.findUnique({
    where: { officialResultId: parseInt(officialResultId) }
  });

  if (!deviation) throw httpError('Deviation not found', 404);

  return this.resolveResultConflict(deviation.raceId, adminUserId, finalResults, reason);
}
}

module.exports = new AdminRefereeService();