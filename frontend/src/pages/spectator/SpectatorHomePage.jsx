/**
 * SpectatorHomePage - Trang chủ Spectator
 * Màu sắc đồng bộ với admin dashboard
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { bettingService } from '../../services/bettingService'
import './SpectatorHomePage.css'

// Mock bảng xếp hạng
const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Nguyễn Văn A', points: 2450 },
  { rank: 2, name: 'Trần Thị B', points: 2120 },
  { rank: 3, name: 'Lê Văn C', points: 1980 },
  { rank: 4, name: 'Phạm Thị D', points: 1750 },
  { rank: 5, name: 'Hoàng Văn E', points: 1600 },
]

function StatCard({ icon, label, value, accentColor }) {
  return (
    <div className="sp-stat-card">
      <div className="sp-stat-card__accent" style={{ background: accentColor }} />
      <span className="sp-stat-card__icon">{icon}</span>
      <div className="sp-stat-card__body">
        <p className="sp-stat-card__label">{label}</p>
        <p className="sp-stat-card__value">{value}</p>
      </div>
    </div>
  )
}

function RaceCard({ race, onBet }) {
  const canBet = race.status === 'Scheduled' || race.status === 'Registrations Open' || race.status === 'Upcoming'

  return (
    <div className="sp-race-card">
      {/* Thumbnail */}
      <div className="sp-race-card__thumb">
        <img
          src={race.trackImage || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&q=80'}
          alt={race.title}
          className="sp-race-card__img"
          referrerPolicy="no-referrer"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&q=80' }}
        />
        <div className="sp-race-card__status-badge">
          {race.status === 'Scheduled' ? 'SCHEDULED' : race.status === 'Registrations Open' ? 'REG OPEN' : race.status?.toUpperCase()}
        </div>
        {race.startsIn && (
          <div className="sp-race-card__countdown">
            Starts in {race.startsIn}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="sp-race-card__body">
        <div className="sp-race-card__meta">
          <p className="sp-race-card__title">{race.title}</p>
          <p className="sp-race-card__info">
            {race.classLabel} • {race.distance} • {race.surface}
          </p>
        </div>

        <div className="sp-race-card__odds">
          <span className="sp-race-card__odds-label">Top Favorite Odds</span>
          <span className="sp-race-card__odds-value">{race.topFavoriteOdds}</span>
        </div>

        <button
          type="button"
          className="sp-btn sp-btn--bet"
          onClick={() => onBet(race)}
          disabled={!canBet}
        >
          Đặt cược ngay
        </button>
      </div>
    </div>
  )
}

function BettingModal({ race, profile, onClose, onSuccess }) {
  const [selectedHorse, setSelectedHorse] = useState(null)
  const [amount, setAmount] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const horses = race?.horses || race?.entries || []
  const balance = profile?.pointWallet?.balance ?? 0

  const handlePlaceBet = async () => {
    if (!selectedHorse) {
      setError('Vui lòng chọn một con ngựa để đặt cược.')
      return
    }

    const pts = parseInt(amount)
    if (!pts || pts <= 0) {
      setError('Vui lòng nhập số điểm hợp lệ.')
      return
    }
    if (pts > balance) {
      setError(`Số dư không đủ. Bạn chỉ có ${balance.toLocaleString('vi-VN')} điểm.`)
      return
    }
    if (pts < 10) {
      setError('Số điểm đặt cược tối thiểu là 10.')
      return
    }
    if (pts > 10000) {
      setError('Số điểm đặt cược tối đa là 10.000.')
      return
    }

    setPlacing(true)
    setError('')
    setSuccess('')

    try {
      await bettingService.placeBet({
        raceId: race.id,
        horseId: selectedHorse.id,
        amount: pts,
      })
      setSuccess(`Đặt cược thành công ${pts.toLocaleString('vi-VN')} điểm cho ${selectedHorse.name}!`)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đặt cược thất bại. Vui lòng thử lại.')
    } finally {
      setPlacing(false)
    }
  }

  const potentialWin = selectedHorse && amount
    ? (parseInt(amount) * (parseFloat(selectedHorse.odds || 2.0))).toLocaleString('vi-VN')
    : null

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sp-modal__header">
          <div>
            <p className="sp-modal__eyebrow">Đặt cược</p>
            <h3 className="sp-modal__title">{race?.title}</h3>
          </div>
          <button type="button" className="sp-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="sp-modal__body">
          {/* Số dư */}
          <div className="sp-modal__balance">
            <span className="sp-modal__balance-label">Số dư khả dụng</span>
            <span className="sp-modal__balance-value">
              {balance.toLocaleString('vi-VN')} <span>điểm</span>
            </span>
          </div>

          {error && <div className="sp-alert sp-alert--error">{error}</div>}
          {success && <div className="sp-alert sp-alert--success">{success}</div>}

          {/* Chọn ngựa */}
          <div className="sp-modal__section">
            <p className="sp-modal__section-label">Chọn ngựa đặt cược</p>
            <div className="sp-horse-list">
              {horses.length > 0 ? horses.map(horse => (
                <button
                  key={horse.id}
                  type="button"
                  className={`sp-horse-card ${selectedHorse?.id === horse.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedHorse(horse)}
                >
                  <div className="sp-horse-card__info">
                    <p className="sp-horse-card__name">{horse.name || horse.horseName}</p>
                    <p className="sp-horse-card__jockey">{horse.jockeyName || horse.jockey || 'Kỵ sĩ'}</p>
                  </div>
                  <div className="sp-horse-card__odds">
                    <span className="sp-horse-card__odds-num">{horse.odds || '2.0'}</span>
                    <span className="sp-horse-card__odds-label">odds</span>
                  </div>
                </button>
              )) : (
                <p className="sp-modal__empty">Chưa có thông tin ngựa đua cho race này.</p>
              )}
            </div>
          </div>

          {/* Nhập số điểm */}
          {selectedHorse && (
            <div className="sp-modal__section">
              <p className="sp-modal__section-label">Số điểm đặt cược</p>
              <div className="sp-amount-input-wrap">
                <input
                  type="number"
                  min="10"
                  max={balance}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Nhập số điểm (10 - 10.000)"
                  className="sp-amount-input"
                />
                <span className="sp-amount-unit">điểm</span>
              </div>
              <div className="sp-bet-summary">
                <div className="sp-bet-summary__row">
                  <span>Cược</span>
                  <span>{amount ? parseInt(amount).toLocaleString('vi-VN') : 0} điểm</span>
                </div>
                <div className="sp-bet-summary__row">
                  <span>Tỷ lệ</span>
                  <span className="sp-odds-highlight">×{selectedHorse.odds || '2.0'}</span>
                </div>
                <div className="sp-bet-summary__row sp-bet-summary__row--win">
                  <span>Có thể thắng</span>
                  <span className="sp-win-amount">
                    {potentialWin ? `${potentialWin} điểm` : '— điểm'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sp-modal__footer">
          <button type="button" className="sp-btn sp-btn--ghost" onClick={onClose} disabled={placing}>
            Hủy
          </button>
          <button
            type="button"
            className="sp-btn sp-btn--bet"
            onClick={handlePlaceBet}
            disabled={placing || !selectedHorse || !amount}
          >
            {placing ? 'Đang đặt cược…' : 'Xác nhận đặt cược'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SpectatorHomePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [races, setRaces] = useState([])
  const [racesLoading, setRacesLoading] = useState(true)
  const [selectedRace, setSelectedRace] = useState(null)

  // Lời chào theo thời gian
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }, [])

  // Tải profile
  const loadProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) { navigate('/login', { replace: true }); return }

    setLoading(true)
    setError('')
    try {
      const user = await getMyProfile(token)
      setProfile(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Tải races
  const loadRaces = useCallback(async () => {
    setRacesLoading(true)
    try {
      const data = await bettingService.getOpenRaces()
      setRaces(data)
    } catch {
      // Dùng mock nếu API chưa có
      setRaces([])
    } finally {
      setRacesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    loadRaces()
  }, [loadProfile, loadRaces])

  const balance = profile?.pointWallet?.balance ?? 0

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">

        {/* Alert lỗi */}
        {error ? (
          <div className="sp-alert sp-alert--error">
            <span>{error}</span>
            <button type="button" className="sp-btn sp-btn--ghost-sm" onClick={loadProfile}>Thử lại</button>
          </div>
        ) : null}

        {/* Header: Greeting + Wallet */}
        <div className="sp-hero">
          <div className="sp-hero__text">
            <p className="sp-hero__eyebrow">{greeting}</p>
            <h1 className="sp-hero__title">
              {loading ? 'Đang tải…' : `Chào mừng, ${profile?.fullName?.split(' ').slice(-1)[0] || 'bạn'}!`}
            </h1>
            <p className="sp-hero__subtitle">
              Theo dõi giải đua, đặt dự đoán và nhận thưởng điểm — tất cả trên một bảng điều khiển dành cho khán giả.
            </p>
          </div>

          {/* Wallet card */}
          <div className="sp-wallet-card">
            <div className="sp-wallet-card__icon">💰</div>
            <div className="sp-wallet-card__body">
              <span className="sp-wallet-card__label">Số dư ví điểm</span>
              <div className="sp-wallet-card__balance">
                <span>{loading ? '—' : balance.toLocaleString('vi-VN')}</span>
                <span className="sp-wallet-card__unit">điểm</span>
              </div>
            </div>
            <div className="sp-wallet-card__hint">
              Thưởng đăng ký: +100 điểm cho tài khoản mới
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="sp-stats-row">
          <StatCard icon="🎯" label="Dự đoán đang hoạt động" value={profile?.activePredictionsCount ?? '—'} accentColor="#8dd6a6" />
          <StatCard icon="🏆" label="Tổng thắng cược" value={profile?.wonBetsCount ?? '—'} accentColor="#e6c364" />
          <StatCard icon="📈" label="Tổng điểm thắng" value={profile?.totalWinnings ? `${profile.totalWinnings.toLocaleString('vi-VN')} điểm` : '—'} accentColor="#89d2a2" />
          <StatCard icon="⏳" label="Chờ xác nhận" value={profile?.pendingSettlementCount ?? '—'} accentColor="#bfc9bf" />
        </div>

        {/* Main grid: Races + Leaderboard */}
        <div className="sp-main-grid">

          {/* Races */}
          <section className="sp-section">
            <div className="sp-section__header">
              <div>
                <h2 className="sp-section__title">Cuộc đua sắp tới</h2>
                <p className="sp-section__subtitle">Đặt cược ngay để nhận thưởng</p>
              </div>
              <button
                type="button"
                className="sp-btn-link"
                onClick={() => navigate('/spectator/tournaments')}
              >
                Xem tất cả →
              </button>
            </div>

            {racesLoading ? (
              <div className="sp-loading">
                <div className="sp-spinner" />
                <p>Đang tải cuộc đua…</p>
              </div>
            ) : races.length > 0 ? (
              <div className="sp-races-grid">
                {races.slice(0, 3).map(race => (
                  <RaceCard key={race.id} race={race} onBet={setSelectedRace} />
                ))}
              </div>
            ) : (
              /* Mock races khi chưa có API */
              <div className="sp-races-grid">
                {[
                  { id: 'm1', title: 'Giải Vô địch Mùa Xuân 2026', classLabel: 'Grade A', distance: '2400m', surface: 'Turf', status: 'Scheduled', startsIn: '2 giờ', topFavoriteOdds: '×2.8', trackImage: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&q=80', horses: [{ id: 'h1', name: 'Hồng Xa Vơi', jockey: 'Nguyễn Văn A', odds: '2.8' }, { id: 'h2', name: 'Bạch Kim', jockey: 'Trần Thị B', odds: '3.5' }, { id: 'h3', name: 'Hắc Mã', jockey: 'Lê Văn C', odds: '4.2' }] },
                  { id: 'm2', title: 'Cúp Tốc độ Quốc gia', classLabel: 'Grade B', distance: '1600m', surface: 'Dirt', status: 'Registrations Open', startsIn: '5 giờ', topFavoriteOdds: '×1.9', trackImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=80', horses: [{ id: 'h4', name: 'Thiên Mã', jockey: 'Phạm Văn D', odds: '1.9' }, { id: 'h5', name: 'Phong Linh', jockey: 'Võ Thị E', odds: '2.4' }] },
                  { id: 'm3', title: 'Đua Marathon 2400m', classLabel: 'Grade C', distance: '2400m', surface: 'Turf', status: 'Upcoming', startsIn: '1 ngày', topFavoriteOdds: '×3.2', trackImage: 'https://images.unsplash.com/photo-1591343395082-e120087004b4?w=400&q=80', horses: [{ id: 'h6', name: 'Cửu Long', jockey: 'Đặng Văn F', odds: '3.2' }, { id: 'h7', name: 'Hải Dương', jockey: 'Trương Văn G', odds: '4.0' }] },
                ].map(race => (
                  <RaceCard key={race.id} race={race} onBet={setSelectedRace} />
                ))}
              </div>
            )}
          </section>

          {/* Sidebar: Leaderboard */}
          <aside className="sp-section">
            <div className="sp-section__header">
              <div>
                <h2 className="sp-section__title">Bảng xếp hạng</h2>
                <p className="sp-section__subtitle">Top khán giả tuần này</p>
              </div>
              <button
                type="button"
                className="sp-btn-link"
                onClick={() => navigate('/spectator/statistics')}
              >
                Chi tiết →
              </button>
            </div>

            <div className="sp-leaderboard">
              {MOCK_LEADERBOARD.map((entry, idx) => (
                <div key={entry.rank} className="sp-leaderboard__item">
                  <span className="sp-leaderboard__rank">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : entry.rank}
                  </span>
                  <span className="sp-leaderboard__name">{entry.name}</span>
                  <span className="sp-leaderboard__pts">{entry.points.toLocaleString('vi-VN')} pts</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Modal đặt cược */}
      {selectedRace && (
        <BettingModal
          race={selectedRace}
          profile={profile}
          onClose={() => setSelectedRace(null)}
          onSuccess={loadProfile}
        />
      )}
    </div>
  )
}
