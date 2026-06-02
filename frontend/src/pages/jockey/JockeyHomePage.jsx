import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import '../../components/jockey/JockeyLayout.css'
import './JockeyHomePage.css'

const UPCOMING_ASSIGNMENTS = [
  {
    id: 1,
    race: 'Giải Vô địch mùa xuân 2026',
    horse: 'Thunder Strike',
    venue: 'Trường đua Bình Dương',
    date: '15/06/2026',
    gate: 'Cổng 4',
    status: 'Đã xác nhận',
  },
  {
    id: 2,
    race: 'Cúp Tốc độ Quốc gia',
    horse: 'Golden Arrow',
    venue: 'Trường đua Phú Thọ',
    date: '22/06/2026',
    gate: 'Cổng 2',
    status: 'Chờ phân công',
  },
]

const QUICK_ACTIONS = [
  { icon: '📅', title: 'Lịch thi đấu', desc: 'Xem cuộc đua được phân công', tag: 'Sắp ra mắt' },
  { icon: '🐴', title: 'Ngựa của tôi', desc: 'Thông tin ngựa đang cưỡi', tag: 'Sắp ra mắt' },
  { icon: '📈', title: 'Thành tích', desc: 'Lịch sử về đích & thứ hạng', tag: 'Sắp ra mắt' },
  { icon: '✅', title: 'Hoàn thiện hồ sơ', desc: 'Cập nhật chứng chỉ & cân nặng', tag: 'Hồ sơ' },
]

export default function JockeyHomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showWelcome, setShowWelcome] = useState(() => location.state?.loginSuccess === true)

  const loadProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setLoading(true)
    setError('')
    try {
      const user = await getMyProfile(token)
      setProfile(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (!location.state?.loginSuccess) return
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state?.loginSuccess, navigate])

  useEffect(() => {
    if (!showWelcome) return
    const timer = window.setTimeout(() => setShowWelcome(false), 7000)
    return () => window.clearTimeout(timer)
  }, [showWelcome])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }, [])

  const profileComplete = profile?.isProfileComplete === true
  const displayName = profile?.fullName || 'Kỵ sĩ'
  const firstName = displayName.split(/\s+/).slice(-1)[0] || displayName

  return (
    <div className="jockey-page">
      {showWelcome ? (
        <div className="jockey-toast" role="status" aria-live="polite">
          <span className="jockey-toast-icon" aria-hidden="true">
            ✓
          </span>
          <div className="jockey-toast-body">
            <strong>Đăng nhập thành công!</strong>
            <p>
              Chào mừng <span className="jockey-toast-highlight">{displayName}</span> — bạn đã vào khu vực
              Kỵ sĩ.
            </p>
          </div>
          <button
            type="button"
            className="jockey-toast-close"
            onClick={() => setShowWelcome(false)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="jockey-hero-banner">
        <img
          className="jockey-hero-img"
          src="/images/horse-racing-hero.jpg"
          alt="Kỵ sĩ và ngựa đua trên đường đua"
        />
        <div className="jockey-hero-overlay" />
        <div className="jockey-hero-content">
          <p className="jockey-eyebrow">{greeting}</p>
          <h1>{loading ? 'Đang tải…' : `Xin chào, ${firstName}!`}</h1>
          <p>Quản lý lịch thi đấu, hồ sơ hành nghề và thông tin cuộc đua được phân công.</p>
          <div className="jockey-hero-badges">
            <span className="jockey-badge jockey-badge--role">Kỵ sĩ</span>
            <span
              className={`jockey-badge${profileComplete ? ' jockey-badge--ok' : ' jockey-badge--warn'}`}
            >
              {loading ? '…' : profileComplete ? 'Hồ sơ đã duyệt' : 'Hồ sơ chưa đủ'}
            </span>
          </div>
        </div>
      </section>

      <div className="jockey-page-inner jockey-home-content">
        {error ? (
          <div className="jockey-alert jockey-alert--error" role="alert">
            {error}
            <button type="button" className="jockey-inline-btn" onClick={loadProfile}>
              Thử lại
            </button>
          </div>
        ) : null}

        <div className="jockey-stats-row">
          <article className="jockey-stat-card">
            <p className="jockey-stat-label">Chứng chỉ</p>
            <p className="jockey-stat-value">{loading ? '—' : profile?.licenseNumber || 'Chưa cập nhật'}</p>
          </article>
          <article className="jockey-stat-card">
            <p className="jockey-stat-label">Cân nặng</p>
            <p className="jockey-stat-value">
              {loading ? '—' : profile?.weight != null ? `${profile.weight} kg` : '—'}
            </p>
          </article>
          <article className="jockey-stat-card">
            <p className="jockey-stat-label">Cuộc đua sắp tới</p>
            <p className="jockey-stat-value">{UPCOMING_ASSIGNMENTS.length}</p>
          </article>
          <article className="jockey-stat-card jockey-stat-card--accent">
            <p className="jockey-stat-label">Trạng thái</p>
            <p className="jockey-stat-value">{profile?.isActive ? 'Đang hoạt động' : 'Tạm khóa'}</p>
          </article>
        </div>

        {!loading && !profileComplete ? (
          <div className="jockey-alert jockey-alert--warn" role="status">
            <strong>Hoàn thiện hồ sơ kỵ sĩ</strong>
            <p>
              Vui lòng cập nhật <strong>số chứng chỉ hành nghề</strong> và <strong>cân nặng</strong> trong
              hồ sơ để được xác nhận tham gia giải.
            </p>
            <Link to="/jockey/profile" className="jockey-link-btn">
              Cập nhật hồ sơ →
            </Link>
          </div>
        ) : null}

        <section className="jockey-section">
          <div className="jockey-section-head">
            <h2>Truy cập nhanh</h2>
            <p>Công cụ dành cho kỵ sĩ</p>
          </div>
          <div className="jockey-actions-grid">
            {QUICK_ACTIONS.map((item) => (
              <article key={item.title} className="jockey-action-card">
                <span className="jockey-action-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="jockey-tag">{item.tag}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="jockey-section">
          <div className="jockey-section-head">
            <h2>Phân công sắp tới</h2>
            <p>Lịch cưỡi ngựa — dữ liệu minh họa</p>
          </div>
          <ul className="jockey-assignment-list">
            {UPCOMING_ASSIGNMENTS.map((item) => (
              <li key={item.id} className="jockey-assignment-item">
                <div className="jockey-assignment-main">
                  <h3>{item.race}</h3>
                  <p className="jockey-assignment-horse">Ngựa: {item.horse}</p>
                  <p>
                    {item.venue} · {item.date} · {item.gate}
                  </p>
                </div>
                <span className="jockey-assignment-status">{item.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
