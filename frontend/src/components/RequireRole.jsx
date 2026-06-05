import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken, getHomePathForRole, getStoredAuthRole, normalizeRole } from '../utils/token'

export default function RequireRole({ role, children }) {
  const location = useLocation()
  const token = getAccessToken()
  const currentRole = getStoredAuthRole()
  const requiredRole = normalizeRole(role)

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredRole && currentRole !== requiredRole) {
    const home = getHomePathForRole(currentRole)
    if (home) return <Navigate to={home} replace />
    return <Navigate to="/login" replace />
  }

  return children
}
