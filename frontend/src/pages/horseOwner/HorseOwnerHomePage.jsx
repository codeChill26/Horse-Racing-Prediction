/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner Home Page
 * - Dashboard tổng quan cho chủ ngựa
 * - Tích hợp API: /api/horses/mine, /api/tournaments
 * - TODO polling: danh sách ngựa + số ngựa pending có thể refresh định kỳ
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, RefreshCcw, X, Calendar, Trophy, Plus, ListChecks, UserCircle2, Activity, FileCheck2 } from 'lucide-react'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { horseService } from '../../services/horseService'
import { tournamentService } from '../../services/tournamentService'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  HorseOwnerStatCard,
  OwnerHorseCard,
  OwnerTournamentCard,
  OwnerQuickAction,
  OwnerWarningCard,
} from '../../components/horseOwner/HorseOwnerCards'
import './HorseOwnerHomePage.css'

const POLL_INTERVAL_MS = 30000

function showToast(setToast, type, text) {
  setToast({ id: Date.now(), type, text })
}

export default function HorseOwnerHomePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [profile, setProfile] = useState(null)
  const [horses, setHorses] = useState([])
  const [tournaments, setTournaments] = useState([])

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingHorses, setLoadingHorses] = useState(true)
  const [loadingTournaments, setLoadingTournaments] = useState(true)

  const [errorProfile, setErrorProfile] = useState('')
  const [errorHorses, setErrorHorses] = useState('')
  const [errorTournaments, setErrorTournaments] = useState('')

  const [showWelcome, setShowWelcome] = useState(() => location.state?.loginSuccess === true)
  const [toast, setToast] = useState(null)

  /* ====================== Data loaders ====================== */

  const loadProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    setLoadingProfile(true)
    setErrorProfile('')
    try {
      const user = await getMyProfile(token)
      setProfile(user)
    } catch (e) {
      setErrorProfile(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingProfile(false)
    }
  }, [navigate])

  const loadHorses = useCallback(async () => {
    setLoadingHorses(true)
    setErrorHorses('')
    try {
      const data = await horseService.getMyHorses()
      setHorses(Array.isArray(data) ? data : [])
    } catch (e) {
      setErrorHorses(e instanceof Error ? e.message : String(e))
      setHorses([])
    } finally {
      setLoadingHorses(false)
    }
  }, [])

  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true)
    setErrorTournaments('')
    try {
      const data = await tournamentService.getPublicTournaments()
      const list = Array.isArray(data) ? data : []
      // Sắp xếp giải đang mở/đang diễn ra lên đầu
      const priority = { OPEN: 0, ONGOING: 1, FINISHED: 2, CANCELLED: 3, DRAFT: 4 }
      list.sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
      setTournaments(list)
    } catch (e) {
      setErrorTournaments(e instanceof Error ? e.message : String(e))
      setTournaments([])
    } finally {
      setLoadingTournaments(false)
    }
  }, [])

  const loadAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadHorses(), loadTournaments()])
  }, [loadProfile, loadHorses, loadTournaments])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Polling nhẹ cho danh sách ngựa — có thể chuyển sang socket khi backend hỗ trợ
  // === SOCKET / REALTIME NOTE ===
  // Polling mỗi 30s cho horses/mine để cập nhật trạng thái ngựa mới được duyệt.
  // Khi backend có Socket.io, nên subscribe room `owner:{userId}` thay thế.
  useEffect(() => {
    const t = window.setInterval(() => {
      loadHorses()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(t)
  }, [loadHorses])

  // Clear loginSuccess state
  useEffect(() => {
    if (!location.state?.loginSuccess) return
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state?.loginSuccess, navigate])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  // Welcome toast auto-dismiss
  useEffect(() => {
    if (!showWelcome) return
    const t = window.setTimeout(() => setShowWelcome(false), 7000)
    return () => window.clearTimeout(t)
  }, [showWelcome])

  /* ====================== Derived data ====================== */

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }, [])

  const displayName = profile?.fullName || 'Chủ ngựa'
  const firstName = displayName.split(/\s+/).slice(-1)[0] || displayName

  const stats = useMemo(() => {
    const total = horses.length
    const active = horses.filter((h) => h.status === 'APPROVED').length
    const pending = horses.filter((h) => h.status === 'PENDING').length
    const rejected = horses.filter((h) => h.status === 'REJECTED').length
    const inactive = horses.filter((h) => h.status === 'INACTIVE').length

    const upcomingTournaments = tournaments.filter(
      (t) => t.status === 'OPEN' || t.status === 'ONGOING',
    ).length

    return { total, active, pending, rejected, inactive, upcomingTournaments }
  }, [horses, tournaments])

  const warnings = useMemo(() => {
    const out = []
    if (stats.pending > 0) {
      out.push({
        id: 'pending',
        message: `${stats.pending} ngựa đang chờ admin duyệt. Bạn có thể tiếp tục sử dụng các ngựa đã được duyệt.`,
      })
    }
    if (stats.rejected > 0) {
      out.push({
        id: 'rejected',
        message: `${stats.rejected} ngựa bị từ chối. Vui lòng kiểm tra lý do và cập nhật thông tin.`,
      })
    }
    if (stats.inactive > 0) {
      out.push({
        id: 'inactive',
        message: `${stats.inactive} ngựa đang ở trạng thái không hoạt động.`,
      })
    }
    if (horses.length === 0) {
      out.push({
        id: 'empty',
        message: 'Bạn chưa đăng ký ngựa nào. Hãy bắt đầu bằng cách đăng ký ngựa mới.',
      })
    }
    return out
  }, [stats, horses])

  const featuredTournament = tournaments[0] || null
  const topHorses = horses.slice(0, 6)
  const upcomingTournaments = tournaments.filter(
    (t) => t.status === 'OPEN' || t.status === 'ONGOING',
  )

  /* ====================== Handlers ====================== */

  const handleRefresh = async () => {
    await loadAll()
    showToast(setToast, 'success', 'Đã làm mới dữ liệu')
  }

  const handleViewTournament = (tournament) => {
    if (!tournament) return
    navigate(`/horse-owner/tournaments/${tournament.tournamentId ?? tournament.id}`)
  }

  const QUICK_ACTIONS = [
    {
      icon: Plus,
      title: 'Đăng ký ngựa mới',
      desc: 'Gửi hồ sơ ngựa để admin duyệt',
      tag: 'Khả dụng',
      to: '/horse-owner/horses/new',
    },
    {
      icon: ListChecks,
      title: 'Danh sách ngựa',
      desc: 'Xem chi tiết các ngựa đang sở hữu',
      tag: stats.total > 0 ? `${stats.total} ngựa` : 'Trống',
      to: '/horse-owner/horses',
    },
    {
      icon: Calendar,
      title: 'Lịch thi đấu',
      desc: 'Các giải đang mở/đang diễn ra',
      tag: stats.upcomingTournaments > 0 ? `${stats.upcomingTournaments} giải` : '—',
      to: '/horse-owner/tournaments',
    },
    {
      icon: UserCircle2,
      title: 'Hồ sơ chủ ngựa',
      desc: 'Cập nhật thông tin tài khoản',
      tag: 'Khả dụng',
      to: '/horse-owner/profile',
    },
  ]

  /* ====================== Render ====================== */

  return (
    <div className="owner-page">
      {showWelcome ? (
        <div className="owner-toast owner-toast--welcome" role="status" aria-live="polite">
          <span className="owner-toast-icon" aria-hidden="true">✓</span>
          <div className="owner-toast-body">
            <strong>Đăng nhập thành công!</strong>
            <p>
              Chào mừng <span className="owner-toast-highlight">{displayName}</span> — khu vực Chủ ngựa đã sẵn sàng.
            </p>
          </div>
          <button
            type="button"
            className="owner-toast-close"
            onClick={() => setShowWelcome(false)}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {toast ? (
        <div className={`owner-toast owner-toast--${toast.type}`} role="status">
          <span className="owner-toast-icon" aria-hidden="true">
            {toast.type === 'success' ? '✓' : '!'}
          </span>
          <div className="owner-toast-body">
            <p>{toast.text}</p>
          </div>
          <button
            type="button"
            className="owner-toast-close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <section className="owner-hero">
        <div className="owner-hero__content">
          <div>
            <p className="owner-hero__eyebrow">{greeting}</p>
            <h1>
              {loadingProfile ? 'Đang tải…' : `Xin chào, ${firstName}!`}
            </h1>
            <p className="owner-hero__sub">
              Quản lý đội ngựa, đăng ký giải đấu và theo dõi thành tích trên sân đua.
            </p>
          </div>
          <div className="owner-hero__actions">
            <button
              type="button"
              className="ho-btn ho-btn--primary"
              onClick={() => navigate('/horse-owner/horses/new')}
            >
              <Plus size={14} /> Đăng ký ngựa mới
            </button>
            <button
              type="button"
              className="ho-btn ho-btn--ghost"
              onClick={handleRefresh}
              disabled={loadingProfile || loadingHorses || loadingTournaments}
            >
              <RefreshCcw size={14} /> Làm mới
            </button>
          </div>
        </div>
        <div className="owner-hero__role">
          <span>Chủ ngựa</span>
          <small>HORSE_OWNER</small>
        </div>
      </section>

      <div className="owner-page-inner owner-home-content">
        {errorProfile ? (
          <ErrorAlert message={errorProfile} onRetry={loadProfile} />
        ) : null}

        {/* ==== OVERVIEW STATS ==== */}
        <section className="ho-stats-grid" aria-label="Tổng quan">
          <HorseOwnerStatCard
            icon={Trophy}
            label="Tổng số ngựa"
            value={stats.total}
            loading={loadingHorses}
            hint={loadingHorses ? 'Đang đồng bộ' : `Cập nhật tự động mỗi ${POLL_INTERVAL_MS / 1000}s`}
          />
          <HorseOwnerStatCard
            icon={Activity}
            label="Đang hoạt động"
            value={stats.active}
            loading={loadingHorses}
            tone="primary"
            hint="Ngựa đã được admin duyệt"
          />
          <HorseOwnerStatCard
            icon={FileCheck2}
            label="Chờ duyệt"
            value={stats.pending}
            loading={loadingHorses}
            tone={stats.pending > 0 ? 'gold' : 'primary'}
            hint="Đang chờ admin xét duyệt"
          />
          <HorseOwnerStatCard
            icon={Calendar}
            label="Giải sắp tham gia"
            value={stats.upcomingTournaments}
            loading={loadingTournaments}
            tone="gold"
            hint="Đang mở/đang diễn ra"
          />
        </section>

        {/* ==== WARNINGS ==== */}
        {warnings.length ? <OwnerWarningCard warnings={warnings} /> : null}

        {/* ==== FEATURED TOURNAMENT ==== */}
        {featuredTournament ? (
          <section className="ho-featured-tournament">
            <div className="ho-featured-tournament__body">
              <p className="ho-featured-tournament__eyebrow">
                <Trophy size={13} /> Giải đấu nổi bật
              </p>
              <h2>{featuredTournament.name}</h2>
              <p className="ho-featured-tournament__desc">
                {featuredTournament.description || 'Giải đấu đua ngựa chuyên nghiệp'}
              </p>
              <ul className="ho-featured-tournament__meta">
                {featuredTournament.location ? (
                  <li>📍 {featuredTournament.location}</li>
                ) : null}
                {featuredTournament.startAt ? (
                  <li>
                    📅 {new Date(featuredTournament.startAt).toLocaleDateString('vi-VN')}
                    {featuredTournament.endAt
                      ? ` – ${new Date(featuredTournament.endAt).toLocaleDateString('vi-VN')}`
                      : ''}
                  </li>
                ) : null}
              </ul>
              <div className="ho-featured-tournament__actions">
                <button
                  type="button"
                  className="ho-btn ho-btn--primary"
                  onClick={() => handleViewTournament(featuredTournament)}
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
            <div className="ho-featured-tournament__visual" aria-hidden="true">
              <div className="ho-featured-tournament__badge">
                {featuredTournament.status === 'OPEN'
                  ? 'Đang mở'
                  : featuredTournament.status === 'ONGOING'
                    ? 'Đang diễn ra'
                    : featuredTournament.status === 'FINISHED'
                      ? 'Đã kết thúc'
                      : featuredTournament.status || '—'}
              </div>
            </div>
          </section>
        ) : null}

        {/* ==== QUICK ACTIONS ==== */}
        <section className="ho-section">
          <div className="ho-section__head">
            <div>
              <h2>Truy cập nhanh</h2>
              <p>Công cụ dành cho chủ ngựa</p>
            </div>
          </div>
          <div className="ho-quick-actions-grid">
            {QUICK_ACTIONS.map((a) => (
              <OwnerQuickAction key={a.title} {...a} />
            ))}
          </div>
        </section>

        {/* ==== MY HORSES ==== */}
        <section className="ho-section">
          <div className="ho-section__head">
            <div>
              <h2>Ngựa của bạn</h2>
              <p>
                {loadingHorses
                  ? 'Đang tải…'
                  : horses.length
                    ? `${horses.length} ngựa trong trại`
                    : 'Chưa có ngựa nào — hãy đăng ký ngựa đầu tiên của bạn'}
              </p>
            </div>
            {horses.length > 0 ? (
              <Link to="/horse-owner/horses" className="ho-section__more">
                Xem tất cả →
              </Link>
            ) : null}
          </div>

          {loadingHorses ? (
            <div className="ho-horse-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="ho-horse-skeleton">
                  <Skeleton className="ho-horse-skeleton__avatar" />
                  <div className="ho-horse-skeleton__body">
                    <Skeleton className="ho-horse-skeleton__line" />
                    <Skeleton className="ho-horse-skeleton__line ho-horse-skeleton__line--short" />
                  </div>
                </div>
              ))}
            </div>
          ) : errorHorses ? (
            <ErrorAlert message={errorHorses} onRetry={loadHorses} />
          ) : horses.length === 0 ? (
            <div className="ho-empty">
              <EmptyState
                title="Bạn chưa có ngựa nào"
                description="Bắt đầu bằng cách đăng ký hồ sơ ngựa đầu tiên của bạn."
              />
              <div className="ho-empty__cta">
                <button
                  type="button"
                  className="ho-btn ho-btn--primary"
                  onClick={() => navigate('/horse-owner/horses/new')}
                >
                  <Plus size={14} /> Đăng ký ngựa mới
                </button>
              </div>
            </div>
          ) : (
            <div className="ho-horse-grid">
              {topHorses.map((h) => (
                <OwnerHorseCard key={h.horseId || h.id} horse={h} />
              ))}
            </div>
          )}
        </section>

        {/* ==== TOURNAMENTS ==== */}
        <section className="ho-section">
          <div className="ho-section__head">
            <div>
              <h2>Giải đấu sắp tham gia</h2>
              <p>
                {loadingTournaments
                  ? 'Đang tải…'
                  : upcomingTournaments.length
                    ? `${upcomingTournaments.length} giải đang mở/đang diễn ra`
                    : 'Hiện chưa có giải đấu nào đang mở'}
              </p>
            </div>
          </div>

          {loadingTournaments ? (
            <div className="ho-tournament-grid">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="ho-tournament-skeleton">
                  <Skeleton className="ho-tournament-skeleton__title" />
                  <Skeleton className="ho-tournament-skeleton__line" />
                  <Skeleton className="ho-tournament-skeleton__line ho-tournament-skeleton__line--short" />
                </div>
              ))}
            </div>
          ) : errorTournaments ? (
            <ErrorAlert message={errorTournaments} onRetry={loadTournaments} />
          ) : upcomingTournaments.length === 0 ? (
            <EmptyState
              title="Chưa có giải đấu đang mở"
              description="Các giải đấu mới sẽ xuất hiện tại đây khi admin tạo."
            />
          ) : (
            <div className="ho-tournament-grid">
              {upcomingTournaments.slice(0, 3).map((t) => (
                <OwnerTournamentCard
                  key={t.tournamentId || t.id}
                  tournament={t}
                  onView={handleViewTournament}
                />
              ))}
            </div>
          )}
        </section>

        <p className="owner-profile-link">
          <Link to="/horse-owner/profile">Xem hồ sơ chủ ngựa →</Link>
        </p>
      </div>
    </div>
  )
}

/* ====== Local Error Alert ====== */
function ErrorAlert({ message, onRetry }) {
  return (
    <div className="ho-alert ho-alert--error" role="alert">
      <AlertCircle size={16} />
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="ho-btn ho-btn--ghost" onClick={onRetry}>
          <RefreshCcw size={12} /> Thử lại
        </button>
      ) : null}
    </div>
  )
}