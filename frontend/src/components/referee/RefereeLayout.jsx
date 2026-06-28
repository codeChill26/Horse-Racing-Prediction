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
  ClipboardList,
  PlayCircle,
  Clock,
  AlertTriangle,
  UserCircle2,
  ShieldCheck,
} from "lucide-react";
import { logoutUser } from "../../api/auth";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from "../../utils/token";
import "./RefereeLayout.css";

const NAV_ITEMS = [
  { to: "/referee", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/referee/assigned-races", label: "Race được phân công", icon: ClipboardList, end: false },
  { to: "/referee/submissions", label: "Lịch sử submit", icon: Clock, end: false },
  { to: "/referee/conflicts", label: "Conflict", icon: AlertTriangle, end: false },
  { to: "/referee/profile", label: "Cá nhân", icon: UserCircle2, end: false },
];

export default function RefereeLayout() {
  const navigate = useNavigate();

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
                key={item.to}
                to={item.to}
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
