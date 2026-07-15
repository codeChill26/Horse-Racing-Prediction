/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Notifications Page
 * Route: /referee/notifications
 *
 * Tính năng:
 * - Xem danh sách notification của trọng tài.
 * - Phản hồi phân công (Accept / Refuse) cho notification RACE_ASSIGNED.
 * - Đánh dấu đã đọc / đánh dấu tất cả đã đọc.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Inbox,
  CheckCircle2,
  XCircle,
  Flag,
} from "lucide-react";
import {
  refereeNotificationService,
} from "../../services/refereeService";
import { showToast } from "../../hooks/showToast";
import { formatDate } from "../../utils/formatter";
import "./RefereeNotificationsPage.css";

const RESPONSE_LABELS = {
  ACCEPTED: { label: "Đã chấp nhận", variant: "ok" },
  REFUSED: { label: "Đã từ chối", variant: "danger" },
};

export default function RefereeNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL | UNREAD | ASSIGNMENTS

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const list = await refereeNotificationService.getMyNotifications();
      setNotifications(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách thông báo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    let list = notifications;
    if (filter === "UNREAD") list = list.filter((n) => !n.read);
    if (filter === "ASSIGNMENTS") {
      list = list.filter((n) => n.type === "RACE_ASSIGNED");
    }
    return list;
  }, [notifications, filter]);

  const handleMarkRead = async (id) => {
    try {
      await refereeNotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id || n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : "Không đánh dấu được đã đọc");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await refereeNotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : "Không thể đánh dấu tất cả");
    }
  };

  const handleRespond = async (notification, response) => {
    setBusyId(notification.notificationId ?? notification.id);
    try {
      await refereeNotificationService.respondAssignment(notification, response);
      showToast.success(
        response === "ACCEPTED"
          ? "Đã chấp nhận phân công"
          : "Đã từ chối phân công"
      );
      // Optimistic update — merge response into payload để UI hiển thị ngay
      setNotifications((prev) =>
        prev.map((n) => {
          if ((n.notificationId ?? n.id) !== (notification.notificationId ?? notification.id)) return n;
          return {
            ...n,
            read: true,
            payload: {
              ...(n.payload || {}),
              response,
              responseAt: new Date().toISOString(),
            },
          };
        })
      );
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : "Không ghi nhận được phản hồi");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rn-page">
      <header className="rn-page__header">
        <div>
          <p className="rn-page__eyebrow">Referee</p>
          <h1 className="rn-page__title">Thông báo</h1>
          <p className="rn-page__subtitle">
            Phân công chặng đua, cập nhật quan trọng và phản hồi của bạn.
            {unreadCount > 0 ? ` Có ${unreadCount} thông báo chưa đọc.` : ""}
          </p>
        </div>
        <div className="rn-page__actions">
          <button
            type="button"
            className="rn-btn rn-btn--ghost"
            onClick={() => loadNotifications(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "rn-spin" : ""} />
            Làm mới
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              className="rn-btn rn-btn--primary"
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={14} />
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </header>

      <div className="rn-tabs" role="tablist" aria-label="Bộ lọc thông báo">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "ALL"}
          className={`rn-tab${filter === "ALL" ? " rn-tab--active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "UNREAD"}
          className={`rn-tab${filter === "UNREAD" ? " rn-tab--active" : ""}`}
          onClick={() => setFilter("UNREAD")}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "ASSIGNMENTS"}
          className={`rn-tab${filter === "ASSIGNMENTS" ? " rn-tab--active" : ""}`}
          onClick={() => setFilter("ASSIGNMENTS")}
        >
          Phân công ({notifications.filter((n) => n.type === "RACE_ASSIGNED").length})
        </button>
      </div>

      <div className="rn-panel">
        {loading ? (
          <div className="rn-loading">
            <div className="rn-spinner" />
          </div>
        ) : error ? (
          <div className="rn-error">
            <p>{error}</p>
            <button
              type="button"
              className="rn-btn rn-btn--primary"
              onClick={() => loadNotifications()}
            >
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rn-empty">
            <Inbox size={48} aria-hidden="true" />
            <h3>Chưa có thông báo nào</h3>
            <p>
              {filter === "UNREAD"
                ? "Bạn đã đọc hết tất cả thông báo."
                : filter === "ASSIGNMENTS"
                  ? "Chưa có phân công trọng tài nào."
                  : "Hệ thống sẽ thông báo khi có phân công hoặc cập nhật mới."}
            </p>
          </div>
        ) : (
          <ul className="rn-list" role="list">
            {filtered.map((n) => {
              const key = n.notificationId ?? n.id;
              const payload = (n.payload && typeof n.payload === "object") ? n.payload : {};
              const response = payload.response;
              const isAssignment = n.type === "RACE_ASSIGNED";
              const isBusy = busyId === key;
              return (
                <li
                  key={key}
                  className={`rn-item${n.read ? "" : " rn-item--unread"}`}
                >
                  <div className="rn-item__icon" aria-hidden="true">
                    {isAssignment ? <Flag size={18} /> : <Bell size={18} />}
                  </div>

                  <div className="rn-item__body">
                    <div className="rn-item__head">
                      <h3 className="rn-item__title">{n.title || "Thông báo"}</h3>
                      <span className="rn-item__time">{formatDate(n.createdAt)}</span>
                    </div>

                    <p className="rn-item__message">{n.message}</p>

                    {isAssignment && (
                      <div className="rn-item__meta">
                        {payload.tournamentName && (
                          <span className="rn-item__chip">
                            Giải: <strong>{payload.tournamentName}</strong>
                          </span>
                        )}
                        {payload.raceName && (
                          <span className="rn-item__chip">
                            Chặng: <strong>{payload.raceName}</strong>
                          </span>
                        )}
                        {payload.role && (
                          <span className="rn-item__chip">
                            Vai trò: <strong>{payload.role === "A" ? "Trọng tài A" : "Trọng tài B"}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {response && (
                      <div className={`rn-response rn-response--${RESPONSE_LABELS[response]?.variant || "muted"}`}>
                        {response === "ACCEPTED" ? (
                          <CheckCircle2 size={14} aria-hidden="true" />
                        ) : (
                          <XCircle size={14} aria-hidden="true" />
                        )}
                        <span>
                          {RESPONSE_LABELS[response]?.label || response}
                          {payload.responseAt
                            ? ` · ${formatDate(payload.responseAt)}`
                            : ""}
                        </span>
                      </div>
                    )}

                    {!response && isAssignment && (
                      <div className="rn-item__actions">
                        <button
                          type="button"
                          className="rn-btn rn-btn--primary rn-btn--sm"
                          disabled={isBusy}
                          onClick={() => handleRespond(n, "ACCEPTED")}
                        >
                          <CheckCircle2 size={14} />
                          Chấp nhận
                        </button>
                        <button
                          type="button"
                          className="rn-btn rn-btn--ghost rn-btn--sm"
                          disabled={isBusy}
                          onClick={() => handleRespond(n, "REFUSED")}
                        >
                          <XCircle size={14} />
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>

                  {!n.read && !response && (
                    <button
                      type="button"
                      className="rn-item__mark-read"
                      onClick={() => handleMarkRead(key)}
                      aria-label="Đánh dấu đã đọc"
                      title="Đánh dấu đã đọc"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}