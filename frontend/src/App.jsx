<<<<<<< Updated upstream
import './App.css'
=======
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireRole from './components/RequireRole'
import AdminLayout from './components/admin/AdminLayout'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import ForgotPasswordPage from './pages/LoginPage/ForgotPasswordPage'
import LoginPage from './pages/LoginPage/LoginPage'
import ResetPasswordPage from './pages/LoginPage/ResetPasswordPage'
import RegisterPage from './pages/registerPage/RegisterPage'
import HorseOwnerLayout from './components/horseOwner/HorseOwnerLayout'
import JockeyLayout from './components/jockey/JockeyLayout'
import HorseOwnerHomePage from './pages/horseOwner/HorseOwnerHomePage'
import HorseOwnerProfilePage from './pages/horseOwner/HorseOwnerProfilePage'
import JockeyHomePage from './pages/jockey/JockeyHomePage'
import JockeyProfilePage from './pages/jockey/JockeyProfilePage'
import SpectatorLayout from './components/spectator/SpectatorLayout'
import SpectatorHomePage from './pages/spectator/SpectatorHomePage'
import SpectatorProfilePage from './pages/spectator/SpectatorProfilePage'
>>>>>>> Stashed changes

import { useCallback, useEffect, useMemo, useState } from 'react'

const ROLE_CODES = ['ADMIN', 'RACE_REFEREE', 'HORSE_OWNER', 'JOCKEY', 'SPECTATOR']

async function readErrorFromResponse(res) {
  try {
    const data = await res.json()
    return data?.error || data?.message || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

async function apiListUsers({ accessToken, roleCode }) {
  const qs = roleCode ? `?roleCode=${encodeURIComponent(roleCode)}` : ''
  const res = await fetch(`/api/admin/users${qs}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) throw new Error(await readErrorFromResponse(res))
  const data = await res.json()
  return Array.isArray(data?.users) ? data.users : []
}

async function apiToggleIsActive({ accessToken, userId }) {
  const res = await fetch(`/api/admin/users/${userId}/toggle-active`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) throw new Error(await readErrorFromResponse(res))
  const data = await res.json()
  return data?.user
}

async function apiChangeRole({ accessToken, userId, roleCode }) {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ roleCode, confirm: true }),
  })
  if (!res.ok) throw new Error(await readErrorFromResponse(res))
  const data = await res.json()
  return data?.user
}

function App() {
<<<<<<< Updated upstream
  const [tokenInput, setTokenInput] = useState(() => localStorage.getItem('accessToken') || '')
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken') || '')
  const [roleFilter, setRoleFilter] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)

  const roleOptions = useMemo(() => {
    const fromUsers = new Set(users.map((u) => u?.role?.code).filter(Boolean))
    const merged = new Set([...ROLE_CODES, ...fromUsers])
    return Array.from(merged)
  }, [users])

  const saveToken = useCallback(() => {
    const trimmed = tokenInput.trim()
    localStorage.setItem('accessToken', trimmed)
    setAccessToken(trimmed)
    setError('')
  }, [tokenInput])

  const loadUsers = useCallback(async () => {
    if (!accessToken) {
      setUsers([])
      return
    }

    setLoading(true)
    setError('')
    try {
      const list = await apiListUsers({ accessToken, roleCode: roleFilter || undefined })
      setUsers(list)
    } catch (e) {
      setUsers([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [accessToken, roleFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const onToggleActive = useCallback(
    async (user) => {
      if (!accessToken) return
      setBusyUserId(user.userId)
      setError('')
      try {
        const updated = await apiToggleIsActive({ accessToken, userId: user.userId })
        setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? { ...u, ...updated } : u)))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusyUserId(null)
      }
    },
    [accessToken],
  )

  const onChangeRole = useCallback(
    async (user, nextRoleCode) => {
      const currentRoleCode = user?.role?.code
      if (!accessToken || !nextRoleCode || nextRoleCode === currentRoleCode) return

      const ok = window.confirm(
        `CẢNH BÁO: Bạn sắp đổi role của user #${user.userId} (${user.email})\n\n${currentRoleCode} -> ${nextRoleCode}\n\nXác nhận đổi role?`,
      )
      if (!ok) return

      setBusyUserId(user.userId)
      setError('')
      try {
        const updated = await apiChangeRole({ accessToken, userId: user.userId, roleCode: nextRoleCode })
        setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? { ...u, ...updated } : u)))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusyUserId(null)
      }
    },
    [accessToken],
  )

  return (
    <main className="admin-page">
      <header className="admin-header">
        <h1>Admin Users</h1>
        <p className="admin-subtitle">
          Xem danh sách user, lọc theo Role, khóa/mở khóa (isActive), và đổi Role.
        </p>
      </header>

      <section className="admin-toolbar" aria-label="Admin toolbar">
        <label className="field">
          <span className="label">Access Token</span>
          <input
            className="input"
            type="password"
            placeholder="Paste Bearer token (không gồm 'Bearer ')"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
        </label>
        <button className="btn" type="button" onClick={saveToken}>
          Dùng token
        </button>

        <label className="field">
          <span className="label">Filter Role</span>
          <select
            className="select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={!accessToken}
          >
            <option value="">ALL</option>
            {roleOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>

        <button className="btn" type="button" onClick={loadUsers} disabled={!accessToken || loading}>
          Reload
        </button>
      </section>

      {!accessToken ? (
        <section className="admin-note">
          <p>
            Cần Access Token của tài khoản có role <strong>ADMIN</strong> để gọi API.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="admin-error" role="alert">
          {error}
        </section>
      ) : null}

      <section className="admin-table-wrap" aria-label="Users table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Full name</th>
              <th>Role</th>
              <th>isActive</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6}>No users</td>
              </tr>
            ) : (
              users.map((u) => {
                const disabled = busyUserId === u.userId
                const currentRoleCode = u?.role?.code || ''

                return (
                  <tr key={u.userId}>
                    <td className="mono">{u.userId}</td>
                    <td>{u.email}</td>
                    <td>{u.fullName}</td>
                    <td>
                      <select
                        className="select"
                        value={currentRoleCode}
                        onChange={(e) => onChangeRole(u, e.target.value)}
                        disabled={!accessToken || disabled}
                      >
                        {roleOptions.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                        {!roleOptions.includes(currentRoleCode) ? (
                          <option value={currentRoleCode}>{currentRoleCode}</option>
                        ) : null}
                      </select>
                    </td>
                    <td>{u.isActive ? 'true' : 'false'}</td>
                    <td>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => onToggleActive(u)}
                        disabled={!accessToken || disabled}
                      >
                        {u.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
=======
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole role="ADMIN">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminUsersPage />} />
        </Route>
        <Route
          path="/spectator"
          element={
            <RequireRole role="SPECTATOR">
              <SpectatorLayout />
            </RequireRole>
          }
        >
          <Route index element={<SpectatorHomePage />} />
          <Route path="profile" element={<SpectatorProfilePage />} />
        </Route>
        <Route
          path="/jockey"
          element={
            <RequireRole role="JOCKEY">
              <JockeyLayout />
            </RequireRole>
          }
        >
          <Route index element={<JockeyHomePage />} />
          <Route path="profile" element={<JockeyProfilePage />} />
        </Route>
        <Route
          path="/horse-owner"
          element={
            <RequireRole role="HORSE_OWNER">
              <HorseOwnerLayout />
            </RequireRole>
          }
        >
          <Route index element={<HorseOwnerHomePage />} />
          <Route path="profile" element={<HorseOwnerProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
>>>>>>> Stashed changes
  )
}

export default App
