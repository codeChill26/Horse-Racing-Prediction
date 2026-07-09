/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Socket.IO client wrapper — kết nối namespace /notifications của backend.
 *
 * Backend (backend/src/socket/index.js):
 *  - namespace: /notifications
 *  - auth: handshake.auth.token (JWT)
 *  - rooms: user:${userId}, admin (nếu role ADMIN), race:${raceId} (sau subscribe:race)
 *
 * Events BE emit (theo mainflow.md + service thực tế):
 *  - invitation:received      → jockey (owner vừa tạo)
 *  - invitation:accepted      → owner (jockey vừa accept)
 *  - invitation:declined      → owner (jockey vừa decline)
 *  - invitation:confirmed     → jockey (owner vừa confirm → entry created)
 *  - entry:created            → admin + jockey (raceEntries tạo entry trực tiếp)
 *  - entry:status_changed     → owner (admin review → APPROVED/REJECTED)
 *  - odds:updated             → room race:${raceId} (sau subscribe)
 */

import { io } from "socket.io-client";

// URL backend: dev thì dùng localhost:3000, prod thì set VITE_API_BASE_URL
const SOCKET_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:3000";

const NAMESPACE = "/notifications";

let socket = null;
let currentToken = null;
const listeners = new Map(); // event -> Set<callback>
const reconnectListeners = new Set();

/**
 * Khởi tạo / lấy socket hiện tại. Singleton — nếu token đổi thì tự reconnect.
 */
export function getSocket(token) {
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket && currentToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(`${SOCKET_BASE_URL}${NAMESPACE}`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  // Re-attach listeners after reconnect
  socket.onAny((event, ...args) => {
    const set = listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(...args);
        } catch (_err) {
          /* swallow */
        }
      });
    }
  });

  socket.on("connect", () => {
    reconnectListeners.forEach((cb) => {
      try {
        cb({ connected: true, socket });
      } catch (_err) {
        /* swallow */
      }
    });
  });

  socket.on("disconnect", () => {
    reconnectListeners.forEach((cb) => {
      try {
        cb({ connected: false, socket });
      } catch (_err) {
        /* swallow */
      }
    });
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

/** Subscribe tới 1 event. Trả về hàm unsubscribe. */
export function onSocketEvent(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  // Đăng ký trực tiếp trên socket luôn (cho lần đầu)
  if (socket) {
    socket.on(event, callback);
  }

  return () => offSocketEvent(event, callback);
}

export function offSocketEvent(event, callback) {
  const set = listeners.get(event);
  if (set) {
    set.delete(callback);
  }
  if (socket) {
    socket.off(event, callback);
  }
}

/** Lắng nghe connect/disconnect. */
export function onSocketStatus(callback) {
  reconnectListeners.add(callback);
  return () => reconnectListeners.delete(callback);
}

/** Subscribe room race:${raceId} để nhận odds:updated, ... */
export function subscribeRace(raceId) {
  if (socket && raceId) {
    socket.emit("subscribe:race", raceId);
  }
}

export function unsubscribeRace(raceId) {
  if (socket && raceId) {
    socket.emit("unsubscribe:race", raceId);
  }
}

export function isSocketConnected() {
  return !!(socket && socket.connected);
}