const prisma = require('../config/prisma');
const notificationService = require('./notifications');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class AdminRefereeService {
  /**
   * Validate 2 referee tồn tại + có role RACE_REFEREE.
   * Trả về danh sách 2 record referee.
   */
  async _assertRefereesValid(refereeAId, refereeBId, tx) {
    const client = tx || prisma;
    const a = parseInt(refereeAId);
    const b = parseInt(refereeBId);
    if (!Number.isInteger(a) || a <= 0 || !Number.isInteger(b) || b <= 0) {
      throw httpError('Mã trọng tài không hợp lệ', 400);
    }
    if (a === b) {
      throw httpError('Trọng tài A và B phải khác nhau', 400);
    }
    const referees = await client.user.findMany({
      where: { userId: { in: [a, b] } },
      include: { role: true },
    });
    if (referees.length < 2) {
      throw httpError('Một hoặc cả hai trọng tài được chỉ dạy không tồn tại trên hệ thống.', 404);
    }
    const invalid = referees.find((u) => u.role.code !== 'RACE_REFEREE');
    if (invalid) {
      throw httpError(
        `Người dùng "${invalid.fullName}" (id: ${invalid.userId}) không có vai trò RACE_REFEREE, không thể phân công làm trọng tài.`,
        400,
      );
    }
    return { refereeA: referees.find((u) => u.userId === a), refereeB: referees.find((u) => u.userId === b) };
  }

  /**
   * Gán 2 trọng tài cho tất cả race trong tournament (lặp qua race-level).
   * Race không đủ điều kiện (FINISHED/CANCELLED, ...) sẽ bị skip.
   *
   * Hành vi mới:
   *  - Validate 2 referee TRƯỚC khi loop race.
   *  - Nếu tournament chưa có race → vẫn tạo notification 'RACE_ASSIGNED' "pre-assignment"
   *    để referee biết trước. Các race tạo về sau sẽ nhận thông báo riêng khi
   *    RaceCreateFormModal gọi assignReferees riêng lẻ.
   *  - Nếu có race → assign vào từng race (logic cũ).
   */
  async assignRefereesToTournament(tournamentId, refereeAId, refereeBId) {
    const tournament = await prisma.tournament.findUnique({
      where: { tournamentId: parseInt(tournamentId) },
      include: {
        races: { select: { raceId: true, status: true, name: true } },
      },
    });

    if (!tournament) throw httpError('Tournament not found', 404);

    // Validate trọng tài sớm để tránh loop rỗi với input lỗi
    await this._assertRefereesValid(refereeAId, refereeBId);

    const results = [];
    const errors = [];

    for (const race of tournament.races) {
      try {
        const updated = await this.assignRefereesToRace(race.raceId, refereeAId, refereeBId);
        results.push({ raceId: race.raceId, success: true, race: updated });
      } catch (err) {
        errors.push({ raceId: race.raceId, error: err.message });
      }
    }

    // Nếu tournament không có race, vẫn gửi notification pre-assignment
    // để referee biết họ sắp được phân công vào giải đấu này.
    let preAssignmentNotification = null;
    if (tournament.races.length === 0) {
      const a = parseInt(refereeAId);
      const b = parseInt(refereeBId);
      const tournamentName = tournament.name;

      preAssignmentNotification = await prisma.$transaction(async (tx) => {
        const created = [];
        // Trọng tài A
        const notifA = await tx.notification.create({
          data: {
            userId: a,
            type: 'RACE_ASSIGNED',
            title: 'Phân công trọng tài (Trọng tài A)',
            message: `Bạn vừa được đề cử làm Trọng tài A cho giải đấu "${tournamentName}". Thông báo sẽ được gửi lại khi có chặng đua cụ thể được tạo.`,
            payload: {
              tournamentId: parseInt(tournamentId),
              tournamentName,
              role: 'A',
              preAssignment: true,
            },
          },
        });
        created.push(notifA);

        // Trọng tài B
        const notifB = await tx.notification.create({
          data: {
            userId: b,
            type: 'RACE_ASSIGNED',
            title: 'Phân công trọng tài (Trọng tài B)',
            message: `Bạn vừa được đề cử làm Trọng tài B cho giải đấu "${tournamentName}". Thông báo sẽ được gửi lại khi có chặng đua cụ thể được tạo.`,
            payload: {
              tournamentId: parseInt(tournamentId),
              tournamentName,
              role: 'B',
              preAssignment: true,
            },
          },
        });
        created.push(notifB);
        return created;
      });

      // Socket emit (best effort) — không fail request khi socket chưa sẵn sàng
      try {
        const { emitToUser } = require('../socket/emitter');
        for (const notif of preAssignmentNotification) {
          emitToUser(notif.userId, 'notification:created', { notification: notif });
        }
      } catch (_socketErr) {
        // ignore
      }
    }

    return {
      tournamentId: parseInt(tournamentId),
      totalRaces: tournament.races.length,
      succeeded: results.length,
      failed: errors.length,
      results,
      errors,
      preAssignment: preAssignmentNotification
        ? { sent: preAssignmentNotification.length }
        : null,
    };
  }

  /**
   * Gán 2 trọng tài cho trận đấu
   * Khi phân công sẽ tạo Notification row cho mỗi referee + emit socket realtime.
   *
   * Lưu ý: tournamentId được truyền qua race.tournamentId trong notification payload
   * để frontend có thể group notification theo tournament.
   */
  async assignRefereesToRace(raceId, refereeAId, refereeBId) {
    const race = await prisma.race.findUnique({
      where: { raceId: parseInt(raceId) },
      include: {
        tournament: { select: { name: true, tournamentId: true } },
      },
    });

    if (!race) throw httpError('Trận đấu không tồn tại.', 404);
    if (race.status !== 'SCHEDULED') {
      throw httpError('Chỉ có thể phân công trọng tài khi trận đấu ở trạng thái SCHEDULED.', 409);
    }

    // Tái sử dụng helper — raises 400/404 cho role sai hoặc referee không tồn tại
    await this._assertRefereesValid(refereeAId, refereeBId);

    const newAId = parseInt(refereeAId);
    const newBId = parseInt(refereeBId);
    const previousAId = race.refereeAId;
    const previousBId = race.refereeBId;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRace = await tx.race.update({
        where: { raceId: parseInt(raceId) },
        data: {
          refereeAId: newAId,
          refereeBId: newBId
        }
      });

      // Tạo notification cho referee được phân công (chỉ khi referee thực sự thay đổi)
      if (newAId !== previousAId) {
        await notificationService.createNotificationsForRaceAssignment({
          raceId: parseInt(raceId),
          refereeAId: newAId,
          refereeBId: newBId,
          raceName: race.name,
          tournamentName: race.tournament?.name || '',
          tournamentId: race.tournament?.tournamentId,
          role: 'A',
          tx,
        });
      }
      if (newBId !== previousBId) {
        await notificationService.createNotificationsForRaceAssignment({
          raceId: parseInt(raceId),
          refereeAId: newAId,
          refereeBId: newBId,
          raceName: race.name,
          tournamentName: race.tournament?.name || '',
          tournamentId: race.tournament?.tournamentId,
          role: 'B',
          tx,
        });
      }

      return updatedRace;
    });

    return updated;
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

      // Tạo RaceResult từ finalResults
      const raceEntries = await tx.raceEntry.findMany({
        where: { raceId: parseInt(raceId) },
        select: { entryId: true, horseId: true }
      });
      const entryMap = Object.fromEntries(raceEntries.map(e => [e.entryId, e.horseId]));

      const raceResultsData = finalResults.map(item => ({
        raceId: parseInt(raceId),
        horseId: entryMap[item.entryId],
        finishPosition: item.rank
      })).filter(r => r.horseId != null);

      if (raceResultsData.length > 0) {
        await tx.raceResult.deleteMany({ where: { raceId: parseInt(raceId) } });
        await tx.raceResult.createMany({ data: raceResultsData });
      }

      // Chuyển sang FINISHED và trả về kết quả để emit socket
      const updatedRace = await tx.race.update({
        where: { raceId: parseInt(raceId) },
        data: { status: 'FINISHED' }
      });

      return {
        race: updatedRace,
        results: raceResultsData
      };
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
          race: {
            select: {
              name: true,
              raceId: true,
              refereeA: { select: { userId: true, fullName: true } },
              refereeB: { select: { userId: true, fullName: true } },
              refereeSubmissions: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, page: parseInt(page), pageSize: parseInt(pageSize), deviations };
  }

  async getDeviationDetail(resultId) {
    // Lấy official result và race
    const officialResult = await prisma.officialRaceResult.findUnique({
      where: { officialResultId: parseInt(resultId) },
      include: {
        race: {
          include: {
            refereeA: { select: { userId: true, fullName: true } },
            refereeB: { select: { userId: true, fullName: true } },
          }
        }
      }
    });
    if (!officialResult) throw httpError('Deviation not found', 404);

    // Lấy referee submissions
    const submissions = await prisma.refereeSubmission.findMany({
      where: { raceId: officialResult.raceId },
      orderBy: { submittedAt: 'asc' }
    });

    // Lấy entries với horse và jockey
    const entries = await prisma.raceEntry.findMany({
      where: { raceId: officialResult.raceId, status: 'APPROVED' },
      include: {
        horse: { select: { horseId: true, name: true } },
        jockey: { select: { userId: true, fullName: true } }
      }
    });

    return {
      ...officialResult,
      race: {
        ...officialResult.race,
        refereeSubmissions: submissions,
        entries: entries
      }
    };
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