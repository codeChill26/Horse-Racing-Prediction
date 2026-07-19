/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner Notification Service
 * API: /api/horse-owner/notifications
 */

import { getAccessToken } from "../utils/token";

async function readError(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`);
}

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export const horseOwnerNotificationService = {
  /**
   * GET /api/horse-owner/notifications?unread=true
   * @param {{ unreadOnly?: boolean }} opts
   * @returns {Promise<AppNotification[]>}
   */
  async getList({ unreadOnly = false } = {}) {
    const url = unreadOnly
      ? "/api/horse-owner/notifications?unread=true"
      : "/api/horse-owner/notifications";
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) await readError(res, "Không tải được thông báo");
    const data = await res.json();
    // Normalize Prisma fields: notificationId → id, read → isRead
    return (data?.notifications ?? []).map((n) => ({
      id: n.notificationId,
      type: n.type,
      title: n.title,
      message: n.message,
      payload: n.payload,
      isRead: Boolean(n.read),
      createdAt: n.createdAt,
    }));
  },

  /**
   * POST /api/horse-owner/notifications/:id/read
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async markRead(id) {
    const res = await fetch(`/api/horse-owner/notifications/${id}/read`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không đánh dấu được thông báo");
    const data = await res.json();
    return data?.notification;
  },

  /**
   * POST /api/horse-owner/notifications/read-all
   * @returns {Promise<{ updated: number }>}
   */
  async markAllRead() {
    const res = await fetch("/api/horse-owner/notifications/read-all", {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) await readError(res, "Không đánh dấu được tất cả thông báo");
    const data = await res.json();
    return data;
  },
};
