// backend/src/services/jockeyInvitation.js
const prisma = require('../config/prisma');
const { emitToUser, emitToAdmin } = require('../socket/emitter');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

class JockeyInvitationService {
  
  async _attachJockeyStats(jockey) {
    const entries = await prisma.raceEntry.findMany({
      where: { jockeyId: jockey.userId, status: 'APPROVED' },
      select: { entryId: true, raceId: true, horseId: true },
    });

    if (entries.length === 0) {
      return { ...jockey, careerStats: { totalStarts: 0, wins: 0, winRate: 0 } };
    }

    const results = await prisma.raceResult.findMany({
      where: {
        OR: entries.map((e) => ({ raceId: e.raceId, horseId: e.horseId })),
      },
      select: { finishPosition: true },
    });

    const totalStarts = results.length;
    const wins = results.filter((r) => r.finishPosition === 1).length;

    return {
      ...jockey,
      careerStats: {
        totalStarts,
        wins,
        winRate: totalStarts === 0 ? 0 : round2((wins / totalStarts) * 100),
      },
    };
  }

  // TASK 1: Tìm kiếm Jockey nâng cao (Chỉ lấy người đã hoàn thiện hồ sơ hoàn chỉnh)
  async searchJockeys(query) {
    const { name } = query;
    const jockeys = await prisma.user.findMany({
      where: {
        role: { code: 'JOCKEY' },
        isActive: true,
        isProfileComplete: true, // Ép điều kiện lọc: Đầy đủ LicenseNumber và Weight
        fullName: name ? { contains: name, mode: 'insensitive' } : undefined
      },
      select: {
        userId: true, email: true, fullName: true, phoneNumber: true,
        avatarUrl: true, licenseNumber: true, weight: true, bio: true
      }
    });

    return Promise.all(jockeys.map((j) => this._attachJockeyStats(j)));
  }

  // TASK 2: API gửi lời mời (Horse Owner -> Jockey)
  // NEW: Mời theo giải đấu - ngựa + jockey sẽ tham gia TẤT CẢ các chặng đua trong giải
  async sendInvitation(ownerId, data) {
    const { jockeyId, horseId, tournamentId, raceId } = data;

    // Kiểm tra Tournament tồn tại và đang mở/đang diễn ra
    const tournament = await prisma.tournament.findUnique({
      where: { tournamentId },
      select: { tournamentId: true, status: true, name: true }
    });
    if (!tournament) throw httpError('Tournament not found', 404);
    if (tournament.status !== 'OPEN' && tournament.status !== 'ONGOING') {
      throw httpError('Cannot send invitation. This tournament is not accepting registrations.', 409);
    }

    // Kiểm tra Horse thuộc về owner
    const horse = await prisma.horse.findUnique({
      where: { horseId },
      select: { horseId: true, ownerId: true, status: true }
    });
    if (!horse) throw httpError('Horse not found', 404);
    if (horse.ownerId !== ownerId) throw httpError('You do not own this horse', 403);
    if (horse.status !== 'APPROVED') throw httpError('Horse is not approved', 400);

    // Kiểm tra xem lời mời đã tồn tại chưa (theo tournament thay vì race)
    const existing = await prisma.jockeyInvitation.findUnique({
      where: {
        jockeyId_horseId_tournamentId: {
          jockeyId,
          horseId,
          tournamentId
        }
      }
    });
    if (existing) throw httpError('Bạn đã gửi lời mời cho kỵ sĩ này với cùng ngựa trong giải đấu này.', 409);

    const invitation = await prisma.jockeyInvitation.create({
      data: {
        ownerId,
        jockeyId,
        horseId,
        tournamentId,
        raceId: raceId || null, // raceId có thể null - nghĩa là đăng ký cho tất cả race
        status: 'PENDING'
      }
    });

    emitToUser(jockeyId, 'invitation:received', { invitation });

    return invitation;
  }

  // API Xem hộp thư Inbox / Outbox
  // Trả thêm entriesCount để FE biết invitation đã có RaceEntry từ lúc accept hay chưa.
  async getInvitations(userId, roleCode, filterStatus) {
    const validStatuses = ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'CONFIRMED'];
    const whereClause = {};
    if (filterStatus && filterStatus !== 'ALL' && validStatuses.includes(String(filterStatus))) {
      whereClause.status = filterStatus;
    }
    if (roleCode === 'JOCKEY') whereClause.jockeyId = userId;
    else whereClause.ownerId = userId;

    const invitations = await prisma.jockeyInvitation.findMany({
      where: whereClause,
      include: {
        race: true,
        tournament: true,
        horse: true,
        jockey: { select: { fullName: true, email: true } },
        owner: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Tính entriesCount: số RaceEntry đã tồn tại cho (horseId + jockeyId) trong các race của tournament.
    // Query 1 lần rồi group theo (horseId, jockeyId) để tránh N+1.
    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        if (!inv.tournamentId) return { ...inv, entriesCount: 0 };
        const raceIds = await prisma.race.findMany({
          where: { tournamentId: inv.tournamentId },
          select: { raceId: true }
        });
        const ids = raceIds.map((r) => r.raceId);
        if (ids.length === 0) return { ...inv, entriesCount: 0 };
        const count = await prisma.raceEntry.count({
          where: {
            raceId: { in: ids },
            horseId: inv.horseId,
            jockeyId: inv.jockeyId
          }
        });
        return { ...inv, entriesCount: count };
      })
    );

    return enriched;
  }

  // Helper: Tạo RaceEntry cho tất cả race trong tournament mà jockey có thể tham gia.
  // Idempotent: bỏ qua race nếu cổng đóng / status không hợp lệ / entry đã tồn tại.
  async _createEntriesForInvitation(invitation) {
    const racesInTournament = await prisma.race.findMany({
      where: { tournamentId: invitation.tournamentId },
      select: { raceId: true, registrationOpen: true, status: true }
    });

    if (racesInTournament.length === 0) return [];

    const createdEntries = [];

    for (const race of racesInTournament) {
      if (!race.registrationOpen) {
        console.warn(`[auto-entry] Race ${race.raceId} gate closed, skip`);
        continue;
      }
      if (race.status !== 'SCHEDULED' && race.status !== 'PENDING_RESULT') {
        console.warn(`[auto-entry] Race ${race.raceId} not registrable (${race.status}), skip`);
        continue;
      }

      // Guard idempotent theo (raceId, horseId) và (raceId, jockeyId)
      const existingByHorse = await prisma.raceEntry.findUnique({
        where: { raceId_horseId: { raceId: race.raceId, horseId: invitation.horseId } }
      });
      if (existingByHorse) continue;

      const existingByJockey = await prisma.raceEntry.findUnique({
        where: { raceId_jockeyId: { raceId: race.raceId, jockeyId: invitation.jockeyId } }
      });
      if (existingByJockey) continue;

      try {
        const entry = await prisma.raceEntry.create({
          data: {
            raceId: race.raceId,
            horseId: invitation.horseId,
            jockeyId: invitation.jockeyId,
            status: 'APPROVED'
          }
        });
        createdEntries.push(entry);
        emitToAdmin('entry:created', { entry, tournamentId: invitation.tournamentId });
      } catch (err) {
        // Unique constraint conflict -> entry đã tồn tại, bỏ qua
        console.warn(`[auto-entry] Race ${race.raceId} entry may exist:`, err.message);
      }
    }

    return createdEntries;
  }

  // API Jockey phản hồi (Accepted / Declined)
  // Khi ACCEPTED sẽ tự động tạo RaceEntry cho tất cả race trong tournament
  // đang mở cổng — admin không cần chờ owner bấm "Xác nhận" thủ công.
  async respondInvitation(jockeyId, invitationId, data) {
    const invitation = await prisma.jockeyInvitation.findUnique({ where: { invitationId } });
    if (!invitation) throw httpError('Invitation not found', 404);
    if (invitation.jockeyId !== jockeyId) throw httpError('You are not authorized to respond to this invitation', 403);
    if (invitation.status !== 'PENDING') throw httpError('This invitation has already been processed', 409);

    const updated = await prisma.jockeyInvitation.update({
      where: { invitationId },
      data: {
        status: data.status,
        declineReason: data.status === 'DECLINED' ? data.declineReason : null
      }
    });

    const eventName = data.status === 'ACCEPTED' ? 'invitation:accepted' : 'invitation:declined';
    emitToUser(updated.ownerId, eventName, { invitation: updated });

    let entries = [];
    if (data.status === 'ACCEPTED') {
      try {
        entries = await this._createEntriesForInvitation(updated);
      } catch (err) {
        console.error('[auto-entry] Failed to create entries on accept:', err.message);
        // Không throw — vẫn trả về invitation đã accept, owner có thể bấm Xác nhận lại
      }
    }

    return { ...updated, entries };
  }

  // TASK 3: CHỐT JOCKEY & TỰ ĐỘNG TẠO ENTRY CHO TẤT CẢ RACE TRONG TOURNAMENT
  // Idempotent — bỏ qua race đã có entry. Có thể gọi sau khi accept để retry
  // những race trước đó bị skip do cổng đóng.
  async confirmJockey(ownerId, invitationId) {
    const invitation = await prisma.jockeyInvitation.findUnique({
      where: { invitationId },
      include: { tournament: true }
    });

    if (!invitation) throw httpError('Invitation not found', 404);
    if (invitation.ownerId !== ownerId) throw httpError('You are not authorized to confirm this invitation', 403);
    if (invitation.status !== 'ACCEPTED' && invitation.status !== 'CONFIRMED') {
      throw httpError('You can only confirm a Jockey who has ACCEPTED your invitation', 409);
    }

    const racesInTournament = await prisma.race.findMany({
      where: { tournamentId: invitation.tournamentId },
      select: { raceId: true, registrationOpen: true, status: true }
    });

    if (racesInTournament.length === 0) {
      throw httpError('No races found in this tournament', 400);
    }

    const entries = await prisma.$transaction(async (tx) => {
      const createdEntries = [];

      for (const race of racesInTournament) {
        if (!race.registrationOpen) {
          console.warn(`Race ${race.raceId} registration gate is closed, skipping...`);
          continue;
        }
        if (race.status !== 'SCHEDULED' && race.status !== 'PENDING_RESULT') {
          console.warn(`Race ${race.raceId} is not in a registrable state (${race.status}), skipping...`);
          continue;
        }

        const jockeyBooked = await tx.raceEntry.findUnique({
          where: {
            raceId_jockeyId: { raceId: race.raceId, jockeyId: invitation.jockeyId }
          }
        });
        if (jockeyBooked) continue;

        try {
          const entry = await tx.raceEntry.create({
            data: {
              raceId: race.raceId,
              horseId: invitation.horseId,
              jockeyId: invitation.jockeyId,
              status: 'APPROVED'
            }
          });
          createdEntries.push(entry);
        } catch (err) {
          console.warn(`Entry for race ${race.raceId} may already exist:`, err.message);
        }
      }

      // Hủy các lời mời khác của cùng ngựa + jockey trong cùng tournament
      await tx.jockeyInvitation.updateMany({
        where: {
          tournamentId: invitation.tournamentId,
          horseId: invitation.horseId,
          jockeyId: invitation.jockeyId,
          invitationId: { not: invitationId },
          status: { in: ['PENDING', 'ACCEPTED'] }
        },
        data: { status: 'CANCELLED' }
      });

      // Đánh dấu CONFIRMED nếu chưa
      if (invitation.status !== 'CONFIRMED') {
        await tx.jockeyInvitation.update({
          where: { invitationId },
          data: { status: 'CONFIRMED' }
        });
      }

      return createdEntries;
    });

    for (const entry of entries) {
      emitToAdmin('entry:created', { entry, tournamentId: invitation.tournamentId });
    }
    emitToUser(invitation.jockeyId, 'invitation:confirmed', {
      invitationId,
      entries,
      tournament: invitation.tournament
    });

    return {
      message: `Đã xác nhận và tạo ${entries.length} entries cho tất cả chặng đua trong giải`,
      entries,
      tournamentName: invitation.tournament.name
    };
  }
}

module.exports = new JockeyInvitationService();