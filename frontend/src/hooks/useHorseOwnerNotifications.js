/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner Notification Center — singleton store for notifications.
 * Mirrors the pattern from mobile/lib/services/realtime/notification_center.dart.
 */

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

/**
 * @typedef {Object} NotificationPayload
 * @property {number} [tournamentId]
 * @property {string} [name]
 * @property {string} [status]
 */

/**
 * @typedef {Object} AppNotification
 * @property {number} id
 * @property {string} type
 * @property {string} title
 * @property {string} [message]
 * @property {NotificationPayload} [payload]
 * @property {boolean} isRead
 * @property {string} createdAt
 */

const listeners = new Set();

class HorseOwnerNotificationCenter {
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
    cb([...this._notifications]); // immediately emit current state
    return () => listeners.delete(cb);
  }

  /**
   * Called by the socket hook when a new notification arrives via Socket.IO.
   * @param {object} notif
   */
  addFromSocket(notif) {
    const existing = this._notifications.find((n) => n.id === notif.id);
    if (existing) return; // dedupe

    /** @type {AppNotification} */
    const normalized = {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      payload: notif.payload ?? {},
      isRead: false,
      createdAt: notif.createdAt ?? new Date().toISOString(),
    };

    this._notifications.unshift(normalized);
    this._emit();
  }

  /**
   * Prepend notifications loaded from the REST API (newest first).
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
    const n = this._notifications.find((n) => n.id === Number(id));
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

export const horseOwnerNotificationCenter = new HorseOwnerNotificationCenter();

// ============================================================================
// Socket hook
// ============================================================================

/**
 * React hook that manages the Socket.IO connection for horse owner notifications.
 * Call once at the top of the layout tree (e.g., HorseOwnerLayout).
 *
 * @param {{ token: string }} opts
 * @returns {{ isConnected: boolean }}
 */
export function useHorseOwnerSocket({ token }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io("/notifications", {
      transports: ["websocket"],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", () => setIsConnected(false));

    socket.on("notification:new", (data) => {
      if (data && typeof data === "object") {
        horseOwnerNotificationCenter.addFromSocket(data);
      }
    });

    return () => {
      socket.off("notification:new");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [token]);

  return { isConnected };
}
