// backend/src/services/notifications.js
const prisma = require('../config/prisma');
const { emitToUser } = require('../socket/emitter');

class NotificationService {
  async createNotification({ userId, type, title, message, payload, tx }) {
    const client = tx || prisma;
    const notification = await client.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        payload: payload ?? undefined,
      },
    });

    // Realtime push — không fail request khi socket chưa sẵn sàng
    try {
      emitToUser(userId, 'notification:created', { notification });
    } catch (e) {
      // ignore
    }

    return notification;
  }

  async createNotificationsForRaceAssignment({ raceId, refereeAId, refereeBId, raceName, tournamentName, tournamentId, role, tx }) {
    const roleLabel = role === 'A' ? 'Trọng tài A' : 'Trọng tài B';
    const message = role === 'A'
      ? `Bạn vừa được phân công làm Trọng tài A cho chặng đua "${raceName}" thuộc giải đấu "${tournamentName}".`
      : `Bạn vừa được phân công làm Trọng tài B cho chặng đua "${raceName}" thuộc giải đấu "${tournamentName}".`;
    return this.createNotification({
      userId: role === 'A' ? refereeAId : refereeBId,
      type: 'RACE_ASSIGNED',
      title: `Phân công trọng tài (${roleLabel})`,
      message,
      payload: {
        raceId,
        ...(tournamentId !== undefined && { tournamentId }),
        tournamentName,
        raceName,
        role,
      },
      tx,
    });
  }

  async getMyNotifications(userId, { onlyUnread = false, limit = 50 } = {}) {
    return prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markRead(userId, notificationId) {
    const notif = await prisma.notification.findUnique({ where: { notificationId } });
    if (!notif) {
      const err = new Error('Notification not found');
      err.status = 404;
      throw err;
    }
    if (notif.userId !== userId) {
      const err = new Error('Not authorized to mark this notification');
      err.status = 403;
      throw err;
    }
    if (notif.read) return notif;
    return prisma.notification.update({
      where: { notificationId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  /**
   * Trọng tài phản hồi 1 phân công (accept / refuse).
   * Lưu response vào notification.payload để admin và referee thấy lại lịch sử.
   *
   * @param {number} userId - referee userId (từ token)
   * @param {number} notificationId - id của notification RACE_ASSIGNED
   * @param {'ACCEPTED'|'REFUSED'} response
   * @param {string} [reason]
   * @returns {Promise<Notification>}
   */
  async respondToAssignment(userId, notificationId, response, reason) {
    const notif = await prisma.notification.findUnique({ where: { notificationId } });
    if (!notif) {
      const err = new Error('Notification not found');
      err.status = 404;
      throw err;
    }
    if (notif.userId !== userId) {
      const err = new Error('Not authorized to respond to this notification');
      err.status = 403;
      throw err;
    }
    if (notif.type !== 'RACE_ASSIGNED') {
      const err = new Error('Only RACE_ASSIGNED notifications can be responded to');
      err.status = 400;
      throw err;
    }

    const previous = (notif.payload && typeof notif.payload === 'object') ? notif.payload : {};
    const next = {
      ...previous,
      response,
      responseAt: new Date().toISOString(),
      responseReason: reason || null,
    };

    return prisma.notification.update({
      where: { notificationId },
      data: {
        payload: next,
        read: true,
        readAt: notif.readAt || new Date(),
      },
    });
  }
}

module.exports = new NotificationService();