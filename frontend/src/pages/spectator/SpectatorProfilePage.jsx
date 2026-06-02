import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import './SpectatorProfilePage.css'

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

function ProfileRow({ label, value, mono }) {
  return (
    <div className="profile-row">
      <dt>{label}</dt>
      <dd className={mono ? 'profile-mono' : undefined}>{value ?? '—'}</dd>
    </div>
  )
}

export default function SpectatorProfilePage() {
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

  const balance = user?.pointWallet?.balance
  const walletFrozen = user?.pointWallet?.isFrozen === 1

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner profile-page">
        <header className="profile-page-header">
          <div>
            <p className="profile-eyebrow">Trang cá nhân</p>
            <h1>Hồ sơ khán giả</h1>
            <p className="profile-subtitle">Thông tin tài khoản khán giả của bạn</p>
          </div>
          <button type="button" className="profile-btn profile-btn--outline" onClick={loadProfile} disabled={loading}>
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        </header>

        {error ? (
          <div className="profile-alert profile-alert--error" role="alert">
            {error}
            <Link to="/login" className="profile-link">
              Đăng nhập lại
            </Link>
          </div>
        ) : null}

        {loading && !user ? (
          <div className="profile-loading">
            <div className="profile-spinner" aria-hidden="true" />
            <p>Đang tải hồ sơ…</p>
          </div>
        ) : null}

        {user ? (
          <>
            <section className="profile-hero-card">
              <div className="profile-avatar-wrap">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="profile-avatar-img" />
                ) : (
                  <span className="profile-avatar-fallback">{initials(user.fullName)}</span>
                )}
              </div>
              <div className="profile-hero-body">
                <h2>{user.fullName}</h2>
                <p className="profile-hero-email">{user.email}</p>
                <div className="profile-badges">
                  <span className="profile-badge profile-badge--role">{user.role?.name || 'Spectator'}</span>
                  <span className="profile-badge profile-badge--code">{user.role?.code || 'SPECTATOR'}</span>
                  <span
                    className={`profile-badge${user.isActive ? ' profile-badge--active' : ' profile-badge--inactive'}`}
                  >
                    {user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                  </span>
                  {user.isProfileComplete ? (
                    <span className="profile-badge profile-badge--complete">Hồ sơ đầy đủ</span>
                  ) : null}
                </div>
              </div>
              {user.pointWallet != null ? (
                <aside className="profile-wallet-mini">
                  <span className="profile-wallet-mini-label">Ví điểm</span>
                  <strong>{Number(balance ?? 0).toLocaleString('vi-VN')}</strong>
                  <span className="profile-wallet-mini-unit">điểm</span>
                  {walletFrozen ? <span className="profile-wallet-frozen">Ví đóng băng</span> : null}
                </aside>
              ) : null}
            </section>

            <div className="profile-grid">
              <section className="profile-card">
                <h3>Thông tin liên hệ</h3>
                <dl className="profile-dl">
                  <ProfileRow label="Họ và tên" value={user.fullName} />
                  <ProfileRow label="Email" value={user.email} mono />
                  <ProfileRow label="Số điện thoại" value={user.phoneNumber} mono />
                  <ProfileRow label="Ảnh đại diện (URL)" value={user.avatarUrl || 'Chưa cập nhật'} />
                </dl>
              </section>

              <section className="profile-card">
                <h3>Tài khoản hệ thống</h3>
                <dl className="profile-dl">
                  <ProfileRow label="Mã người dùng" value={`#${user.userId}`} mono />
                  <ProfileRow label="Mã vai trò" value={user.roleId} mono />
                  <ProfileRow label="Vai trò" value={`${user.role?.name} (${user.role?.code})`} />
                  <ProfileRow label="Hồ sơ hoàn chỉnh" value={user.isProfileComplete ? 'Có' : 'Chưa'} />
                  <ProfileRow label="Khóa đến" value={user.lockedUntil ? formatDateTime(user.lockedUntil) : 'Không'} />
                </dl>
              </section>

              <section className="profile-card">
                <h3>Giới thiệu</h3>
                <dl className="profile-dl">
                  <ProfileRow label="Tiểu sử" value={user.bio || 'Chưa có'} />
                </dl>
                {user.licenseNumber || user.weight ? (
                  <>
                    <p className="profile-card-note">Các trường dưới thường dành cho Kỵ sĩ — hiển thị nếu có trong hồ sơ.</p>
                    <dl className="profile-dl">
                      {user.licenseNumber ? (
                        <ProfileRow label="Số chứng chỉ" value={user.licenseNumber} mono />
                      ) : null}
                      {user.weight != null && user.weight !== '' ? (
                        <ProfileRow label="Cân nặng (kg)" value={String(user.weight)} />
                      ) : null}
                    </dl>
                  </>
                ) : null}
              </section>

              <section className="profile-card">
                <h3>Thời gian</h3>
                <dl className="profile-dl">
                  <ProfileRow label="Ngày tạo" value={formatDateTime(user.createdAt)} />
                  <ProfileRow label="Cập nhật lần cuối" value={formatDateTime(user.updatedAt)} />
                </dl>
              </section>
            </div>

            <p className="profile-api-hint">
              <Link to="/spectator" className="profile-link">
                ← Về trang chủ
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
