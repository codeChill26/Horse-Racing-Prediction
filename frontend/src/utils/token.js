export function normalizeRole(role) {
  if (!role) return null
  const s = String(role).trim().toUpperCase().replace(/\s+/g, "_")
  // Backend schema uses "Referee" not "REFEREE"
  if (s === "REFEREE" || s === "RACE_REFEREE" || s === "REFREE") return "REFEREE"
  return s
}

export function getHomePathForRole(role) {
  switch (normalizeRole(role)) {
    case 'ADMIN':
      return '/admin'
    case 'SPECTATOR':
      return '/spectator'
    case 'JOCKEY':
      return '/jockey'
    case 'HORSE_OWNER':
      return '/horse-owner'
    case 'REFEREE':
    case 'RACE_REFEREE':
      return '/referee'
    default:
      return null
  }
}

export function getAccessToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || ''
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken') || ''
}

export function clearAuthTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
}

/** Ghi token vào đúng một nơi — tránh token cũ trong localStorage gây sai role */
export function setAuthTokens({ accessToken, refreshToken, remember }) {
  clearAuthTokens()
  const store = remember ? localStorage : sessionStorage
  store.setItem('accessToken', accessToken)
  if (refreshToken) store.setItem('refreshToken', refreshToken)
}

export function parseJwtPayload(token) {
  if (!token) return null
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function getStoredAuthRole() {
  return normalizeRole(parseJwtPayload(getAccessToken())?.role)
}
