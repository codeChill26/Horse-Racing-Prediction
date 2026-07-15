/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Layout — sidebar + content shell.
 * Đồng bộ dark theme với Admin/Spectator/HorseOwner.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  Flag,
  History,
  AlertTriangle,
  User,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { logoutUser } from "../../api/auth";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from "../../utils/token";
import { refereeNotificationService } from "../../services/refereeService";
import "./RefereeLayout.css";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/referee", icon: LayoutDashboard, end: true },
  { label: "Assigned Races", path: "/referee/assigned-races", icon: Flag, end: false },
  { label: "Submission History", path: "/referee/submissions", icon: History, end: false },
  { label: "Conflicts", path: "/referee/conflicts", icon: AlertTriangle, end: false },
  { label: "Profile", path: "/referee/profile", icon: User, end: false },
];

const POLL_INTERVAL_MS = 30_000;

export default function RefereeLayout() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const list = await refereeNotificationService.getMyNotifications({ unread: true });
      setUnreadCount(Array.isArray(list) ? list.length : 0);
    } catch {
      // Silent fail — polling best-effort
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshUnread]);

  const onLogout = async () => {
    try {
      const at = getAccessToken();
      const rt = getRefreshToken();
      if (at) await logoutUser({ accessToken: at, refreshToken: rt });
    } catch { /* clear local anyway */ }
    clearAuthTokens();
    navigate("/login", { replace: true });
  };

  return (
    <div className="ref-shell">
      <aside className="ref-sidebar" aria-label="Điều hướng trọng tài">
        <div className="ref-sidebar-brand">
          <div className="ref-logo" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>GrandStride</strong>
            <span>Trọng tài · Referee</span>
          </div>
        </div>

        <nav className="ref-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `ref-nav-link${isActive ? " is-active" : ""}`
                }
              >
                <Icon className="ref-nav-icon" size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <NavLink
            to="/referee/notifications"
            className={({ isActive }) =>
              `ref-nav-link${isActive ? " is-active" : ""} ref-nav-link--notifications`
            }
          >
            <Bell className="ref-nav-icon" size={16} />
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <span className="ref-nav-badge" aria-label={`${unreadCount} chưa đọc`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
        </nav>

        <div className="ref-sidebar-footer">
          <button
            type="button"
            className="ref-btn ref-btn--ghost ref-btn--full"
            onClick={onLogout}
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="ref-shell-content">
        <Outlet />
      </div>
    </div>
  );
}
