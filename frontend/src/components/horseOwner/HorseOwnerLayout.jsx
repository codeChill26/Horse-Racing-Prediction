import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../api/auth'
import { clearAuthTokens, getAccessToken, getRefreshToken } from '../../utils/token'
import './HorseOwnerLayout.css'

const NAV_ITEMS = [
  { to: '/horse-owner', label: 'Trang chủ', icon: '🏠', end: true },
  { to: '/horse-owner/profile', label: 'Hồ sơ chủ ngựa', icon: '👤', end: false },
]

export default function HorseOwnerLayout() {
  const navigate = useNavigate()

  const onLogout = async () => {
    try {
      const accessToken = getAccessToken()
      const refreshToken = getRefreshToken()
      if (accessToken) await logoutUser({ accessToken, refreshToken })
    } catch {
      /* clear local anyway */
    }
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
            <span>Chủ ngựa</span>
          </div>
        </div>

        <nav className="owner-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `owner-nav-link${isActive ? ' is-active' : ''}`}
            >
              <span className="owner-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="owner-sidebar-footer">
          <button type="button" className="owner-btn owner-btn--ghost owner-btn--full" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="owner-shell-content">
        <Outlet />
      </div>
    </div>
  )
}
