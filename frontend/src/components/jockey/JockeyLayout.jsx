import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Flag,
  Calendar,
  User,
  Bell,
  LogOut,
  Trophy,
} from "lucide-react";
import { logoutUser } from "../../api/auth";
import { clearAuthTokens, getAccessToken, getRefreshToken } from "../../utils/token";
import "./JockeyLayout.css";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/jockey", icon: LayoutDashboard, end: true },
  { label: "My Races", path: "/jockey/races", icon: Flag, end: false },
  { label: "Schedule", path: "/jockey/schedule", icon: Calendar, end: false },
  { label: "Notifications", path: "/jockey/notifications", icon: Bell, end: false },
  { label: "Profile", path: "/jockey/profile", icon: User, end: false },
];

export default function JockeyLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (accessToken) await logoutUser({ accessToken, refreshToken });
    } catch {
      /* clear local anyway */
    }
    clearAuthTokens();
    navigate("/login");
  };

  return (
    <div className="jock-shell">
      <aside className="jock-sidebar">
        <div className="jock-sidebar-brand">
          <div className="jock-brand-icon">
            <Trophy size={24} />
          </div>
          <div className="jock-brand-text">
            <span className="jock-brand-name">GrandStride</span>
            <span className="jock-brand-role">Jockey</span>
          </div>
        </div>

        <nav className="jock-sidebar-nav">
          {NAV_ITEMS.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `jock-nav-item ${isActive ? "jock-nav-item--active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="jock-sidebar-footer">
          <button className="jock-logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="jock-shell-content">
        <Outlet />
      </div>
    </div>
  );
}
