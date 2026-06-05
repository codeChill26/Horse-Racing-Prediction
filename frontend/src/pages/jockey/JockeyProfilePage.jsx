import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import '../../components/jockey/JockeyLayout.css'
import './JockeyProfilePage.css'

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
    <div className="jockey-profile-row">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  )
}

export default function JockeyProfilePage() {
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

  const profileComplete = user?.isProfileComplete === true

  return (
    <div className="jockey-page">
      <div className="jockey-page-inner jockey-profile-page">
        <header className="jockey-profile-header">
          <div>
            <p className="jockey-eyebrow jockey-eyebrow--dark">Hồ sơ hành nghề</p>
            <h1>Thông tin kỵ sĩ</h1>
            <p className="jockey-profile-subtitle">Dữ liệu từ tài khoản đăng ký & hệ thống</p>
          </div>
          <button type="button" className="jockey-refresh-btn" onClick={loadProfile} disabled={loading}>
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        </header>

        {error ? (
          <div className="jockey-alert jockey-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        {loading && !user ? (
          <p className="jockey-profile-loading">Đang tải hồ sơ…</p>
        ) : user ? (
          <>
            <section className="jockey-profile-hero-card">
              <span className="jockey-profile-avatar" aria-hidden="true">
                {initials(user.fullName)}
              </span>
              <div>
                <h2>{user.fullName}</h2>
                <p>{user.email}</p>
                <span
                  className={`jockey-profile-badge${profileComplete ? ' is-complete' : ' is-pending'}`}
                >
                  {profileComplete ? 'Hồ sơ hoàn chỉnh' : 'Cần bổ sung chứng chỉ & cân nặng'}
                </span>
              </div>
            </section>

            <div className="jockey-profile-grid">
              <section className="jockey-profile-card">
                <h3>Hồ sơ kỵ sĩ</h3>
                <dl>
                  <ProfileRow label="Số chứng chỉ" value={user.licenseNumber} />
                  <ProfileRow
                    label="Cân nặng"
                    value={user.weight != null ? `${user.weight} kg` : null}
                  />
                  <ProfileRow label="Tiểu sử" value={user.bio} />
                </dl>
              </section>

              <section className="jockey-profile-card">
                <h3>Liên hệ & tài khoản</h3>
                <dl>
                  <ProfileRow label="Số điện thoại" value={user.phoneNumber} />
                  <ProfileRow label="Vai trò" value={user.role?.code || 'JOCKEY'} />
                  <ProfileRow label="Trạng thái" value={user.isActive ? 'Hoạt động' : 'Không hoạt động'} />
                  <ProfileRow label="Ngày tạo" value={formatDateTime(user.createdAt)} />
                  <ProfileRow label="Cập nhật" value={formatDateTime(user.updatedAt)} />
                </dl>
              </section>
            </div>
          </>
        ) : null}

        <p className="jockey-profile-back">
          <Link to="/jockey">← Về trang chủ</Link>
        </p>
      </div>
    </div>
  )
}
