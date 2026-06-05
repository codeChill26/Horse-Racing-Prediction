import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../api/auth'
import { clearAuthTokens, getAccessToken, getRefreshToken } from '../../utils/token'
import './JockeyLayout.css'

const NAV_ITEMS = [
  { to: '/jockey', label: 'Trang chủ', icon: '🏇', end: true },
  { to: '/jockey/profile', label: 'Hồ sơ kỵ sĩ', icon: '📋', end: false },
]

export default function JockeyLayout() {
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
    <div className="jockey-shell">
      <aside className="jockey-sidebar" aria-label="Điều hướng kỵ sĩ">
        <div className="jockey-sidebar-brand">
          <span className="jockey-logo" aria-hidden="true">
            🏇
          </span>
          <div>
            <strong>Horse Racing</strong>
            <span>Khu vực Kỵ sĩ</span>
          </div>
        </div>

        <nav className="jockey-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `jockey-nav-link${isActive ? ' is-active' : ''}`}
            >
              <span className="jockey-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="jockey-sidebar-footer">
          <button type="button" className="jockey-btn jockey-btn--ghost jockey-btn--full" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="jockey-shell-content">
        <Outlet />
      </div>
    </div>
  )
}
