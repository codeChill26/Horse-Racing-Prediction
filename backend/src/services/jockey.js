// backend/src/services/jockey.js

const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const notificationService = require('./notifications');
const socketEmitter = require('../socket/emitter');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function formatInvitationCode(id) {
  return `INV-${String(id).padStart(3, '0')}`;
}

class JockeyService {
  // ============================================================
  // PROFILE
  // ============================================================

  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phoneNumber: true,
        licenseNumber: true,
        weight: true,
        bio: true,
        isProfileComplete: true,
        role: { select: { code: true, name: true } },
      },
    });

    if (!user) throw httpError('User not found', 404);

    const careerStats = await this._computeCareerStats(userId);

    const [activeInvitations, assignedRaces] = await Promise.all([
      prisma.jockeyInvitation.count({
        where: { jockeyId: userId, status: 'PENDING' },
      }),
      prisma.raceEntry.count({
        where: { jockeyId: userId, status: 'APPROVED' },
      }),
    ]);

    return {
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        phone: user.phoneNumber,
        roleCode: user.role?.code || 'JOCKEY',
      },
      profile: {
        licenseNumber: user.licenseNumber,
        weight: user.weight ? Number(user.weight) : null,
        bio: user.bio,
        isProfileComplete: user.isProfileComplete,
      },
      careerStats,
      activeInvitations,
      assignedRaces,
    };
  }

  async updateProfile(userId, data) {
    const updateData = {};

    if (data.phone !== undefined) updateData.phoneNumber = data.phone;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
    if (data.bio !== undefined) updateData.bio = String(data.bio).trim();
    if (data.avatarUrl !== undefined) updateData.avatarUrl = String(data.avatarUrl).trim();

    const current = await prisma.user.findUnique({
      where: { userId },
      select: { licenseNumber: true, weight: true },
    });
    if (!current) throw httpError('User not found', 404);

    const finalLicense = current.licenseNumber;
    const finalWeight = current.weight;
    updateData.isProfileComplete = !!finalLicense && !!finalWeight;

    const updated = await prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        licenseNumber: true,
        weight: true,
        dateOfBirth: true,
        isProfileComplete: true,
        phoneNumber: true,
      },
    });

    return {
      licenseNumber: updated.licenseNumber,
      weight: updated.weight ? Number(updated.weight) : null,
      dateOfBirth: updated.dateOfBirth,
      isProfileComplete: updated.isProfileComplete,
      phone: updated.phoneNumber,
    };
  }

  // ============================================================
  // CAREER STATS (internal helper)
  // ============================================================

  async _computeCareerStats(jockeyId) {
    const entries = await prisma.raceEntry.findMany({
      where: { jockeyId, status: 'APPROVED' },
      select: { entryId: true, raceId: true, horseId: true },
    });

    if (entries.length === 0) {
      return { totalStarts: 0, wins: 0, winRate: 0, topThreeRate: 0, earnings: 0 };
    }

    const results = await prisma.raceResult.findMany({
      where: {
        OR: entries.map((e) => ({ raceId: e.raceId, horseId: e.horseId })),
      },
      select: { finishPosition: true },
    });

    const totalStarts = results.length;
    const wins = results.filter((r) => r.finishPosition === 1).length;
    const topThree = results.filter((r) => r.finishPosition >= 1 && r.finishPosition <= 3).length;

    return {
      totalStarts,
      wins,
      winRate: totalStarts === 0 ? 0 : round2((wins / totalStarts) * 100),
      topThreeRate: totalStarts === 0 ? 0 : round2((topThree / totalStarts) * 100),
      earnings: 0,
    };
  }

  // ============================================================
  // INVITATIONS
  // ============================================================

  async getInvitations(jockeyId, { status, page, pageSize, skip, take }) {
    const where = { jockeyId };
    if (status && ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'CONFIRMED'].includes(status)) {
      where.status = status;
    }

    const [invitations, total, pendingCount] = await Promise.all([
      prisma.jockeyInvitation.findMany({
        where,
        include: {
          race: { select: { raceId: true, name: true, scheduledAt: true } },
          tournament: { select: { name: true } },
          horse: { select: { horseId: true, name: true, breed: true, color: true } },
          owner: { select: { userId: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.jockeyInvitation.count({ where }),
      prisma.jockeyInvitation.count({ where: { jockeyId, status: 'PENDING' } }),
    ]);

    return {
      invitations: invitations.map((inv) => ({
        invitationId: formatInvitationCode(inv.invitationId),
        raceId: inv.raceId,
        raceName: inv.race?.name || null,
        raceScheduledAt: inv.race?.scheduledAt || null,
        tournamentName: inv.tournament?.name || null,
        horseId: inv.horseId,
        horseName: inv.horse?.name || null,
        horseBreed: inv.horse?.breed || null,
        horseColor: inv.horse?.color || null,
        ownerId: inv.ownerId,
        ownerName: inv.owner?.fullName || null,
        status: inv.status,
        declineReason: inv.declineReason,
        sentAt: inv.createdAt,
        respondedAt: inv.updatedAt,
      })),
      total,
      pendingCount,
      page,
      pageSize,
    };
  }

  async respondInvitation(jockeyId, invitationId, data) {
    if (!Number.isInteger(invitationId) || invitationId <= 0) {
      throw httpError('Invalid invitationId', 400);
    }

    const invitation = await prisma.jockeyInvitation.findUnique({ where: { invitationId } });
    if (!invitation) throw httpError('Invitation not found', 404);
    if (invitation.jockeyId !== jockeyId) {
      throw httpError('You are not authorized to respond to this invitation', 403);
    }
    if (invitation.status !== 'PENDING') {
      throw httpError('This invitation has already been processed', 409);
    }

    const updated = await prisma.jockeyInvitation.update({
      where: { invitationId },
      data: {
        status: data.status,
        declineReason: data.declineReason,
      },
    });

    const eventName = data.status === 'ACCEPTED' ? 'invitation:accepted' : 'invitation:declined';
    socketEmitter.emitToUser(updated.ownerId, eventName, { invitation: updated });

    if (data.status === 'ACCEPTED') {
      try {
        await notificationService.createNotification({
          userId: jockeyId,
          type: 'INVITATION_ACCEPTED',
          title: 'Bạn đã chấp nhận lời mời',
          message: `Bạn đã chấp nhận lời mời tham gia giải đấu.`,
          payload: { invitationId: updated.invitationId, status: 'ACCEPTED' },
        });
      } catch (e) {
        // ignore notification error
      }
    }

    return {
      invitation: {
        invitationId: formatInvitationCode(updated.invitationId),
        status: updated.status,
        declineReason: updated.declineReason,
        respondedAt: updated.updatedAt,
      },
    };
  }

  // ============================================================
  // ASSIGNED RACES
  // ============================================================

  async getAssignedRaces(jockeyId, { status, skip, take }) {
    const where = { jockeyId };
    if (status && ['SCHEDULED', 'IN_PROGRESS', 'PENDING_RESULT', 'FINISHED', 'CANCELLED'].includes(status)) {
      where.race = { status };
    }

    const [entries, total] = await Promise.all([
      prisma.raceEntry.findMany({
        where,
        include: {
          race: {
            select: {
              raceId: true,
              name: true,
              scheduledAt: true,
              status: true,
              tournament: { select: { name: true } },
            },
          },
          horse: { select: { horseId: true, name: true, breed: true } },
        },
        orderBy: { race: { scheduledAt: 'asc' } },
        skip,
        take,
      }),
      prisma.raceEntry.count({ where }),
    ]);

    return {
      races: entries.map((entry) => ({
        raceId: entry.race.raceId,
        raceName: entry.race.name,
        tournamentName: entry.race.tournament?.name || null,
        scheduledAt: entry.race.scheduledAt,
        status: entry.race.status,
        horse: {
          horseId: entry.horse.horseId,
          name: entry.horse.name,
          breed: entry.horse.breed,
        },
        gate: entry.entryId,
        entryStatus: entry.status,
      })),
      total,
    };
  }

  // ============================================================
  // RACE HISTORY
  // ============================================================

  async getRaceHistory(jockeyId) {
    const entries = await prisma.raceEntry.findMany({
      where: {
        jockeyId,
        race: { status: 'FINISHED' },
      },
      include: {
        race: {
          select: {
            raceId: true,
            name: true,
            scheduledAt: true,
            publishedAt: true,
            tournament: { select: { name: true } },
          },
        },
        horse: { select: { horseId: true, name: true } },
        results: {
          select: { finishPosition: true },
          take: 1,
        },
      },
      orderBy: { race: { publishedAt: 'desc' } },
    });

    return {
      history: entries.map((entry) => {
        const result = entry.results && entry.results[0];
        return {
          raceId: entry.race.raceId,
          raceName: entry.race.name,
          tournamentName: entry.race.tournament?.name || null,
          scheduledAt: entry.race.scheduledAt,
          finishedAt: entry.race.publishedAt,
          horse: {
            horseId: entry.horse.horseId,
            name: entry.horse.name,
          },
          gate: entry.entryId,
          finishPosition: result ? result.finishPosition : null,
          resultStatus: result ? 'FINISHED' : 'UNKNOWN',
          earnings: 0,
        };
      }),
    };
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  async getNotifications(userId, { isRead, skip, take }) {
    const where = { userId };
    if (isRead === true) where.read = true;
    if (isRead === false) where.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        notificationId: `NOTIF-${String(n.notificationId).padStart(3, '0')}`,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.payload,
        isRead: n.read,
        createdAt: n.createdAt,
        readAt: n.readAt,
      })),
      total,
      unreadCount,
    };
  }

  async markNotificationRead(userId, notificationId) {
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw httpError('Invalid notificationId', 400);
    }

    const notif = await prisma.notification.findUnique({ where: { notificationId } });
    if (!notif) throw httpError('Notification not found', 404);
    if (notif.userId !== userId) {
      throw httpError('Not authorized to mark this notification', 403);
    }

    if (notif.read) {
      return {
        notificationId: `NOTIF-${String(notif.notificationId).padStart(3, '0')}`,
        isRead: true,
        readAt: notif.readAt,
      };
    }

    const updated = await prisma.notification.update({
      where: { notificationId },
      data: { read: true, readAt: new Date() },
    });

    return {
      notificationId: `NOTIF-${String(updated.notificationId).padStart(3, '0')}`,
      isRead: true,
      readAt: updated.readAt,
    };
  }
}

module.exports = new JockeyService();
