import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, UserCircle2, PawPrint, Send, CalendarDays, Trophy } from 'lucide-react'
import { logoutUser } from '../../api/auth'
import { clearAuthTokens, getAccessToken, getRefreshToken } from '../../utils/token'
import { useHorseOwnerSocket, horseOwnerNotificationCenter } from '../../hooks/useHorseOwnerNotifications'
import { horseOwnerNotificationService } from '../../services/horseOwnerNotificationService'
import HorseOwnerNotificationBell from './HorseOwnerNotificationBell'
import './HorseOwnerLayout.css'

const NAV_ITEMS = [
  { to: '/horse-owner', label: 'Trang chủ', icon: LayoutDashboard, end: true },
  { to: '/horse-owner/horses', label: 'Quản lí ngựa', icon: PawPrint, end: false },
  { to: '/horse-owner/invite-jockey', label: 'Mời kỵ sĩ', icon: Send, end: false },
  { to: '/horse-owner/schedule', label: 'Lịch thi đấu', icon: CalendarDays, end: false },
  { to: '/horse-owner/tournaments', label: 'Giải đấu', icon: Trophy, end: false },
  { to: '/horse-owner/profile', label: 'Cá nhân', icon: UserCircle2, end: false },
]

export default function HorseOwnerLayout() {
  const navigate = useNavigate()
  const token = getAccessToken()

  // Connect Socket.IO and load initial notifications.
  useHorseOwnerSocket({ token })

  // Load notification list on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await horseOwnerNotificationService.getList()
        if (!cancelled) horseOwnerNotificationCenter.setFromApi(list)
      } catch (e) {
        console.warn('[HorseOwnerLayout] load notifications failed:', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onLogout = async () => {
    try {
      const accessToken = getAccessToken()
      const refreshToken = getRefreshToken()
      if (accessToken) await logoutUser({ accessToken, refreshToken })
    } catch {
      /* clear local anyway */
    }
    horseOwnerNotificationCenter.reset()
    clearAuthTokens()
    navigate('/login', { replace: true })
  }

  return (
    <div className="owner-shell">
      <aside className="owner-sidebar" aria-label="Điều hướng chủ ngựa">
        <div className="owner-sidebar-brand">
          <span className="owner-logo" aria-hidden="true">
            🐎
          </span>
          <div>
            <strong>Horse Racing</strong>
            <span>Chủ ngựa · Owner</span>
          </div>
        </div>

        <nav className="owner-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `owner-nav-link${isActive ? ' is-active' : ''}`
                }
              >
                <Icon className="owner-nav-icon" size={16} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="owner-sidebar-footer">
          <button
            type="button"
            className="owner-btn owner-btn--ghost owner-btn--full"
            onClick={onLogout}
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="owner-shell-content">
        <div className="owner-topbar">
          <div className="owner-topbar__title">Khu vực Chủ ngựa</div>
          <HorseOwnerNotificationBell />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
