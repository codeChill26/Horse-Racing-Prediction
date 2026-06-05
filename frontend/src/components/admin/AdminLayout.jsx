import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../api/auth'
import { clearAuthTokens, getAccessToken, getRefreshToken } from '../../utils/token'
import './AdminLayout.css'

export default function AdminLayout() {
  const navigate = useNavigate()

  const onLogout = async () => {
    try {
      const accessToken = getAccessToken()
      const refreshToken = getRefreshToken()
      if (accessToken) await logoutUser({ accessToken, refreshToken })
    } catch {
      /* clear local */
    }
    clearAuthTokens()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Điều hướng quản trị">
        <div className="admin-sidebar-brand">
          <span className="admin-logo" aria-hidden="true">
            ⚙
          </span>
          <div>
            <strong>Horse Racing</strong>
            <span>Quản trị hệ thống</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
          >
            <span className="admin-nav-icon" aria-hidden="true">
              👥
            </span>
            Quản lý người dùng
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-shell-btn" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="admin-shell-content">
        <Outlet />
      </div>
    </div>
  )
}
