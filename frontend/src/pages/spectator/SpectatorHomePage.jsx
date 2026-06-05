import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import '../../components/spectator/SpectatorLayout.css'
import './SpectatorHomePage.css'

const UPCOMING_RACES = [
  {
    id: 1,
    name: 'Giải Vô địch mùa xuân 2026',
    venue: 'Trường đua Bình Dương',
    date: '15/06/2026',
    time: '14:30',
    status: 'Sắp diễn ra',
  },
  {
    id: 2,
    name: 'Cúp Tốc độ Quốc gia',
    venue: 'Trường đua Phú Thọ',
    date: '22/06/2026',
    time: '09:00',
    status: 'Mở đăng ký dự đoán',
  },
  {
    id: 3,
    name: 'Đua marathon 2400m',
    venue: 'Trường đua Long An',
    date: '29/06/2026',
    time: '16:00',
    status: 'Chuẩn bị',
  },
]

const QUICK_ACTIONS = [
  { icon: '🏇', title: 'Lịch đua', desc: 'Xem giải & lịch thi đấu', tag: 'Sắp ra mắt' },
  { icon: '🎯', title: 'Dự đoán', desc: 'Đặt dự đoán kết quả cuộc đua', tag: 'Sắp ra mắt' },
  { icon: '📊', title: 'Bảng xếp hạng', desc: 'Theo dõi thứ hạng realtime', tag: 'Sắp ra mắt' },
  { icon: '🎁', title: 'Phần thưởng', desc: 'Nhận thông báo thưởng dự đoán', tag: 'Sắp ra mắt' },
]

export default function SpectatorHomePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const balance = profile?.pointWallet?.balance ?? 0
  const isFrozen = profile?.pointWallet?.isFrozen === 1

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }, [])

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner spectator-home-content">
        <header className="spectator-home-intro">
          <h1>Bảng điều khiển</h1>
          <p>Theo dõi giải đua, dự đoán và quản lý điểm thưởng.</p>
        </header>

        <div className="spectator-main">
          {error ? (
          <div className="spectator-alert spectator-alert--error" role="alert">
            {error}
            <button type="button" className="spectator-btn spectator-btn--ghost" onClick={loadProfile}>
              Thử lại
            </button>
          </div>
          ) : null}

          <section className="spectator-hero">
          <div className="spectator-hero-text">
            <p className="spectator-eyebrow">{greeting}</p>
            <h1>{loading ? 'Đang tải…' : `Xin chào, ${profile?.fullName?.split(' ').slice(-1)[0] || 'bạn'}!`}</h1>
            <p>
              Theo dõi giải đua, đặt dự đoán và nhận thưởng điểm — tất cả trên một bảng điều khiển dành cho
              khán giả.
            </p>
          </div>

          <aside className="spectator-wallet-card">
            <p className="spectator-wallet-label">Số dư ví điểm</p>
            <p className="spectator-wallet-balance">
              {loading ? '—' : balance.toLocaleString('vi-VN')}
              <span> điểm</span>
            </p>
            {isFrozen ? (
              <p className="spectator-wallet-warn">Ví đang tạm khóa — liên hệ hỗ trợ.</p>
            ) : (
              <p className="spectator-wallet-hint">Thưởng đăng ký: +100 điểm cho tài khoản mới</p>
            )}
          </aside>
          </section>

          <section className="spectator-section">
            <div className="spectator-section-head">
              <h2>Truy cập nhanh</h2>
            <p>Các tính năng dành cho khán giả</p>
          </div>
          <div className="spectator-actions-grid">
            {QUICK_ACTIONS.map((item) => (
              <article key={item.title} className="spectator-action-card">
                <span className="spectator-action-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="spectator-tag">{item.tag}</span>
              </article>
            ))}
          </div>
        </section>

        <div className="spectator-columns">
          <section className="spectator-section">
            <div className="spectator-section-head">
              <h2>Giải đấu sắp tới</h2>
              <p>Lịch đua — dữ liệu minh họa</p>
            </div>
            <ul className="spectator-race-list">
              {UPCOMING_RACES.map((race) => (
                <li key={race.id} className="spectator-race-item">
                  <div>
                    <h3>{race.name}</h3>
                    <p>
                      {race.venue} · {race.date} · {race.time}
                    </p>
                  </div>
                  <span className="spectator-race-status">{race.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="spectator-section">
            <div className="spectator-section-head">
              <h2>Dự đoán của bạn</h2>
              <p>Kết quả & lịch sử dự đoán</p>
            </div>
            <div className="spectator-empty-card">
              <span className="spectator-empty-icon" aria-hidden="true">
                🎯
              </span>
              <p>Chưa có dự đoán nào.</p>
              <span className="spectator-tag">API dự đoán sẽ kết nối sau</span>
            </div>

            <div className="spectator-section-head spectator-section-head--spaced">
              <h2>Bảng xếp hạng</h2>
              <p>Top khán giả tuần này (minh họa)</p>
            </div>
            <ol className="spectator-leaderboard">
              <li>
                <span className="rank">1</span>
                <span className="name">Nguyễn Văn A</span>
                <span className="pts">2.450 điểm</span>
              </li>
              <li>
                <span className="rank">2</span>
                <span className="name">Trần Thị B</span>
                <span className="pts">2.120 điểm</span>
              </li>
              <li>
                <span className="rank">3</span>
                <span className="name">Lê Văn C</span>
                <span className="pts">1.980 điểm</span>
              </li>
            </ol>
          </section>
        </div>
        </div>
      </div>
    </div>
  )
}
