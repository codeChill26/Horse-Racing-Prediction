/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Spectator Notification Center — singleton store for spectator notifications.
 * Mirrors the pattern from mobile/lib/services/realtime/notification_center.dart
 * and follows the same structure as horseOwnerNotificationCenter.
 */

const listeners = new Set();

class SpectatorNotificationCenter {
  /** @type {AppNotification[]} */
  _notifications = [];

  get all() {
    return this._notifications;
  }

  get unreadCount() {
    return this._notifications.filter((n) => !n.isRead).length;
  }

  _emit() {
    for (const cb of listeners) {
      cb([...this._notifications]);
    }
  }

  /** Subscribe to notification list changes. Returns an unsubscribe function. */
  subscribe(cb) {
    listeners.add(cb);
    cb([...this._notifications]);
    return () => listeners.delete(cb);
  }

  /**
   * Parse WALLET_UPDATED payload into an AppNotification.
   * Inner types: BET_WON | BET_LOST | BET_WIN_REVERSAL
   * @param {object} payload  — the data emitted from settlement.controller.js
   * @returns {AppNotification}
   */
  _parseWalletPayload(payload) {
    const innerType = payload?.type;
    const raceId = payload?.raceId;
    const id = `wallet_${raceId}_${Date.now()}`;

    if (innerType === 'BET_WON') {
      return {
        id,
        type: 'BET_WON',
        title: 'Bạn thắng cược!',
        message:
          payload?.message ||
          `Trận #${raceId}: Đặt ${payload?.betAmount} điểm → nhận +${payload?.addedAmount} điểm!`,
        payload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    }

    if (innerType === 'BET_LOST') {
      return {
        id,
        type: 'BET_LOST',
        title: 'Kết quả cược',
        message:
          payload?.message ||
          `Trận #${raceId}: Đặt ${payload?.betAmount} điểm → không trúng.`,
        payload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    }

    if (innerType === 'BET_WIN_REVERSAL') {
      const wasWinner = payload?.wasWinner === true;
      return {
        id,
        type: 'BET_WIN_REVERSAL',
        title: 'Kết quả bị thu hồi',
        message:
          payload?.message ||
          (wasWinner
            ? 'Admin thu hồi kết quả. Điểm đã hoàn tác.'
            : 'Admin thu hồi kết quả cược.'),
        payload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    }

    // Fallback generic WALLET_UPDATED
    const amount = payload?.addedAmount ?? payload?.recalledAmount ?? 0;
    return {
      id,
      type: 'WALLET_UPDATED',
      title: payload?.recalledAmount != null ? 'Kết quả bị thu hồi' : 'Cập nhật ví',
      message: payload?.message || `Số dư thay đổi ${amount} điểm.`,
      payload,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Called by the socket hook when an event arrives via Socket.IO.
   * @param {string} eventType — event name e.g. 'WALLET_UPDATED', 'RACE_FINISHED', etc.
   * @param {object} payload
   */
  addFromSocket(eventType, payload) {
    // Dedupe by id if one already exists
    let notif;
    if (eventType === 'WALLET_UPDATED') {
      notif = this._parseWalletPayload(payload);
    } else if (eventType === 'RACE_FINISHED') {
      notif = {
        id: `race_${payload?.raceId}_${Date.now()}`,
        type: 'RACE_FINISHED',
        title: 'Trận đấu đã kết thúc',
        message:
          payload?.message || 'Kết quả trận đua đã được công bố.',
        payload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    } else if (eventType === 'RACE_UNPUBLISHED') {
      notif = {
        id: `race_unpub_${payload?.raceId}_${Date.now()}`,
        type: 'RACE_UNPUBLISHED',
        title: 'Kết quả bị thu hồi',
        message:
          payload?.message || 'Admin đã thu hồi kết quả trận đua để đối soát lại.',
        payload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    } else {
      notif = {
        id: `${eventType}_${Date.now()}`,
        type: eventType,
        title: eventType,
        message: payload?.message || JSON.stringify(payload),
        payload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    }

    this._notifications.unshift(notif);
    this._emit();
  }

  /**
   * Prepend notifications loaded from REST API (newest first).
   * Merges with existing socket-pushed items to avoid duplicates.
   * @param {AppNotification[]} apiNotifications
   */
  setFromApi(apiNotifications) {
    const ids = new Set(this._notifications.map((n) => n.id));
    const fresh = apiNotifications.filter((n) => !ids.has(n.id));
    this._notifications = [...this._notifications, ...fresh];
    this._notifications.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    this._emit();
  }

  /**
   * Mark a notification as read locally.
   * @param {number|string} id
   */
  markRead(id) {
    const n = this._notifications.find((n) => n.id === Number(id) || n.id === String(id));
    if (n) {
      n.isRead = true;
      this._emit();
    }
  }

  /** Mark all notifications as read locally. */
  markAllRead() {
    for (const n of this._notifications) n.isRead = true;
    this._emit();
  }

  /** Reset on logout. */
  reset() {
    this._notifications = [];
    this._emit();
  }
}

export const spectatorNotificationCenter = new SpectatorNotificationCenter();
