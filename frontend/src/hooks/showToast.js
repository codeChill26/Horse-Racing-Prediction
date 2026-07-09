/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * showToast — imperative API cho toast notification.
 * Có thể gọi từ bất kỳ đâu, không cần nằm trong React tree.
 * Toast queue được drain bởi ToastProvider khi nó mount.
 */

const listeners = new Set();
let externalQueue = [];

function notify(payload) {
  if (listeners.size === 0) {
    externalQueue.push(payload);
    return;
  }
  listeners.forEach((fn) => fn(payload));
}

function generateId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(payload) {
  return {
    id: payload?.id || generateId(),
    type: payload?.type || "info",
    title: payload?.title || "",
    message: payload?.message || "",
    duration: typeof payload?.duration === "number" ? payload.duration : 4000,
  };
}

/** Gọi từ bất kỳ đâu — không cần nằm trong React tree. */
export function showToast(payload) {
  const normalized = normalize(payload);
  notify(normalized);
  return normalized.id;
}

showToast.success = (message, title = "Thành công") =>
  showToast({ type: "success", message, title });
showToast.error = (message, title = "Lỗi") =>
  showToast({ type: "error", message, title });
showToast.info = (message, title = "Thông báo") =>
  showToast({ type: "info", message, title });
showToast.warn = (message, title = "Cảnh báo") =>
  showToast({ type: "warn", message, title });

/* Internal: dùng cho ToastProvider để đăng ký listener & drain queue. */
export function __registerToastListener(fn) {
  listeners.add(fn);
  if (externalQueue.length > 0) {
    const drain = externalQueue.slice();
    externalQueue = [];
    drain.forEach((p) => fn(p));
  }
  return () => listeners.delete(fn);
}