/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner Notification Bell — dropdown with real-time updates.
 * Dropdown panel + badge counter + toast on new tournament notification.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, Trophy, CheckCheck, X, ChevronRight } from "lucide-react";
import {
  horseOwnerNotificationCenter,
} from "../../hooks/useHorseOwnerNotifications";
import { horseOwnerNotificationService } from "../../services/horseOwnerNotificationService";
import "./HorseOwnerNotificationBell.css";

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function HorseOwnerNotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const wrapperRef = useRef(null);

  // Track which notifications we've already shown a toast for (by id).
  const toastSeenRef = useRef(new Set());

  // Subscribe to the notification store.
  useEffect(() => {
    const unsub = horseOwnerNotificationCenter.subscribe((list) => {
      setNotifications(list);
      // Check if there is a brand-new unread tournament notification we haven't toast-ed yet.
      const latest = list[0];
      if (
        latest &&
        latest.type === 'TOURNAMENT_OPEN' &&
        !latest.isRead &&
        !toastSeenRef.current.has(latest.id)
      ) {
        toastSeenRef.current.add(latest.id);
        setToast({ id: latest.id, title: latest.title, message: latest.message });
      }
    });
    return unsub;
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-dismiss toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleItemClick = async (notif) => {
    // Mark read locally and via API.
    horseOwnerNotificationCenter.markRead(notif.id);
    try {
      await horseOwnerNotificationService.markRead(notif.id);
    } catch {
      // optimistic update already done, ignore API error
    }
    setOpen(false);
    // Navigate to tournament if payload is present.
    if (onNavigate && notif.payload?.tournamentId) {
      onNavigate(`/horse-owner/tournaments/${notif.payload.tournamentId}`);
    }
  };

  const handleMarkAllRead = async () => {
    horseOwnerNotificationCenter.markAllRead();
    try {
      await horseOwnerNotificationService.markAllRead();
    } catch {
      // optimistic
    }
  };

  const getIcon = (type) => {
    if (type === "TOURNAMENT_OPEN") return <Trophy size={16} />;
    return <Bell size={16} />;
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="ho-notif-toast" role="status" aria-live="polite">
          <Trophy size={16} className="ho-notif-toast__icon" />
          <div className="ho-notif-toast__body">
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
          <button
            type="button"
            className="ho-notif-toast__close"
            onClick={() => setToast(null)}
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Bell */}
      <div className="ho-notif-bell-wrapper" ref={wrapperRef}>
        <button
          type="button"
          className={`ho-notif-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="ho-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="ho-notif-dropdown" role="dialog" aria-label="Thông báo">
            <div className="ho-notif-dropdown__header">
              <span>Thông báo</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="ho-notif-mark-all"
                  onClick={handleMarkAllRead}
                  aria-label="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={14} />
                  Đọc tất cả
                </button>
              )}
            </div>

            <div className="ho-notif-dropdown__body">
              {notifications.length === 0 ? (
                <div className="ho-notif-empty">
                  <Bell size={28} />
                  <p>Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`ho-notif-item ${!n.isRead ? "is-unread" : ""}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <div className={`ho-notif-item__icon ${n.type === "TOURNAMENT_OPEN" ? "icon-gold" : ""}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="ho-notif-item__body">
                      <div className="ho-notif-item__title">{n.title}</div>
                      {n.message && (
                        <div className="ho-notif-item__message">{n.message}</div>
                      )}
                      <div className="ho-notif-item__time">{formatRelativeTime(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <div className="ho-notif-item__dot" aria-hidden="true" />}
                    {n.payload?.tournamentId && (
                      <ChevronRight size={14} className="ho-notif-item__arrow" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="ho-notif-dropdown__footer">
              <button
                type="button"
                className="ho-notif-close-btn"
                onClick={() => setOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
