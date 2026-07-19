const prisma = require('../config/prisma');
const { applyPositionRatingUpdates } = require('./ratingUpdate');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class RefereeService {
  /**
   * Kích hoạt trận đấu
   */
  async startRace(raceId, refereeUserId) {
    return await prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({
        where: { raceId: parseInt(raceId) }
      });

      if (!race) throw httpError('Trận đấu không tồn tại trong hệ thống.', 404);
      if (race.status !== 'SCHEDULED') throw httpError('Trận đấu chỉ có thể bắt đầu khi ở trạng thái SCHEDULED.', 409);
      if (!race.refereeAId || !race.refereeBId) throw httpError('Trận đấu chưa được cấu hình phân công đủ 2 trọng tài.', 409);
      
      if (race.refereeAId !== refereeUserId && race.refereeBId !== refereeUserId) {
        throw httpError('Bạn không có quyền kích hoạt trận đấu này.', 403);
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

      if (!race) throw httpError('Trận đấu không tồn tại.', 404);
      // Hỗ trợ race ở trạng thái IN_PROGRESS (submission đầu tiên)
      // hoặc FINISHED (race vừa được referee kia finish trong cùng transaction —
      // race condition nhưng vẫn hợp lệ vì kết quả giống nhau).
      const allowedStatuses = ['IN_PROGRESS', 'FINISHED'];
      if (!allowedStatuses.includes(race.status)) {
        throw httpError('Cổng nhập kết quả chỉ mở khi trận đấu đang ở trạng thái IN_PROGRESS.', 409);
      }
      
      if (race.refereeAId !== refereeUserId && race.refereeBId !== refereeUserId) {
        throw httpError('Bạn không phải trọng tài được phân công gán cho trận đấu này.', 403);
      }

      // Ràng buộc Append-Only: Mỗi trọng tài chỉ submit một lần duy nhất
      const hasSubmitted = race.refereeSubmissions.some(s => s.refereeId === refereeUserId);
      if (hasSubmitted) throw httpError('Bạn đã nộp kết quả trước đó. Hệ thống cấm chỉnh sửa.', 409);

      // Lấy entries để enrich rawResults với horse/jockey info.
      // Map 2 chiều: entryId↔horseId, vì FE referee cũ (FD-002) gửi horseId
      // thay vì entryId. Nếu FE gửi horseId mà ta không map lại, kết quả lưu
      // vào OfficialRaceResult.finalResults sẽ có entryId = horseId, làm FE
      // admin khi lookup entries theo entryId bị miss → hiển thị "Entry #..."
      // mất tên ngựa + jockey, đồng thời RaceResult không ghi được (vì
      // map ngược horseId cũng miss).
      const raceEntries = await tx.raceEntry.findMany({
        where: { raceId: parseInt(raceId) },
        include: {
          horse: { select: { horseId: true, name: true } },
          jockey: { select: { userId: true, fullName: true } }
        }
      });
      const entryByEntryId = new Map(raceEntries.map((e) => [e.entryId, e]));
      const entryByHorseId = new Map(
        raceEntries
          .filter((e) => e.horse?.horseId != null)
          .map((e) => [e.horse.horseId, e])
      );

      // Enrich rawResults với horse/jockey info. Nếu entryId submit lên thực
      // chất là horseId (do FE cũ) → map lại entryId đúng trước khi enrich.
      const enrichedRawResults = rawResults.map((r) => {
        const looksLikeHorseId = entryByEntryId.get(r.entryId) == null
          && entryByHorseId.get(r.entryId) != null;
        const realEntry = entryByEntryId.get(r.entryId)
          || (looksLikeHorseId ? entryByHorseId.get(r.entryId) : null);
        const realEntryId = realEntry?.entryId ?? r.entryId;
        return {
          ...r,
          entryId: realEntryId,
          horseId: realEntry?.horse?.horseId || null,
          horseName: realEntry?.horse?.name || null,
          jockeyId: realEntry?.jockey?.userId || null,
          jockeyName: realEntry?.jockey?.fullName || null,
          gateNumber: realEntry?.gateNumber || null,
        };
      });

      // Lưu kết quả Blind với thông tin ngựa/jockey đã được enrich
      const currentSubmission = await tx.refereeSubmission.create({
        data: {
          raceId: parseInt(raceId),
          refereeId: refereeUserId,
          rawResults: enrichedRawResults
        }
      });

      const allSubmissions = [...race.refereeSubmissions, currentSubmission];

      console.log(`[submitRaceResult] raceId=${raceId} refereeUserId=${refereeUserId} refereeAId=${race.refereeAId} refereeBId=${race.refereeBId}`);
      console.log(`[submitRaceResult] total submissions after this: ${allSubmissions.length}`);
      console.log(`[submitRaceResult] all refereeIds: ${allSubmissions.map(s => s.refereeId).join(',')}`);

      // Nếu mới có 1 người nộp -> Đợi người còn lại
      if (allSubmissions.length < 2) {
        console.log(`[submitRaceResult] Only ${allSubmissions.length} submission(s) — returning PENDING_PARTNER`);
        return {
          status: 'PENDING_PARTNER',
          message: 'Nộp kết quả thành công. Đang chờ trọng tài thứ hai hoàn thành Blind Submission.'
        };
      }

      // Nếu đã đủ 2 người nộp -> Tiến hành Match Engine đối chiếu kết quả
      // Fetch lại để đảm bảo có đủ 2 submissions trong transaction (Prisma không tự cập nhật
      // include khi tạo record mới trong cùng transaction).
      const refreshedSubmissions = await tx.refereeSubmission.findMany({
        where: { raceId: parseInt(raceId) },
      });
      const submissionA = refreshedSubmissions.find(s => s.refereeId === race.refereeAId);
      const submissionB = refreshedSubmissions.find(s => s.refereeId === race.refereeBId);
      console.log(`[submitRaceResult] refreshedSubmissions.length=${refreshedSubmissions.length}`);
      console.log(`[submitRaceResult] submissionA.refereeId=${submissionA?.refereeId} submissionB.refereeId=${submissionB?.refereeId}`);

      // Kiểm tra điều kiện đủ 2 submissions thực sự
      if (!submissionA || !submissionB) {
        console.log(`[submitRaceResult] Still waiting for the other referee — returning PENDING_PARTNER`);
        return {
          status: 'PENDING_PARTNER',
          message: 'Nộp kết quả thành công. Đang chờ trọng tài thứ hai hoàn thành Blind Submission.'
        };
      }

      // Sắp xếp theo entryId trước khi chuỗi hóa JSON để đảm bảo tính so sánh chính xác tuyệt đối
      const getRawResults = (sub) => Array.isArray(sub?.rawResults) ? sub.rawResults : [];
      const sortedA = [...getRawResults(submissionA)].sort((a, b) => (a?.entryId ?? 0) - (b?.entryId ?? 0));
      const sortedB = [...getRawResults(submissionB)].sort((a, b) => (a?.entryId ?? 0) - (b?.entryId ?? 0));
      console.log(`[submitRaceResult] sortedA.length=${sortedA.length} sortedB.length=${sortedB.length}`);
      console.log(`[submitRaceResult] sortedA=`, JSON.stringify(sortedA));
      console.log(`[submitRaceResult] sortedB=`, JSON.stringify(sortedB));

      const isMatch = sortedA.length === sortedB.length &&
        sortedA.every((item, i) => item.entryId === sortedB[i]?.entryId &&
          item.rank === sortedB[i]?.rank &&
          item.isDnf === sortedB[i]?.isDnf &&
          item.isDq === sortedB[i]?.isDq);

      if (isMatch) {
        // KHỚP 100% -> Auto-finish race (không cần chờ Admin duyệt)
        console.log(`[submitRaceResult] MATCH! Updating race to FINISHED`);
        await tx.race.update({
          where: { raceId: parseInt(raceId) },
          data: { status: 'FINISHED' }
        });

        // upsert để xử lý race condition: nếu transaction 1 đã tạo
        // OfficialRaceResult rồi thì transaction 2 ghi đè bằng cùng kết quả (idempotent).
        await tx.officialRaceResult.upsert({
          where: { raceId: parseInt(raceId) },
          create: {
            raceId: parseInt(raceId),
            matchStatus: 'AUTO_MATCHED',
            finalResults: submissionA.rawResults
          },
          update: {
            matchStatus: 'AUTO_MATCHED',
            finalResults: submissionA.rawResults
          }
        });

        // Tạo RaceResult từ finalResults
        const raceEntries = await tx.raceEntry.findMany({
          where: { raceId: parseInt(raceId) },
          select: { entryId: true, horseId: true }
        });
        const entryMap = Object.fromEntries(raceEntries.map(e => [e.entryId, e.horseId]));

        const raceResultsData = submissionA.rawResults.map(item => ({
          raceId: parseInt(raceId),
          horseId: entryMap[item.entryId],
          finishPosition: item.rank
        })).filter(r => r.horseId != null);

        if (raceResultsData.length > 0) {
          // Xóa kết quả cũ (nếu có) rồi tạo mới
          await tx.raceResult.deleteMany({ where: { raceId: parseInt(raceId) } });
          await tx.raceResult.createMany({ data: raceResultsData });
          console.log(`[submitRaceResult] Created ${raceResultsData.length} RaceResult records`);
        }

        // Lấy thông tin race để broadcast
        const raceInfo = await tx.race.findUnique({
          where: { raceId: parseInt(raceId) },
          select: { name: true, tournamentId: true }
        });
        const raceResultPayload = {
          raceId: parseInt(raceId),
          raceName: raceInfo.name,
          status: 'FINISHED',
          results: raceResultsData
        };

        // Kết quả đã chính thức -> cập nhật OR/RPR theo vị trí về đích (rule-based).
        await applyPositionRatingUpdates(parseInt(raceId), tx);

        return {
          status: 'FINISHED',
          message: 'Kết quả trùng khớp 100%! Trận đấu đã kết thúc và công bố kết quả.',
          raceResult: raceResultPayload
        };
      } else {
        // LỆCH KẾT QUẢ -> Đóng băng chuyển sang trạng thái PAUSED
        console.log(`[submitRaceResult] CONFLICT! Updating race to PAUSED`);
        await tx.race.update({
          where: { raceId: parseInt(raceId) },
          data: { status: 'PAUSED' }
        });

        // upsert tương tự cho trường hợp conflict
        await tx.officialRaceResult.upsert({
          where: { raceId: parseInt(raceId) },
          create: {
            raceId: parseInt(raceId),
            matchStatus: 'CONFLICTED',
            finalResults: {}
          },
          update: {
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
        location: race.tournament?.location || '',
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
          horses: race.entries.map((e, idx) => ({
            entryId: e.entryId,
            horseId: e.horseId,
            gateNumber: e.saddleNo || idx + 1,
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
      include: {
        race: {
          select: {
            name: true,
            officialRaceResult: { select: { matchStatus: true } }
          }
        }
      },
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

    if (!user) throw httpError('Không tìm thấy tài khoản.', 404);

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
      throw httpError('Race not found', 404);
    }
    if (!['IN_PROGRESS', 'PAUSED', 'PENDING_RESULT'].includes(race.status)) {
      throw httpError('Race is not in IN_PROGRESS status', 409);
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