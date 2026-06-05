import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import '../../components/horseOwner/HorseOwnerLayout.css'
import './HorseOwnerHomePage.css'

const FEATURED_TOURNAMENT = {
  name: 'Cúp Chủ ngựa Đông Nam Á 2026',
  tagline: 'Giải đấu đua ngựa chuyên nghiệp',
  venue: 'Trường đua Quốc gia Long Bình',
  period: '15/06 – 30/06/2026',
  prizePool: '500.000.000 ₫',
  registeredHorses: 24,
  maxHorses: 32,
  distance: '1.600m – 2.400m',
  status: 'Đang mở đăng ký',
}

const MY_HORSES = [
  { id: 1, name: 'Thunder Strike', breed: 'Thoroughbred', age: 4, wins: 3, nextRace: 'Cúp Đông Nam Á' },
  { id: 2, name: 'Golden Arrow', breed: 'Arabian', age: 5, wins: 5, nextRace: 'Cúp Tốc độ QG' },
  { id: 3, name: 'Midnight Star', breed: 'Thoroughbred', age: 3, wins: 1, nextRace: 'Chưa phân công' },
]

const QUICK_ACTIONS = [
  { icon: '🏆', title: 'Đăng ký giải', desc: 'Gửi ngựa tham gia giải đấu', tag: 'Giải nổi bật' },
  { icon: '🐴', title: 'Quản lý ngựa', desc: 'Danh sách & hồ sơ từng con', tag: 'Sắp ra mắt' },
  { icon: '📋', title: 'Hợp đồng kỵ sĩ', desc: 'Phân công kỵ sĩ cho ngựa', tag: 'Sắp ra mắt' },
  { icon: '📊', title: 'Báo cáo thành tích', desc: 'Thống kê về đích theo mùa', tag: 'Sắp ra mắt' },
]

export default function HorseOwnerHomePage() {
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

  const displayName = profile?.fullName || 'Chủ ngựa'
  const firstName = displayName.split(/\s+/).slice(-1)[0] || displayName
  const registrationPct = Math.round(
    (FEATURED_TOURNAMENT.registeredHorses / FEATURED_TOURNAMENT.maxHorses) * 100,
  )

  return (
    <div className="owner-page">
      {showWelcome ? (
        <div className="owner-toast" role="status" aria-live="polite">
          <span className="owner-toast-icon" aria-hidden="true">
            ✓
          </span>
          <div className="owner-toast-body">
            <strong>Đăng nhập thành công!</strong>
            <p>
              Chào mừng <span className="owner-toast-highlight">{displayName}</span> — khu vực Chủ ngựa đã sẵn
              sàng.
            </p>
          </div>
          <button
            type="button"
            className="owner-toast-close"
            onClick={() => setShowWelcome(false)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="owner-hero-banner">
        <img
          className="owner-hero-img"
          src="/images/horse-racing-hero.jpg"
          alt="Giải đấu đua ngựa — ngựa và jockey trên đường đua"
        />
        <div className="owner-hero-overlay" />
        <div className="owner-hero-content">
          <p className="owner-eyebrow">{greeting}</p>
          <h1>{loading ? 'Đang tải…' : `Xin chào, ${firstName}!`}</h1>
          <p>Quản lý đội ngựa, đăng ký giải đấu và theo dõi thành tích trên sân đua.</p>
          <span className="owner-hero-role">Chủ ngựa · Horse Owner</span>
        </div>
      </section>

      <div className="owner-page-inner owner-home-content">
        {error ? (
          <div className="owner-alert owner-alert--error" role="alert">
            {error}
            <button type="button" className="owner-inline-btn" onClick={loadProfile}>
              Thử lại
            </button>
          </div>
        ) : null}

        <section className="owner-tournament-card" aria-labelledby="featured-tournament-title">
          <div className="owner-tournament-visual">
            <img
              src="/images/horse-racing-hero.jpg"
              alt=""
              className="owner-tournament-img"
              aria-hidden="true"
            />
            <div className="owner-tournament-visual-overlay" />
            <span className="owner-tournament-badge">Giải đấu nổi bật</span>
          </div>
          <div className="owner-tournament-body">
            <p className="owner-eyebrow owner-eyebrow--dark">{FEATURED_TOURNAMENT.tagline}</p>
            <h2 id="featured-tournament-title">{FEATURED_TOURNAMENT.name}</h2>
            <ul className="owner-tournament-meta">
              <li>
                <span className="owner-meta-label">Địa điểm</span>
                <span>{FEATURED_TOURNAMENT.venue}</span>
              </li>
              <li>
                <span className="owner-meta-label">Thời gian</span>
                <span>{FEATURED_TOURNAMENT.period}</span>
              </li>
              <li>
                <span className="owner-meta-label">Cự ly</span>
                <span>{FEATURED_TOURNAMENT.distance}</span>
              </li>
              <li>
                <span className="owner-meta-label">Giải thưởng</span>
                <span className="owner-meta-prize">{FEATURED_TOURNAMENT.prizePool}</span>
              </li>
            </ul>
            <div className="owner-tournament-progress">
              <div className="owner-tournament-progress-head">
                <span>Đăng ký ngựa</span>
                <span>
                  {FEATURED_TOURNAMENT.registeredHorses}/{FEATURED_TOURNAMENT.maxHorses} ({registrationPct}%)
                </span>
              </div>
              <div className="owner-progress-bar" role="progressbar" aria-valuenow={registrationPct} aria-valuemin={0} aria-valuemax={100}>
                <div className="owner-progress-fill" style={{ width: `${registrationPct}%` }} />
              </div>
            </div>
            <div className="owner-tournament-footer">
              <span className="owner-tournament-status">{FEATURED_TOURNAMENT.status}</span>
              <button type="button" className="owner-cta-btn" disabled title="Sắp ra mắt">
                Đăng ký ngựa tham gia
              </button>
            </div>
          </div>
        </section>

        <div className="owner-stats-row">
          <article className="owner-stat-card">
            <p className="owner-stat-label">Ngựa trong trại</p>
            <p className="owner-stat-value">{MY_HORSES.length}</p>
          </article>
          <article className="owner-stat-card">
            <p className="owner-stat-label">Tổng chiến thắng</p>
            <p className="owner-stat-value">{MY_HORSES.reduce((s, h) => s + h.wins, 0)}</p>
          </article>
          <article className="owner-stat-card">
            <p className="owner-stat-label">Giải sắp tới</p>
            <p className="owner-stat-value">2</p>
          </article>
          <article className="owner-stat-card owner-stat-card--accent">
            <p className="owner-stat-label">Liên hệ</p>
            <p className="owner-stat-value owner-stat-value--sm">
              {loading ? '—' : profile?.phoneNumber || '—'}
            </p>
          </article>
        </div>

        <section className="owner-section">
          <div className="owner-section-head">
            <h2>Truy cập nhanh</h2>
            <p>Công cụ dành cho chủ ngựa</p>
          </div>
          <div className="owner-actions-grid">
            {QUICK_ACTIONS.map((item) => (
              <article key={item.title} className="owner-action-card">
                <span className="owner-action-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="owner-tag">{item.tag}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <h2>Ngựa của bạn</h2>
            <p>Danh sách minh họa — API quản lý ngựa sẽ kết nối sau</p>
          </div>
          <ul className="owner-horse-list">
            {MY_HORSES.map((horse) => (
              <li key={horse.id} className="owner-horse-item">
                <div className="owner-horse-icon" aria-hidden="true">
                  🐴
                </div>
                <div className="owner-horse-main">
                  <h3>{horse.name}</h3>
                  <p>
                    {horse.breed} · {horse.age} tuổi · {horse.wins} chiến thắng
                  </p>
                </div>
                <div className="owner-horse-next">
                  <span className="owner-horse-next-label">Giải kế tiếp</span>
                  <span>{horse.nextRace}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="owner-profile-link">
          <Link to="/horse-owner/profile">Xem hồ sơ chủ ngựa →</Link>
        </p>
      </div>
    </div>
  )
}
