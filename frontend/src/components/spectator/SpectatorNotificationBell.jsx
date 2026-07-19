/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Spectator Notification Bell — dropdown with real-time betting updates.
 * Listens to BET_WON / BET_LOST / BET_WIN_REVERSAL / RACE_FINISHED
 * via the spectatorNotificationCenter singleton store.
 */

import { useEffect, useRef, useState } from 'react';
import { Bell, Trophy, X, RotateCcw, Flag, CheckCheck } from 'lucide-react';
import { spectatorNotificationCenter } from '../../services/spectatorNotificationCenter';
import './SpectatorNotificationBell.css';

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function getToastClass(type) {
  if (type === 'BET_WON') return 'sp-notif-toast--won';
  if (type === 'BET_LOST') return 'sp-notif-toast--lost';
  if (type === 'BET_WIN_REVERSAL') return 'sp-notif-toast--reversal';
  if (type === 'RACE_FINISHED') return 'sp-notif-toast--race';
  return '';
}

function getIcon(type) {
  if (type === 'BET_WON') return <Trophy size={16} />;
  if (type === 'BET_LOST') return <X size={16} />;
  if (type === 'BET_WIN_REVERSAL') return <RotateCcw size={16} />;
  if (type === 'RACE_FINISHED') return <Flag size={16} />;
  return <Bell size={16} />;
}

function getIconClass(type) {
  if (type === 'BET_WON') return 'icon-win';
  if (type === 'BET_LOST') return 'icon-lost';
  if (type === 'BET_WIN_REVERSAL') return 'icon-reversal';
  if (type === 'RACE_FINISHED') return 'icon-race';
  return '';
}

export default function SpectatorNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const wrapperRef = useRef(null);
  const toastSeenRef = useRef(new Set());

  useEffect(() => {
    const unsub = spectatorNotificationCenter.subscribe((list) => {
      setNotifications(list);
      const latest = list[0];
      if (latest && !latest.isRead && !toastSeenRef.current.has(latest.id)) {
        toastSeenRef.current.add(latest.id);
        setToast({ id: latest.id, type: latest.type, title: latest.title, message: latest.message });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleItemClick = (notif) => {
    spectatorNotificationCenter.markRead(notif.id);
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    spectatorNotificationCenter.markAllRead();
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className={`sp-notif-toast ${getToastClass(toast.type)}`}
          role="status"
          aria-live="polite"
        >
          <span className="sp-notif-toast__icon">{getIcon(toast.type)}</span>
          <div className="sp-notif-toast__body">
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
          <button
            type="button"
            className="sp-notif-toast__close"
            onClick={() => setToast(null)}
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Bell */}
      <div className="sp-notif-bell-wrapper" ref={wrapperRef}>
        <button
          type="button"
          className={`sp-notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="sp-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="sp-notif-dropdown" role="dialog" aria-label="Thông báo">
            <div className="sp-notif-dropdown__header">
              <span>Thông báo</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="sp-notif-mark-all"
                  onClick={handleMarkAllRead}
                  aria-label="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={14} />
                  Đọc tất cả
                </button>
              )}
            </div>

            <div className="sp-notif-dropdown__body">
              {notifications.length === 0 ? (
                <div className="sp-notif-empty">
                  <Bell size={28} />
                  <p>Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`sp-notif-item ${!n.isRead ? 'is-unread' : ''}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <div className={`sp-notif-item__icon ${getIconClass(n.type)}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="sp-notif-item__body">
                      <div className="sp-notif-item__title">{n.title}</div>
                      {n.message && (
                        <div className="sp-notif-item__message">{n.message}</div>
                      )}
                      <div className="sp-notif-item__time">{formatRelativeTime(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <div className="sp-notif-item__dot" aria-hidden="true" />}
                  </button>
                ))
              )}
            </div>

            <div className="sp-notif-dropdown__footer">
              <button
                type="button"
                className="sp-notif-close-btn"
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
