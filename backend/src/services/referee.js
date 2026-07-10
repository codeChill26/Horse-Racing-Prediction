const prisma = require('../config/prisma');

class RefereeService {
  /**
   * Kích hoạt trận đấu
   */
  async startRace(raceId, refereeUserId) {
    return await prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({
        where: { raceId: parseInt(raceId) }
      });

    console.log('====================');
    console.log('raceId =', raceId);
    console.log('refereeUserId =', refereeUserId);
    console.log('typeof refereeUserId =', typeof refereeUserId);

    console.log('race.refereeAId =', race?.refereeAId);
    console.log('race.refereeBId =', race?.refereeBId);
    console.log('typeof race.refereeAId =', typeof race?.refereeAId);
    console.log('====================');

      if (!race) throw new Error('Trận đấu không tồn tại trong hệ thống.');
      if (race.status !== 'SCHEDULED') throw new Error('Trận đấu chỉ có thể bắt đầu khi ở trạng thái SCHEDULED.');
      if (!race.refereeAId || !race.refereeBId) throw new Error('Trận đấu chưa được cấu hình phân công đủ 2 trọng tài.');
      
      if (race.refereeAId !== refereeUserId && race.refereeBId !== refereeUserId) {
        throw new Error('Bạn không có quyền kích hoạt trận đấu này.');
      }

      // Chuyển trạng thái trận đấu sang IN_PROGRESS
      const updatedRace = await tx.race.update({
        where: { raceId: parseInt(raceId) },
        data: { status: 'IN_PROGRESS' }
      });

      // Nghiệp vụ: Khóa toàn bộ cược mới bằng cách cập nhật thời gian chốt cược (Tùy biến luồng Prediction)
      await tx.prediction.updateMany({
        where: { raceId: parseInt(raceId), status: 'PENDING' },
        data: { updatedAt: new Date() }
      });

      return updatedRace;
    });
  }

  /**
   * Blind Submission & Auto-Match Engine
   */
  async submitRaceResult(raceId, refereeUserId, rawResults) {
    return await prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({
        where: { raceId: parseInt(raceId) },
        include: { refereeSubmissions: true }
      });

      if (!race) throw new Error('Trận đấu không tồn tại.');
      if (race.status !== 'IN_PROGRESS') throw new Error('Cổng nhập kết quả chỉ mở khi trận đấu đang ở trạng thái IN_PROGRESS.');
      
      if (race.refereeAId !== refereeUserId && race.refereeBId !== refereeUserId) {
        throw new Error('Bạn không phải trọng tài được phân công gán cho trận đấu này.');
      }

      // Ràng buộc Append-Only: Mỗi trọng tài chỉ submit một lần duy nhất
      const hasSubmitted = race.refereeSubmissions.some(s => s.refereeId === refereeUserId);
      if (hasSubmitted) throw new Error('Bạn đã nộp kết quả trước đó. Hệ thống cấm chỉnh sửa.');

      // Lưu kết quả Blind
      const currentSubmission = await tx.refereeSubmission.create({
        data: {
          raceId: parseInt(raceId),
          refereeId: refereeUserId,
          rawResults: rawResults
        }
      });

      const allSubmissions = [...race.refereeSubmissions, currentSubmission];

      // Nếu mới có 1 người nộp -> Đợi người còn lại
      if (allSubmissions.length < 2) {
        return {
          status: 'PENDING_PARTNER',
          message: 'Nộp kết quả thành công. Đang chờ trọng tài thứ hai hoàn thành Blind Submission.'
        };
      }

      // Nếu đã đủ 2 người nộp -> Tiến hành Match Engine đối chiếu kết quả
      const submissionA = allSubmissions.find(s => s.refereeId === race.refereeAId);
      const submissionB = allSubmissions.find(s => s.refereeId === race.refereeBId);

      // Sắp xếp theo entryId trước khi chuỗi hóa JSON để đảm bảo tính so sánh chính xác tuyệt đối
      const sortedA = [...submissionA.rawResults].sort((a, b) => a.entryId - b.entryId);
      const sortedB = [...submissionB.rawResults].sort((a, b) => a.entryId - b.entryId);

      if (JSON.stringify(sortedA) === JSON.stringify(sortedB)) {
        // KHỚP 100% -> Chuyển sang PENDING_RESULT
        await tx.race.update({
          where: { raceId: parseInt(raceId) },
          data: { status: 'PENDING_RESULT' }
        });

        await tx.officialRaceResult.create({
          data: {
            raceId: parseInt(raceId),
            matchStatus: 'AUTO_MATCHED',
            finalResults: submissionA.rawResults
          }
        });

        return {
          status: 'AUTO_MATCHED',
          message: 'Kết quả trùng khớp 100%! Trận đấu chuyển sang PENDING_RESULT chờ Admin duyệt.'
        };
      } else {
        // LỆCH KẾT QUẢ -> Đóng băng chuyển sang trạng thái PAUSED
        await tx.race.update({
          where: { raceId: parseInt(raceId) },
          data: { status: 'PAUSED' }
        });

        await tx.officialRaceResult.create({
          data: {
            raceId: parseInt(raceId),
            matchStatus: 'CONFLICTED',
            finalResults: {}
          }
        });

        return {
          status: 'CONFLICTED',
          message: 'Phát hiện sai lệch dữ liệu! Trận đấu đã chuyển sang trạng thái PAUSED để Admin can thiệp.'
        };
      }
    });
  }
  
  /**
   * Lấy danh sách trận đấu được phân công cho trọng tài (API 1)
   */
  async getAssignedRaces(refereeId, queryParams = {}) {
    const { status, date } = queryParams;
    let whereClause = { OR: [{ refereeAId: refereeId }, { refereeBId: refereeId }] };

    if (status) whereClause.status = status;
    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);
      whereClause.scheduledAt = { gte: targetDate, lt: nextDate };
    }

    const races = await prisma.race.findMany({
      where: whereClause,
      include: {
        tournament: true,
        entries: { include: { horse: true, jockey: true } },
        refereeA: { select: { fullName: true } },
        refereeB: { select: { fullName: true } },
        refereeSubmissions: { where: { refereeId: refereeId } }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return races.map(race => {
      const isRefereeA = race.refereeAId === refereeId;
      const mySub = race.refereeSubmissions[0];
      return {
        id: race.raceId,
        raceId: race.raceId,
        name: race.name,
        tournamentName: race.tournament.name,
        tournamentId: race.tournamentId,
        scheduledStartTime: race.scheduledAt,
        actualStartTime: race.publishedAt,
        status: race.status,
        bettingStatus: race.registrationOpen ? 'Open' : 'Closed',
        totalLegs: 1, // Mặc định 1 do DB không chia Leg
        legs: [{
          id: `leg-${race.raceId}`,
          legId: 1,
          raceId: race.raceId,
          legNumber: 1,
          name: `Chặng 1 - ${race.name}`,
          status: race.status === 'SCHEDULED' ? 'AwaitingSubmission' : race.status,
          mySubmissionStatus: mySub ? 'Submitted' : 'NotSubmitted',
          otherRefereeStatus: 'Hidden', // Bảo mật kết quả đối phương
          horses: race.entries.map(e => ({
            horseId: e.horseId,
            gateNumber: e.saddleNo || 0,
            horseName: e.horse.name,
            jockeyName: e.jockey?.fullName || 'N/A'
          }))
        }],
        assignedRole: isRefereeA ? 'Referee A' : 'Referee B',
        refereeId: refereeId,
        otherRefereeName: isRefereeA ? (race.refereeB?.fullName || null) : (race.refereeA?.fullName || null)
      };
    });
  }

  /**
   * Lấy chi tiết 1 trận đấu của trọng tài (API 2)
   */
  async getRaceDetail(refereeId, raceId) {
    const races = await this.getAssignedRaces(refereeId, {});
    return races.find(r => r.raceId === raceId) || null;
  }

  /**
   * Lấy lịch sử nộp kết quả của trọng tài (API 5)
   */
  async getSubmissionsHistory(refereeId, queryParams = {}) {
    return await prisma.refereeSubmission.findMany({
      where: { refereeId: refereeId },
      include: { race: { select: { name: true } } },
      orderBy: { submittedAt: 'desc' }
    });
  }

  /**
   * Lấy danh sách các trận đấu bị Conflict (API 6)
   */
  async getConflictsList(refereeId) {
    return await prisma.officialRaceResult.findMany({
      where: {
        matchStatus: 'CONFLICTED',
        race: { OR: [{ refereeAId: refereeId }, { refereeBId: refereeId }] }
      },
      include: {
        race: { include: { refereeSubmissions: true } }
      }
    });
  }

  /**
   * Lấy Profile và tính toán số liệu thống kê cho Trọng tài (API 7)
   */
  async getRefereeProfile(refereeId) {
    const user = await prisma.user.findUnique({
      where: { userId: refereeId },
      include: { role: true }
    });

    if (!user) throw new Error('Không tìm thấy tài khoản.');

    // Thống kê Metrics
    const totalAssigned = await prisma.race.count({
      where: { OR: [{ refereeAId: refereeId }, { refereeBId: refereeId }] }
    });
    
    const totalSubmitted = await prisma.refereeSubmission.count({
      where: { refereeId: refereeId }
    });

    const conflicts = await prisma.officialRaceResult.count({
      where: {
        matchStatus: 'CONFLICTED',
        race: { OR: [{ refereeAId: refereeId }, { refereeBId: refereeId }] }
      }
    });

    return {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      roleCode: user.role.code,
      isActive: user.isActive,
      isProfileComplete: user.isProfileComplete,
      createdAt: user.createdAt,
      stats: {
        totalRacesAssigned: totalAssigned,
        totalLegsSubmitted: totalSubmitted,
        autoMatchedRate: totalSubmitted > 0 ? ((totalSubmitted - conflicts) / totalSubmitted * 100).toFixed(1) : 0,
        conflictCount: conflicts,
        pendingConflicts: conflicts // Giả định conflict chưa có Admin resolution
      }
    };
  }

  async reportViolation(data, reporterId) {
    const socketEmitter = require('../socket/emitter');

    // 1. Kiểm tra trạng thái trận đấu hợp lệ
    const race = await prisma.race.findUnique({ where: { raceId: parseInt(data.raceId) } });
    if (!race) {
      throw Object.assign(new Error('Race not found'), { status: 404 });
    }
    if (!['IN_PROGRESS', 'PAUSED', 'PENDING_RESULT'].includes(race.status)) {
      throw Object.assign(new Error('Race is not in IN_PROGRESS status'), { status: 400 });
    }

    // 2. Lưu Database
    const newViolation = await prisma.violation.create({
      data: {
        raceId: parseInt(data.raceId),
        entryId: data.entryId ? parseInt(data.entryId) : null,
        type: data.type,
        severity: data.severity,
        description: data.description,
        status: 'OPEN'
      }
    });

    // 3. Format dữ liệu trả về theo đặc tả PROCESS.md
    const violationPayload = {
      violationId: `VIO-${String(newViolation.violationId).padStart(3, '0')}`,
      raceId: newViolation.raceId,
      entryId: newViolation.entryId,
      type: newViolation.type,
      severity: newViolation.severity,
      description: newViolation.description,
      status: newViolation.status,
      createdAt: newViolation.createdAt
    };

    // 4. Bắn Socket báo cho Admin
    socketEmitter.emitToAdmin('violation:created', { violation: violationPayload });

    return { violation: violationPayload };
  }
}

module.exports = new RefereeService();