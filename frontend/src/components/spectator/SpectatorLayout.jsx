/**
 * SpectatorLayout - Dark Theme (Admin Color System)
 * Màu sắc đồng bộ với admin dashboard
 */

import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../api/auth'
import { clearAuthTokens, getAccessToken, getRefreshToken } from '../../utils/token'
import { useSpectatorSocket } from '../../hooks/useSpectatorSocket'
import { spectatorNotificationCenter } from '../../services/spectatorNotificationCenter'
import SpectatorNotificationBell from './SpectatorNotificationBell'
import './SpectatorLayout.css'

const NAV_ITEMS = [
  { to: '/spectator', label: 'Trang chủ', icon: '⌂', end: true },
  { to: '/spectator/tournaments', label: 'Giải đấu', icon: '🏆', end: false },
  { to: '/spectator/betting-history', label: 'Lịch sử cược', icon: '📋', end: false },
  { to: '/spectator/statistics', label: 'Thống kê', icon: '📊', end: false },
  { to: '/spectator/profile', label: 'Cá nhân', icon: '👤', end: false },
]

export default function SpectatorLayout() {
  const navigate = useNavigate()
  const token = getAccessToken()

  // Connect Socket.IO for spectator notifications.
  useSpectatorSocket({ token })

  const onLogout = async () => {
    try {
      const accessToken = getAccessToken()
      const refreshToken = getRefreshToken()
      if (accessToken) await logoutUser({ accessToken, refreshToken })
    } catch {
      // clear local anyway
    }
    spectatorNotificationCenter.reset()
    clearAuthTokens()
    navigate('/login', { replace: true })
  }

  return (
    <div className="spectator-shell">
      <aside className="spectator-sidebar" aria-label="Điều hướng khán giả">
        <div className="spectator-sidebar-brand">
          <span className="spectator-logo" aria-hidden="true">
            ♞
          </span>
          <div>
            <strong>Horse Racing</strong>
            <span>Khán giả</span>
          </div>
        </div>

        <nav className="spectator-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `spectator-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="spectator-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="spectator-sidebar-footer">
          <button type="button" className="spectator-btn spectator-btn--ghost" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="spectator-shell-content">
        <div className="spectator-topbar">
          <div className="spectator-topbar__title">Khu vực Khán giả</div>
          <SpectatorNotificationBell />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
