// backend/src/services/adminRaces.js
const prisma = require('../config/prisma');
const socketEmitter = require('../socket/emitter');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function adminRaceSelect() {
  return {
    raceId: true,
    tournamentId: true,
    name: true,
    maxEntries: true,
    scheduledAt: true,
    registrationDeadline: true,
    status: true,
    registrationOpen: true,
    registrationOpenedAt: true,
    registrationClosedAt: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { entries: true, predictions: true } },
  };
}

class AdminRacesService {
  async listRacesByTournament(tournamentId) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    return prisma.race.findMany({
      where: { tournamentId },
      orderBy: { raceId: 'asc' },
      select: adminRaceSelect(),
    });
  }

  async getRaceById(raceId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      include: {
        tournament: { select: { tournamentId: true, name: true, status: true } },
        refereeA: { select: { userId: true, fullName: true, avatarUrl: true } },
        refereeB: { select: { userId: true, fullName: true, avatarUrl: true } },
        entries: {
          include: {
            horse: {
              include: {
                owner: { select: { userId: true, fullName: true, email: true } }
              }
            },
            jockey: { select: { userId: true, fullName: true, email: true } }
          }
        },
        predictions: true,
        officialRaceResult: true,
        results: true
      }
    });

    if (!race) throw httpError('Race not found', 404);

    // Query referee submissions separately
    const refereeSubmissions = await prisma.refereeSubmission.findMany({
      where: { raceId: parseInt(raceId) }
    });

    // Tách kết quả theo refereeId
    const refereeAResult = refereeSubmissions.find(s => s.refereeId === race.refereeAId);
    const refereeBResult = refereeSubmissions.find(s => s.refereeId === race.refereeBId);

    const approvedEntriesCount = race.entries.filter((e) => e.status === 'APPROVED').length;

    // Map results (finishPosition) theo horseId
    const finishPositions = {};
    if (race.results && race.results.length > 0) {
      for (const r of race.results) {
        finishPositions[r.horseId] = r.finishPosition;
      }
    }

    // Định hình cấu trúc mảng Entries chính xác theo đặc tả Frontend mong muốn
    const mappedEntries = race.entries.map((e) => ({
      entryId: e.entryId,
      horseId: e.horseId,
      horseName: e.horse.name,
      jockeyId: e.jockeyId,
      jockeyName: e.jockey?.fullName || 'N/A',
      ownerName: e.horse.owner?.fullName || 'N/A',
      gate: e.entryId, // Sử dụng mã định danh làm số cổng xuất phát mặc định
      status: e.status,
      submittedAt: e.createdAt,
      finishPosition: finishPositions[e.horseId] || null
    }));

    // Tính toán các thông số thống kê dòng tiền
    const totalPool = race.predictions.reduce((sum, p) => sum + p.betAmount, 0);
    const totalBets = race.predictions.length;
    const participantCount = new Set(race.predictions.map((p) => p.spectatorId)).size;

    return {
      raceId: race.raceId,
      tournamentId: race.tournamentId,
      tournamentName: race.tournament?.name || 'N/A',
      name: race.name,
      scheduledAt: race.scheduledAt,
      registrationDeadline: race.registrationDeadline,
      registrationOpen: race.registrationOpen,
      status: race.status,
      maxEntries: race.maxEntries,
      approvedEntriesCount,
      refereeA: race.refereeA,
      refereeB: race.refereeB,
      entries: mappedEntries,
      officialRaceResult: race.officialRaceResult ? {
        id: race.officialRaceResult.officialResultId,
        matchStatus: race.officialRaceResult.matchStatus,
        finalResults: race.officialRaceResult.finalResults,
        publishedAt: race.officialRaceResult.updatedAt,
        resolvedById: race.officialRaceResult.resolvedById,
        resolveReason: race.officialRaceResult.resolveReason,
        refereeAResult: refereeAResult ? {
          id: refereeAResult.submissionId,
          submittedAt: refereeAResult.submittedAt,
          finalResults: refereeAResult.rawResults
        } : null,
        refereeBResult: refereeBResult ? {
          id: refereeBResult.submissionId,
          submittedAt: refereeBResult.submittedAt,
          finalResults: refereeBResult.rawResults
        } : null
      } : null,
      statistics: {
        totalPool,
        totalBets,
        participantCount
      }
    };
  }

  async createRace(tournamentId, { name, maxEntries, scheduledAt, registrationDeadline }) {
    const tournament = await prisma.tournament.findUnique({ where: { tournamentId }, select: { tournamentId: true, status: true } });
    if (!tournament) throw httpError('Tournament not found', 404);

    // Auto-populate entries: lấy tất cả (horseId, jockeyId) đã tham gia races khác
    // trong cùng tournament, rồi tạo entries PENDING cho race mới
    const existingEntries = await prisma.raceEntry.findMany({
      where: {
        race: { tournamentId },
      },
      select: { horseId: true, jockeyId: true },
      distinct: ['horseId', 'jockeyId'],
    });

    const race = await prisma.race.create({
      data: {
        tournamentId,
        name,
        maxEntries: maxEntries ?? 8,
        scheduledAt: scheduledAt ?? null,
        registrationDeadline: registrationDeadline ?? null,
        status: 'SCHEDULED',
        entries: existingEntries.length > 0 ? {
          createMany: {
            data: existingEntries.map(e => ({
              horseId: e.horseId,
              jockeyId: e.jockeyId ?? null,
              status: 'PENDING',
            })),
            skipDuplicates: true, // bỏ qua nếu (raceId, horseId) đã tồn tại
          }
        } : undefined,
      },
      select: adminRaceSelect(),
    });

    return race;
  }

  async updateRace(raceId, { name, maxEntries, scheduledAt, registrationDeadline }) {
    const existing = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, tournamentId: true, status: true },
    });

    if (!existing) throw httpError('Race not found', 404);
    if (existing.status === 'FINISHED' || existing.status === 'CANCELLED') {
      throw httpError('Cannot update a FINISHED or CANCELLED race', 409);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (maxEntries !== undefined) updateData.maxEntries = maxEntries;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;
    if (registrationDeadline !== undefined) updateData.registrationDeadline = registrationDeadline;

    return prisma.race.update({
      where: { raceId },
      data: updateData,
      select: adminRaceSelect(),
    });
  }

 async listRaceEntries(raceId, { status } = {}) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, name: true, maxEntries: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const where = { raceId };
    if (status) where.status = status;

    const entriesData = await prisma.raceEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        entryId: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        horse: {
          select: {
            horseId: true,
            name: true,
            breed: true,
            color: true,
            dateOfBirth: true,
            owner: { select: { userId: true, fullName: true, email: true } },
          },
        },
        jockey: {
          select: { userId: true, fullName: true, email: true },
        },
        odds: {
          select: { oddsFinal: true },
        },
      },
    });

    const mappedEntries = entriesData.map((e) => ({
      entryId: e.entryId,
      horseId: e.horse.horseId,
      horseName: e.horse.name,
      horse: {
        name: e.horse.name,
        breed: e.horse.breed || 'Unknown',
        color: e.horse.color || 'Unknown',
        dateOfBirth: e.horse.dateOfBirth
      },
      jockeyId: e.jockey?.userId,
      jockeyName: e.jockey?.fullName || 'N/A',
      ownerId: e.horse.owner?.userId,
      ownerName: e.horse.owner?.fullName || 'N/A',
      ownerEmail: e.horse.owner?.email || 'N/A',
      gate: e.entryId, // Dùng entryId làm gate mặc định
      status: e.status,
      oddsFinal: e.odds?.[0] ? Number(e.odds[0].oddsFinal) : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      rejectionReason: e.rejectionReason
    }));

    return { entries: mappedEntries };
  }

  async bulkReviewEntries(raceId, reviews, reviewerId) {
    const race = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, maxEntries: true },
    });
    if (!race) throw httpError('Race not found', 404);

    const results = [];
    const errors = [];
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const review of reviews) {
        const { entryId, status, reason } = review;

        if (status === 'APPROVED') {
          const approvedCount = await tx.raceEntry.count({
            where: { raceId, status: 'APPROVED' },
          });
          if (approvedCount >= race.maxEntries) {
            errors.push({
              entryId,
              error: `Race has reached its maximum of ${race.maxEntries} entries.`,
            });
            continue;
          }
        }

        const existing = await tx.raceEntry.findUnique({
          where: { entryId },
          select: { entryId: true, raceId: true, status: true },
        });

        if (!existing || existing.raceId !== raceId) {
          errors.push({ entryId, error: 'Entry not found or not in this race.' });
          continue;
        }
        if (existing.status !== 'PENDING') {
          errors.push({ entryId, error: `Entry is already ${existing.status}.` });
          continue;
        }

        const now = new Date();
        const data =
          status === 'APPROVED'
            ? {
                status: 'APPROVED',
                rejectionReason: null,
                reviewedById: reviewerId,
                reviewedAt: now,
              }
            : {
                status: 'REJECTED',
                rejectionReason: reason || null,
                reviewedById: reviewerId,
                reviewedAt: now,
              };

        await tx.raceEntry.update({ where: { entryId }, data });
        
        results.push({ entryId, status: data.status });
        updated++;

        // Bắn sự kiện socket realtime tới những người đang xem trận đấu
        socketEmitter.emitToRace(raceId, 'entry:status_changed', {
          entryId: entryId,
          raceId: raceId,
          oldStatus: existing.status,
          newStatus: data.status,
          updatedAt: now.toISOString()
        });
      }
    });

    if (errors.length > 0) {
      console.warn('Bulk review warnings:', errors);
    }

    // Định dạng response chuẩn xác theo PROCESS.md
    return { results, updated };
  }

  async deleteRace(raceId) {
    const existing = await prisma.race.findUnique({
      where: { raceId },
      select: { raceId: true, status: true },
    });

    if (!existing) throw httpError('Race not found', 404);

    const entriesCount = await prisma.raceEntry.count({ where: { raceId } });
    if (entriesCount > 0) {
      throw httpError('Cannot delete race because it has entries. Cancel the race instead.', 409);
    }

    const predictionsCount = await prisma.prediction.count({ where: { raceId } });
    if (predictionsCount > 0) {
      throw httpError('Cannot delete race because it has predictions. Cancel the race instead.', 409);
    }

    await prisma.race.delete({ where: { raceId } });
    return { action: 'DELETED' };
  }

  /**
   * Lấy danh sách toàn bộ Race (Có phân trang)
   * HOẶC lấy tất cả không phân trang nếu pageSize = -1
   */
  async listAllRaces({ page = 1, pageSize = 50, status } = {}) {
    const skip = (page - 1) * pageSize;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    let races;
    if (pageSize === -1) {
      // Lấy tất cả không phân trang (cho AdminRaceStagePage)
      const allRaces = await prisma.race.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        include: {
          refereeA: { select: { userId: true, fullName: true } },
          refereeB: { select: { userId: true, fullName: true } },
          _count: { select: { entries: { where: { status: 'APPROVED' } } } }
        }
      });
      races = allRaces.map(r => ({
        ...r,
        refereeAId: r.refereeA?.userId,
        refereeBId: r.refereeB?.userId,
        approvedEntriesCount: r._count.entries
      }));
      return { races };
    }

    const [total, paginatedRaces] = await prisma.$transaction([
      prisma.race.count({ where }),
      prisma.race.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { scheduledAt: 'asc' },
        include: {
          refereeA: { select: { userId: true, fullName: true } },
          refereeB: { select: { userId: true, fullName: true } },
          _count: { select: { entries: { where: { status: 'APPROVED' } } } }
        }
      })
    ]);

    races = paginatedRaces.map(r => ({
      ...r,
      refereeAId: r.refereeA?.userId,
      refereeBId: r.refereeB?.userId,
      approvedEntriesCount: r._count.entries
    }));

    return { total, page: parseInt(page), pageSize: parseInt(pageSize), races };
  }

  /**
   * CRITICAL-6: Đóng/Mở cổng đăng ký ngựa (Registration Gate)
   */
  async updateRegistrationGate(raceId, isOpen) {
    const race = await prisma.race.update({
      where: { raceId: parseInt(raceId) },
      data: { registrationOpen: isOpen }
    });
    
    // Bắn socket báo cho Frontend biết cổng cược đã thay đổi
    const socketEmitter = require('../socket/emitter');
    socketEmitter.emitToRace(raceId, 'race:updated', { 
      raceId: race.raceId, 
      registrationOpen: race.registrationOpen 
    });

    return race;
  }

  /**
   * CRITICAL-7: Phân công 2 trọng tài cho trận đấu
   */
  async assignReferees(raceId, refereeAId, refereeBId) {
  if (refereeAId === refereeBId) {
    throw Object.assign(new Error('Hai trọng tài phải là hai người khác nhau'), { status: 400 });
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

    const race = await prisma.race.update({
      where: { raceId: parseInt(raceId) },
      data: { 
        refereeAId: parseInt(refereeAId), 
        refereeBId: parseInt(refereeBId) 
      },
      include: {
        refereeA: { select: { fullName: true, email: true } },
        refereeB: { select: { fullName: true, email: true } }
      }
    });

    return race;
  }
}

module.exports = new AdminRacesService();
