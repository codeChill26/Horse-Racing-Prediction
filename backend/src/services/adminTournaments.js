// backend/src/services/adminTournaments.js

const prisma = require('../config/prisma');
const { emitToUser } = require('../socket/emitter');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const ALLOWED_TRANSITIONS = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['ONGOING', 'CANCELLED'],
  ONGOING: ['FINISHED', 'CANCELLED'],
  FINISHED: [],
  CANCELLED: [],
};

function assertTournamentEditable(status) {
  if (status === 'FINISHED') throw httpError('Tournament is FINISHED and cannot be modified.', 409);
  if (status === 'CANCELLED') throw httpError('Tournament is CANCELLED and cannot be modified.', 409);
}

function adminTournamentSelect() {
  return {
    tournamentId: true,
    name: true,
    description: true,
    status: true,
    cancelReason: true,
    startAt: true,
    endAt: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { races: true } },
  };
}

class AdminTournamentsService {
  async listTournaments({ status } = {}) {
    const where = status ? { status } : undefined;

    return prisma.tournament.findMany({
      where,
      orderBy: { tournamentId: 'desc' },
      select: adminTournamentSelect(),
    });
  }

  async getTournamentById(tournamentId) {
    const tournament = await prisma.tournament.findUnique({
      where: { tournamentId },
      select: adminTournamentSelect(),
    });

    if (!tournament) throw httpError('Tournament not found', 404);
    return tournament;
  }

  async createTournament(data) {
    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        status: 'DRAFT',
      },
      select: adminTournamentSelect(),
    });

    return tournament;
  }

  async updateTournament(tournamentId, data) {
    const existing = await prisma.tournament.findUnique({
      where: { tournamentId },
      select: { tournamentId: true, status: true },
    });

    if (!existing) throw httpError('Tournament not found', 404);
    assertTournamentEditable(existing.status);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startAt !== undefined) updateData.startAt = data.startAt;
    if (data.endAt !== undefined) updateData.endAt = data.endAt;

    return prisma.tournament.update({
      where: { tournamentId },
      data: updateData,
      select: adminTournamentSelect(),
    });
  }

  async changeStatus(tournamentId, { status: nextStatus, cancelReason }) {
    const existing = await prisma.tournament.findUnique({
      where: { tournamentId },
      select: { tournamentId: true, status: true },
    });

    if (!existing) throw httpError('Tournament not found', 404);

    if (existing.status === 'FINISHED') {
      throw httpError('Tournament is FINISHED and cannot change status.', 409);
    }
    if (existing.status === 'CANCELLED') {
      throw httpError('Tournament is CANCELLED and cannot change status.', 409);
    }

    if (existing.status === nextStatus) {
      return this.getTournamentById(tournamentId);
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw httpError(
        `Invalid status transition: ${existing.status} -> ${nextStatus}. Allowed: ${allowed.join(', ') || '(none)'}`,
        409
      );
    }

    if (nextStatus === 'CANCELLED') {
      if (!cancelReason) throw httpError('cancelReason is required when cancelling a tournament.', 400);
      return prisma.tournament.update({
        where: { tournamentId },
        data: { status: 'CANCELLED', cancelReason },
        select: adminTournamentSelect(),
      });
    }

    const updated = await prisma.tournament.update({
      where: { tournamentId },
      data: { status: nextStatus, cancelReason: null },
      select: adminTournamentSelect(),
    });

    // === Auto-notify horse owners khi chuyển sang OPEN ===
    // Đây là điểm vào duy nhất để broadcast "giải đấu đã mở đăng ký"
    // đến các chủ ngựa. Trước đây việc này nằm ở form tạo giải (manual),
    // dẫn đến nhiều trường hợp admin tạo xong rồi mở OPEN sau → horse owners
    // không nhận được thông báo.
    if (existing.status === 'DRAFT' && nextStatus === 'OPEN') {
      try {
        const defaultMessage =
          `Giải đấu "${updated.name}" đang mở đăng ký. ` +
          `Hãy đăng ký ngựa của bạn ngay!`;
        await this.notifyHorseOwners(tournamentId, { message: defaultMessage });
      } catch (notifyErr) {
        // Không fail transaction đổi status vì lý do notify — chỉ log
        console.warn(
          `[adminTournaments] auto-notify horse owners failed for tournament ${tournamentId}:`,
          notifyErr.message,
        );
      }
    }

    return updated;
  }

  async deleteTournament(tournamentId, { reason } = {}) {
    const existing = await prisma.tournament.findUnique({
      where: { tournamentId },
      select: { tournamentId: true, status: true, cancelReason: true },
    });

    if (!existing) throw httpError('Tournament not found', 404);

    if (existing.status === 'FINISHED') {
      throw httpError('Tournament is FINISHED and cannot be deleted/cancelled.', 409);
    }

    const racesCount = await prisma.race.count({ where: { tournamentId } });

    if (racesCount > 0) {
      // Cannot delete: must cancel with reason
      const finalReason = reason ?? existing.cancelReason;
      if (!finalReason) {
        throw httpError('This tournament contains races. Provide { reason } to cancel instead of deleting.', 400);
      }

      const cancelled = await prisma.tournament.update({
        where: { tournamentId },
        data: { status: 'CANCELLED', cancelReason: finalReason },
        select: adminTournamentSelect(),
      });

      return { action: 'CANCELLED', tournament: cancelled };
    }

    // Hard delete allowed when no races
    await prisma.tournament.delete({ where: { tournamentId } });
    return { action: 'DELETED' };
  }

  async notifyHorseOwners(tournamentId, { message }) {
    const tournament = await prisma.tournament.findUnique({
      where: { tournamentId },
      select: {
        tournamentId: true,
        name: true,
        status: true,
      },
    });

    if (!tournament) throw httpError('Tournament not found', 404);

    // Find the Horse Owner role. `seed.js` inserts role with code 'HORSE_OWNER',
    // so we query by that canonical code rather than the display name.
    const horseOwnerRole = await prisma.role.findUnique({
      where: { code: 'HORSE_OWNER' },
      select: { roleId: true },
    });

    if (!horseOwnerRole) {
      throw httpError("Role 'HORSE_OWNER' not found in system", 500);
    }

    // Fetch all active Horse Owners
    const owners = await prisma.user.findMany({
      where: {
        roleId: horseOwnerRole.roleId,
        isActive: true,
      },
      select: { userId: true },
    });

    if (owners.length === 0) {
      return { notified: 0, tournamentId, message };
    }

    const title = `Giải đấu "${tournament.name}" đang mở đăng ký`;
    const payload = {
      tournamentId: tournament.tournamentId,
      name: tournament.name,
      status: tournament.status,
    };

    // Capture the insert moment so we can query back only the rows we just wrote.
    const insertedAt = new Date();

    const result = await prisma.notification.createMany({
      data: owners.map((o) => ({
        userId: o.userId,
        type: 'TOURNAMENT_OPEN',
        title,
        message,
        payload,
      })),
    });

    // Emit realtime socket events to each owner so the bell lights up immediately.
    const created = await prisma.notification.findMany({
      where: {
        userId: { in: owners.map((o) => o.userId) },
        type: 'TOURNAMENT_OPEN',
        createdAt: { gte: insertedAt },
      },
      select: {
        notificationId: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        payload: true,
        read: true,
        createdAt: true,
      },
    });
    for (const notif of created) {
      emitToUser(notif.userId, 'notification:new', {
        id: notif.notificationId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        payload: notif.payload,
        isRead: notif.read,
        createdAt: notif.createdAt,
      });
    }

    return {
      notified: result.count,
      tournamentId,
      message,
    };
  }

  /**
   * Lấy tất cả RaceEntry thuộc các Race trong Tournament (dùng cho admin populate race).
   * Trả về entries đang PENDING hoặc APPROVED.
   */
  async getTournamentEntries(tournamentId) {
    const tournament = await prisma.tournament.findUnique({
      where: { tournamentId },
      select: { tournamentId: true },
    });
    if (!tournament) throw httpError('Tournament not found', 404);

    const entries = await prisma.raceEntry.findMany({
      where: {
        race: { tournamentId },
      },
      orderBy: [{ raceId: 'asc' }, { entryId: 'asc' }],
      select: {
        entryId: true,
        raceId: true,
        horseId: true,
        jockeyId: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        horse: {
          select: {
            horseId: true,
            name: true,
            horseCode: true,
            ownerUserId: true,
          },
        },
        jockey: {
          select: {
            userId: true,
            fullName: true,
            licenseNumber: true,
            weight: true,
          },
        },
        race: {
          select: {
            raceId: true,
            name: true,
            raceNumber: true,
            scheduledStart: true,
            status: true,
          },
        },
      },
    });

    return entries;
  }
}

module.exports = new AdminTournamentsService();
