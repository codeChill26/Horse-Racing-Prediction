import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import '../../components/horseOwner/HorseOwnerLayout.css'
import './HorseOwnerProfilePage.css'

function initials(name) {
  if (!name?.trim()) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ProfileRow({ label, value }) {
  return (
    <div className="owner-profile-row">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  )
}

export default function HorseOwnerProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await getMyProfile(token)
      setUser(data)
    } catch (e) {
      setUser(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  return (
    <div className="owner-page">
      <div className="owner-page-inner owner-profile-page">
        <header className="owner-profile-header">
          <div>
            <p className="owner-eyebrow owner-eyebrow--dark">Hồ sơ chủ trại</p>
            <h1>Thông tin chủ ngựa</h1>
            <p className="owner-profile-subtitle">Quản lý tài khoản & liên hệ giải đấu</p>
          </div>
          <button type="button" className="owner-refresh-btn" onClick={loadProfile} disabled={loading}>
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        </header>

        {error ? (
          <div className="owner-alert owner-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        {loading && !user ? (
          <p className="owner-profile-loading">Đang tải hồ sơ…</p>
        ) : user ? (
          <>
            <section className="owner-profile-hero-card">
              <span className="owner-profile-avatar" aria-hidden="true">
                {initials(user.fullName)}
              </span>
              <div>
                <h2>{user.fullName}</h2>
                <p>{user.email}</p>
                <span className="owner-profile-badge">Chủ ngựa · HORSE_OWNER</span>
              </div>
            </section>

            <div className="owner-profile-grid">
              <section className="owner-profile-card">
                <h3>Liên hệ</h3>
                <dl>
                  <ProfileRow label="Email" value={user.email} />
                  <ProfileRow label="Số điện thoại" value={user.phoneNumber} />
                  <ProfileRow label="Avatar URL" value={user.avatarUrl} />
                </dl>
              </section>

              <section className="owner-profile-card">
                <h3>Tài khoản</h3>
                <dl>
                  <ProfileRow label="User ID" value={user.userId} />
                  <ProfileRow label="Vai trò" value={user.role?.code || 'HORSE_OWNER'} />
                  <ProfileRow label="Trạng thái" value={user.isActive ? 'Hoạt động' : 'Không hoạt động'} />
                  <ProfileRow label="Hồ sơ đầy đủ" value={user.isProfileComplete ? 'Có' : 'Không'} />
                  <ProfileRow label="Ngày tạo" value={formatDateTime(user.createdAt)} />
                  <ProfileRow label="Cập nhật" value={formatDateTime(user.updatedAt)} />
                </dl>
              </section>
            </div>

            {user.bio ? (
              <section className="owner-profile-card owner-profile-card--full">
                <h3>Giới thiệu</h3>
                <p className="owner-profile-bio">{user.bio}</p>
              </section>
            ) : null}
          </>
        ) : null}

        <p className="owner-profile-back">
          <Link to="/horse-owner">← Về trang chủ</Link>
        </p>
      </div>
    </div>
  )
}
