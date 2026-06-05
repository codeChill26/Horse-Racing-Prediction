import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../api/auth'
import { clearAuthTokens, getAccessToken, getRefreshToken } from '../../utils/token'
import './SpectatorLayout.css'

const NAV_ITEMS = [
  { to: '/spectator', label: 'Trang chủ', icon: '⌂', end: true },
  { to: '/spectator/profile', label: 'Trang cá nhân', icon: '👤', end: false },
]

export default function SpectatorLayout() {
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
          <button type="button" className="spectator-btn spectator-btn--ghost spectator-btn--full" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="spectator-shell-content">
        <Outlet />
      </div>
    </div>
  )
}
