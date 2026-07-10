/**
 * SpectatorHomePage - Trang chủ Spectator
 * Màu sắc đồng bộ với admin dashboard
 *
 * FIX BUG-7.02 / BUG-7.03:
 *   - Đã loại bỏ local `BettingModal` (duplicate ~180 lines) — dùng shared
 *     `BettingModal` đã đầy đủ validate (MIN_BET, 50% wallet cap, wallet.isFrozen,
 *     QUINELLA/EXACTA, refresh balance pre-submit).
 *   - Đã bỏ silent mock fallback (MOCK_TOURNAMENTS, MOCK_LEADERBOARD, mock races)
 *     — nếu API trả [] hoặc lỗi → empty state có CTA, không tự fill mock.
 *   - Đã dùng `selectedHorse.entryId ?? selectedHorse.id` chính xác
 *     (không fallback về `horse.id` — mock-data leak vào production data shape).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { bettingService } from '../../services/bettingService'
import { bettingRepository } from '../../repositories/bettingRepository'
import { showToast } from '../../hooks/showToast'
import BettingModal from '../../components/spectator/BettingModal'
import './SpectatorHomePage.css'

// FIX BUG-7.04: đã loại bỏ MOCK_TOURNAMENTS / MOCK_RACES — silent mock fallback.
// Theo pattern B-002 (giống BettingHistoryPage/StatisticsPage đã fix): nếu API
// trả [] hoặc lỗi → hiển thị empty state có CTA, không tự fill mock data
// (mock chỉ dùng khi env `VITE_FALLBACK_TO_MOCK=true`).

/**
 * Định dạng status text trên race card (CHỈ cho leaderboard UI).
 * (Status mapping cho prediction dùng `STATUS_VARIANT` ở shared Badges.jsx.)
 */
function canBetOnStatus(status) {
  const s = String(status || '').toUpperCase()
  return s === 'SCHEDULED' || s === 'REGISTRATION_OPEN' || s === 'UPCOMING' || s === 'BETTING_OPEN'
}

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
  const canBet = canBetOnStatus(race.status)

  return (
    <div className="sp-race-card">
      {/* Thumbnail */}
      <div className="sp-race-card__thumb">
        <img
          src={race.trackImage || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&q=80'}
          alt={race.title || race.name}
          className="sp-race-card__img"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&q=80'
          }}
        />
        <div className="sp-race-card__status-badge">
          {String(race.status || '').toUpperCase()}
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
          <p className="sp-race-card__title">{race.title || race.name}</p>
          <p className="sp-race-card__info">
            {race.classLabel} {race.distance && `• ${race.distance}`} {race.surface && `• ${race.surface}`}
          </p>
        </div>

        <div className="sp-race-card__odds">
          <span className="sp-race-card__odds-label">Top Favorite Odds</span>
          <span className="sp-race-card__odds-value">{race.topFavoriteOdds || '—'}</span>
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

export default function SpectatorHomePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [races, setRaces] = useState([])
  const [racesLoading, setRacesLoading] = useState(true)
  const [racesError, setRacesError] = useState('')
  const [bettingModal, setBettingModal] = useState(null) // { race, entries }
  const [bettingLoading, setBettingLoading] = useState(false)

  // Lời chào theo thời gian
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }, [])

  // Tải profile (không mock — silent fallback đã loại bỏ theo pattern B-002)
  const loadProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) { navigate('/login', { replace: true }); return }

    setLoading(true)
    setError('')
    try {
      const user = await getMyProfile(token)
      setProfile(user)
    } catch (e) {
      setError(e?.message || String(e))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Tải open races (không mock — empty/error state sẽ được render)
  const loadRaces = useCallback(async () => {
    setRacesLoading(true)
    setRacesError('')
    try {
      const data = await bettingService.getOpenRaces()
      setRaces(Array.isArray(data) ? data : [])
    } catch (e) {
      setRacesError(e?.message || 'Không tải được danh sách cuộc đua')
      setRaces([])
    } finally {
      setRacesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    loadRaces()
  }, [loadProfile, loadRaces])

  // Refresh balance & wallet.isFrozen khi mở modal
  const refreshBalance = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return 0
    try {
      const p = await getMyProfile(token)
      setProfile((prev) => ({
        ...prev,
        pointWallet: p?.pointWallet ?? prev?.pointWallet ?? null,
      }))
      return p?.pointWallet?.balance ?? 0
    } catch {
      return profile?.pointWallet?.balance ?? 0
    }
  }, [profile?.pointWallet?.balance])

  // Mở BettingModal: load entries từ API detail (race có thể không kèm entries)
  const openBetting = useCallback(async (race) => {
    if (!race) return
    setBettingLoading(true)
    try {
      const detail = await bettingRepository.getRaceDetails(race.raceId ?? race.id)
      setBettingModal({
        race: {
          ...race,
          raceId: race.raceId ?? race.id,
          name: race.name || race.title,
        },
        entries: Array.isArray(detail?.entries) ? detail.entries : [],
      })
    } catch {
      // Modal vẫn mở với entries=[] → hiển thị "Chưa có ngựa nào được duyệt"
      setBettingModal({
        race: {
          ...race,
          raceId: race.raceId ?? race.id,
          name: race.name || race.title,
        },
        entries: [],
      })
      showToast.error('Không tải được danh sách ngựa. Vui lòng thử lại.', 'Lỗi')
    } finally {
      setBettingLoading(false)
    }
  }, [])

  const closeBetting = useCallback(() => setBettingModal(null), [])

  const handlePlacedBet = useCallback(async () => {
    await loadProfile()
    showToast.success('Đặt cược thành công! Số dư đã được cập nhật.', 'Đặt cược')
  }, [loadProfile])

  const balance = profile?.pointWallet?.balance ?? 0
  const walletFrozen = Boolean(profile?.pointWallet?.isFrozen)

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">

        {/* Alert lỗi */}
        {error ? (
          <div className="sp-alert sp-alert--error" role="alert">
            <span>{error}</span>
            <button type="button" className="sp-btn sp-btn--ghost-sm" onClick={loadProfile}>Thử lại</button>
          </div>
        ) : null}

        {/* Wallet frozen banner */}
        {walletFrozen && (
          <div className="sp-alert sp-alert--error" role="alert">
            <span>Ví điểm của bạn đang bị đóng băng bởi Admin — không thể đặt cược.</span>
          </div>
        )}

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
              <div className="sp-wallet-card__balance" aria-live="polite">
                <span>{loading ? '—' : balance.toLocaleString('vi-VN')}</span>
                <span className="sp-wallet-card__unit">điểm</span>
              </div>
            </div>
            <div className="sp-wallet-card__hint">
              Thưởng đăng ký: +100 điểm cho tài khoản mới
            </div>
          </div>
        </div>

        {/* Stats Row — fallback '—' nếu profile thiếu field */}
        <div className="sp-stats-row">
          <StatCard icon="🎯" label="Dự đoán đang hoạt động" value={profile?.activePredictionsCount ?? '—'} accentColor="#8dd6a6" />
          <StatCard icon="🏆" label="Tổng thắng cược" value={profile?.wonBetsCount ?? '—'} accentColor="#e6c364" />
          <StatCard icon="📈" label="Tổng điểm thắng" value={profile?.totalWinnings ? `${profile.totalWinnings.toLocaleString('vi-VN')} điểm` : '—'} accentColor="#89d2a2" />
          <StatCard icon="⏳" label="Chờ xác nhận" value={profile?.pendingSettlementCount ?? '—'} accentColor="#bfc9bf" />
        </div>

        {/* Main grid: Races */}
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
            ) : racesError ? (
              <div className="sp-empty">
                <span className="sp-empty__icon">⚠️</span>
                <p className="sp-empty__title">Không tải được danh sách cuộc đua</p>
                <p className="sp-empty__desc">{racesError}</p>
                <button type="button" className="sp-btn sp-btn--ghost" onClick={loadRaces}>
                  Thử lại
                </button>
              </div>
            ) : races.length > 0 ? (
              <div className="sp-races-grid">
                {races.slice(0, 3).map((race) => (
                  <RaceCard key={race.raceId ?? race.id} race={race} onBet={openBetting} />
                ))}
              </div>
            ) : (
              <div className="sp-empty">
                <span className="sp-empty__icon">🐎</span>
                <p className="sp-empty__title">Chưa có cuộc đua nào đang mở</p>
                <p className="sp-empty__desc">
                  Quay lại sau hoặc khám phá các giải đấu đã lên lịch.
                </p>
                <button
                  type="button"
                  className="sp-btn sp-btn--ghost"
                  onClick={() => navigate('/spectator/tournaments')}
                >
                  Xem giải đấu
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal đặt cược (shared, đầy đủ validate) */}
      {bettingModal && !bettingLoading && (
        <BettingModal
          race={bettingModal.race}
          entries={bettingModal.entries}
          userBalance={balance}
          walletFrozen={walletFrozen}
          onRefreshBalance={refreshBalance}
          onClose={closeBetting}
          onPlaced={handlePlacedBet}
        />
      )}
      {bettingLoading && (
        <div className="sp-modal-overlay" role="presentation">
          <div className="sp-loading"><div className="sp-spinner" /><p>Đang tải thông tin ngựa…</p></div>
        </div>
      )}
    </div>
  )
}

SpectatorHomePage.displayName = 'SpectatorHomePage'
