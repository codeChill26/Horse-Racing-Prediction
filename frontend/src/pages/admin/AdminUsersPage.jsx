import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  changeAdminUserRole,
  deleteAdminUser,
  listAdminUsers,
  toggleAdminUserActive,
} from '../../api/admin'
import { getAccessToken } from '../../utils/token'
import AdminIconButton from '../../components/admin/AdminIconButton'
import { IconEdit, IconLock, IconRefresh, IconTrash, IconUnlock, IconUserPlus } from '../../components/admin/AdminIcons'
import '../../components/admin/AdminLayout.css'
import AdminUserModal from './AdminUserModal'
import './AdminUsersPage.css'

const ROLE_CODES = ['ADMIN', 'RACE_REFEREE', 'HORSE_OWNER', 'JOCKEY', 'SPECTATOR']

const ROLE_LABELS = {
  ADMIN: 'Quản trị',
  RACE_REFEREE: 'Trọng tài',
  HORSE_OWNER: 'Chủ ngựa',
  JOCKEY: 'Kỵ sĩ',
  SPECTATOR: 'Khán giả',
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)
  const [modal, setModal] = useState(null)
  const [showWelcome, setShowWelcome] = useState(() => location.state?.loginSuccess === true)

  const loadUsers = useCallback(async () => {
    if (!getAccessToken()) {
      navigate('/login', { replace: true })
      return
    }

    setLoading(true)
    setError('')
    try {
      const list = await listAdminUsers(roleFilter || undefined)
      setUsers(list)
    } catch (e) {
      setUsers([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [navigate, roleFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (!location.state?.loginSuccess) return
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state?.loginSuccess, navigate])

  useEffect(() => {
    if (!showWelcome) return
    const t = window.setTimeout(() => setShowWelcome(false), 7000)
    return () => window.clearTimeout(t)
  }, [showWelcome])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        String(u.userId).includes(q),
    )
  }, [users, search])

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length
    const byRole = ROLE_CODES.reduce((acc, code) => {
      acc[code] = users.filter((u) => u.role?.code === code).length
      return acc
    }, {})
    return { total: users.length, active, inactive: users.length - active, byRole }
  }, [users])

  const onToggleActive = async (user) => {
    setBusyUserId(user.userId)
    setError('')
    try {
      const updated = await toggleAdminUserActive(user.userId)
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? { ...u, ...updated } : u)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyUserId(null)
    }
  }

  const onQuickRoleChange = async (user, nextRoleCode) => {
    if (nextRoleCode === user.role?.code) return
    const ok = window.confirm(
      `Đổi vai trò user #${user.userId} (${user.email})\n\n${user.role?.code} → ${nextRoleCode}?`,
    )
    if (!ok) return

    setBusyUserId(user.userId)
    setError('')
    try {
      const updated = await changeAdminUserRole(user.userId, nextRoleCode)
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? { ...u, ...updated } : u)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyUserId(null)
    }
  }

  const onDeactivate = async (user) => {
    const ok = window.confirm(
      `Vô hiệu hóa user #${user.userId} (${user.email})?\n\nDELETE sẽ đặt isActive = false và thu hồi phiên.`,
    )
    if (!ok) return

    setBusyUserId(user.userId)
    setError('')
    try {
      const updated = await deleteAdminUser(user.userId)
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? { ...u, ...updated } : u)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyUserId(null)
    }
  }

  const onUserSaved = (user) => {
    if (!user?.userId) {
      loadUsers()
      return
    }
    setUsers((prev) => {
      const exists = prev.some((u) => u.userId === user.userId)
      if (exists) return prev.map((u) => (u.userId === user.userId ? { ...u, ...user } : u))
      return [user, ...prev]
    })
  }

  return (
    <div className="admin-dashboard">
      {showWelcome ? (
        <div className="admin-toast" role="status">
          <span className="admin-toast-icon" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Đăng nhập quản trị thành công!</strong>
            <p>Chào mừng đến bảng điều khiển quản lý người dùng.</p>
          </div>
          <button type="button" className="admin-toast-close" onClick={() => setShowWelcome(false)}>
            ×
          </button>
        </div>
      ) : null}

      <section className="admin-hero">
        <img
          className="admin-hero-img"
          src="/images/horse-racing-hero.jpg"
          alt="Giải đua ngựa — quản trị hệ thống"
        />
        <div className="admin-hero-overlay" />
        <div className="admin-hero-content">
          <p className="admin-eyebrow">Bảng điều khiển</p>
          <h1>Quản lý người dùng</h1>
          <p>CRUD qua API admin — danh sách, tạo, sửa, vô hiệu hóa và đổi vai trò.</p>
        </div>
      </section>

      <div className="admin-dashboard-inner">
        <div className="admin-stats">
          <article className="admin-stat-card">
            <p className="admin-stat-label">Tổng người dùng</p>
            <p className="admin-stat-value">{loading ? '—' : stats.total}</p>
          </article>
          <article className="admin-stat-card admin-stat-card--success">
            <p className="admin-stat-label">Đang hoạt động</p>
            <p className="admin-stat-value">{loading ? '—' : stats.active}</p>
          </article>
          <article className="admin-stat-card admin-stat-card--muted">
            <p className="admin-stat-label">Đã vô hiệu</p>
            <p className="admin-stat-value">{loading ? '—' : stats.inactive}</p>
          </article>
          <article className="admin-stat-card admin-stat-card--accent">
            <p className="admin-stat-label">Vai trò phổ biến</p>
            <p className="admin-stat-value admin-stat-value--sm">
              {loading
                ? '—'
                : Object.entries(stats.byRole).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}
            </p>
          </article>
        </div>

        <section className="admin-toolbar" aria-label="Bộ lọc và thao tác">
          <label className="admin-toolbar-field admin-toolbar-field--grow">
            <span>Tìm kiếm</span>
            <input
              type="search"
              placeholder="Email, họ tên, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="admin-toolbar-field">
            <span>Lọc vai trò</span>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Tất cả</option>
              {ROLE_CODES.map((code) => (
                <option key={code} value={code}>
                  {ROLE_LABELS[code] || code}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--with-icon" onClick={loadUsers} disabled={loading}>
            <IconRefresh size={17} />
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--with-icon"
            onClick={() => setModal({ mode: 'create' })}
          >
            <IconUserPlus size={17} />
            Tạo người dùng
          </button>
        </section>

        {error ? (
          <div className="admin-banner admin-banner--error" role="alert">
            {error}
          </div>
        ) : null}

        <section className="admin-table-section" aria-label="Bảng người dùng">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Điện thoại</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      Đang tải danh sách…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      Không có người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const busy = busyUserId === u.userId
                    const role = u.role?.code || ''

                    return (
                      <tr key={u.userId} className={!u.isActive ? 'admin-row--inactive' : undefined}>
                        <td className="admin-mono">{u.userId}</td>
                        <td>
                          <div className="admin-user-cell">
                            <span className="admin-user-avatar" aria-hidden="true">
                              {(u.fullName || u.email || '?')[0].toUpperCase()}
                            </span>
                            <div>
                              <strong>{u.fullName || '—'}</strong>
                              <span className="admin-user-email">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            className="admin-select-inline"
                            value={role}
                            disabled={busy}
                            onChange={(e) => onQuickRoleChange(u, e.target.value)}
                          >
                            {ROLE_CODES.map((code) => (
                              <option key={code} value={code}>
                                {ROLE_LABELS[code] || code}
                              </option>
                            ))}
                            {role && !ROLE_CODES.includes(role) ? (
                              <option value={role}>{role}</option>
                            ) : null}
                          </select>
                        </td>
                        <td>
                          <span className={`admin-status-pill${u.isActive ? ' is-on' : ' is-off'}`}>
                            {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                          </span>
                        </td>
                        <td>{u.phoneNumber || '—'}</td>
                        <td>
                          <div className="admin-row-actions">
                            <AdminIconButton
                              label="Sửa người dùng"
                              variant="edit"
                              disabled={busy}
                              onClick={() => setModal({ mode: 'edit', userId: u.userId })}
                            >
                              <IconEdit />
                            </AdminIconButton>
                            <AdminIconButton
                              label={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              variant={u.isActive ? 'warn' : 'success'}
                              disabled={busy}
                              onClick={() => onToggleActive(u)}
                            >
                              {u.isActive ? <IconLock /> : <IconUnlock />}
                            </AdminIconButton>
                            <AdminIconButton
                              label="Vô hiệu hóa người dùng"
                              variant="danger"
                              disabled={busy || !u.isActive}
                              onClick={() => onDeactivate(u)}
                            >
                              <IconTrash />
                            </AdminIconButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="admin-table-foot">
            Hiển thị {filteredUsers.length}/{users.length} người dùng
            {roleFilter ? ` · lọc: ${roleFilter}` : ''}
          </p>
        </section>
      </div>

      {modal ? (
        <AdminUserModal
          mode={modal.mode}
          userId={modal.userId}
          onClose={() => setModal(null)}
          onSaved={onUserSaved}
        />
      ) : null}
    </div>
  )
}
