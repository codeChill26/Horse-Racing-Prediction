/**
 * TournamentsPage - Trang giải đấu cho Spectator
 * Giao diện dark theme đồng bộ admin.
 * Hỗ trợ xem chi tiết giải + danh sách chặng + đặt cược WIN/PLACE/SHOW.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  MapPin,
  Calendar,
  Trophy,
  Users,
  X,
  Coins,
  Eye,
  Clock,
} from 'lucide-react'
import { tournamentService } from '../../services/tournamentService'
import { raceService } from '../../services/raceService'
import { horseService } from '../../services/horseService'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { formatPoints } from '../../utils/formatter'
import { StatusBadge } from '../../components/ui/Badges'
import BettingModal from '../../components/spectator/BettingModal'
import './TournamentsPage.css'

// Mock data fallback khi backend chưa có endpoint
const MOCK_TOURNAMENTS = [
  {
    id: 1,
    tournamentId: 1,
    name: 'Giải Vô địch mùa xuân 2026',
    description: 'Giải đua thường niên quy tụ những con ngựa xuất sắc nhất cả nước.',
    startAt: '2026-06-15',
    endAt: '2026-06-20',
    status: 'OPEN',
    location: 'Trường đua Bình Dương',
    totalPrize: 2000000000,
    participants: 45,
  },
  {
    id: 2,
    tournamentId: 2,
    name: 'Cúp Tốc độ Quốc gia',
    description: 'Giải đua tốc độ với những chặng đua ngắn, kịch tính.',
    startAt: '2026-06-22',
    endAt: '2026-06-25',
    status: 'OPEN',
    location: 'Trường đua Phú Thọ',
    totalPrize: 900000000,
    participants: 30,
  },
  {
    id: 3,
    tournamentId: 3,
    name: 'Chặng Đua Mở Rộng',
    description: 'Giải đua mở rộng với nhiều hạng mục thi đấu.',
    startAt: '2026-01-10',
    endAt: '2026-01-12',
    status: 'FINISHED',
    location: 'Trường đua Long An',
    totalPrize: 1200000000,
    participants: 60,
  },
]

const MOCK_RACES = [
  {
    id: 'r1',
    raceId: 1,
    tournamentId: 1,
    name: 'Chặng 1 - Bình Dương',
    raceName: 'Chặng 1',
    scheduledAt: '2026-06-15T08:00:00Z',
    registrationDeadline: '2026-06-14T17:00:00Z',
    status: 'BETTING_CLOSED',
    location: 'Trường đua Bình Dương',
    prizePool: 300000000,
    horseCount: 8,
  },
  {
    id: 'r2',
    raceId: 2,
    tournamentId: 1,
    name: 'Chặng 2 - Bình Dương',
    raceName: 'Chặng 2',
    scheduledAt: '2026-06-16T08:00:00Z',
    registrationDeadline: '2026-06-15T17:00:00Z',
    status: 'BETTING_OPEN',
    location: 'Trường đua Bình Dương',
    prizePool: 400000000,
    horseCount: 10,
  },
  {
    id: 'r3',
    raceId: 3,
    tournamentId: 2,
    name: 'Chặng 1 - Phú Thọ',
    raceName: 'Chặng 1',
    scheduledAt: '2026-06-22T08:00:00Z',
    registrationDeadline: '2026-06-21T17:00:00Z',
    status: 'SCHEDULED',
    location: 'Trường đua Phú Thọ',
    prizePool: 250000000,
    horseCount: 8,
  },
]

// TODO: Replace mock horses with real API when backend has /api/races/:id/entries
const MOCK_HORSES = [
  { id: 1, raceId: 2, gate: 1, horseName: 'Thunder Strike', jockeyName: 'Lê Văn Cường', form: 'Ổn định' },
  { id: 2, raceId: 2, gate: 2, horseName: 'Golden Wind', jockeyName: 'Phạm Tuấn Kiệt', form: 'Đang lên' },
  { id: 3, raceId: 2, gate: 3, horseName: 'Diamond Rush', jockeyName: 'Đỗ Mạnh Hùng', form: 'Xuất sắc' },
  { id: 4, raceId: 2, gate: 4, horseName: 'Silver Arrow', jockeyName: 'Nguyễn Quốc Bảo', form: 'Trung bình' },
  { id: 5, raceId: 2, gate: 5, horseName: 'Midnight Star', jockeyName: 'Trần Hữu Đức', form: 'Ổn định' },
  { id: 6, raceId: 2, gate: 6, horseName: 'Phoenix Fire', jockeyName: 'Hoàng Minh Tuấn', form: 'Đang xuống' },
  { id: 7, raceId: 2, gate: 7, horseName: 'Royal Eagle', jockeyName: 'Vũ Đình Thọ', form: 'Ổn định' },
  { id: 8, raceId: 2, gate: 8, horseName: 'Cosmic Drift', jockeyName: 'Bùi Anh Khoa', form: 'Bất ổn' },
]

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'OPEN', label: 'Đang mở' },
  { id: 'ONGOING', label: 'Đang diễn ra' },
  { id: 'DRAFT', label: 'Nháp' },
  { id: 'FINISHED', label: 'Đã kết thúc' },
]

function formatDateRange(start, end) {
  if (!start) return '—'
  const s = new Date(start)
  const e = end ? new Date(end) : null
  const fmt = (d) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!e || s.getTime() === e.getTime()) return fmt(s)
  return `${fmt(s)} → ${fmt(e)}`
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPrize(amount) {
  if (!amount) return '—'
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ đ`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} triệu đ`
  return `${amount.toLocaleString('vi-VN')} đ`
}

function TournamentCard({ tournament, raceCount, onClick }) {
  return (
    <button type="button" className="t-card" onClick={() => onClick(tournament)}>
      <div className="t-card__header">
        <div className="t-card__title-row">
          <Trophy className="t-card__icon" />
          <h3 className="t-card__title">{tournament.name}</h3>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      {tournament.description && (
        <p className="t-card__desc">{tournament.description}</p>
      )}

      <div className="t-card__meta">
        <div className="t-card__meta-item">
          <MapPin className="t-card__meta-icon" />
          <span>{tournament.location || '—'}</span>
        </div>
        <div className="t-card__meta-item">
          <Calendar className="t-card__meta-icon" />
          <span>{formatDateRange(tournament.startAt, tournament.endAt)}</span>
        </div>
        {tournament.totalPrize ? (
          <div className="t-card__meta-item">
            <Trophy className="t-card__meta-icon" style={{ color: '#e6c364' }} />
            <span>
              <span className="t-card__meta-label">Giải thưởng: </span>
              <span className="t-card__prize">{formatPrize(tournament.totalPrize)}</span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="t-card__footer">
        <div className="t-card__stats">
          <span>{raceCount} chặng</span>
          {tournament.participants != null && (
            <>
              <span className="t-card__dot">•</span>
              <span>{tournament.participants} người tham gia</span>
            </>
          )}
        </div>
        <span className="t-card__link">
          <Eye size={14} />
          Chi tiết &amp; đặt cược
        </span>
      </div>
    </button>
  )
}

function TournamentModal({ tournament, races, onClose, onBet, onOpenRace }) {
  if (!tournament) return null

  const tournamentRaces = races?.filter(r =>
    r.tournamentId === tournament.tournamentId || r.tournamentId === tournament.id
  ) || []

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal sp-modal--xl" onClick={e => e.stopPropagation()}>
        <div className="sp-modal__header">
          <div>
            <p className="sp-modal__eyebrow">Chi tiết giải đấu</p>
            <h3 className="sp-modal__title">{tournament.name}</h3>
            <p className="t-modal__meta">
              <MapPin size={14} />
              {tournament.location || '—'}
              <span className="t-modal__dot">•</span>
              <Calendar size={14} />
              {formatDateRange(tournament.startAt, tournament.endAt)}
            </p>
          </div>
          <button type="button" className="sp-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="sp-modal__body">
          {tournament.description && (
            <p className="t-modal__desc">{tournament.description}</p>
          )}

          <div className="t-modal__stats">
            <div className="t-modal__stat">
              <Trophy className="t-modal__stat-icon" style={{ color: '#e6c364' }} />
              <p className="t-modal__stat-label">Giải thưởng</p>
              <p className="t-modal__stat-value">{formatPrize(tournament.totalPrize)}</p>
            </div>
            <div className="t-modal__stat">
              <Calendar className="t-modal__stat-icon" style={{ color: '#8dd6a6' }} />
              <p className="t-modal__stat-label">Số chặng</p>
              <p className="t-modal__stat-value">{tournamentRaces.length}</p>
            </div>
            <div className="t-modal__stat">
              <Users className="t-modal__stat-icon" style={{ color: '#89d2a2' }} />
              <p className="t-modal__stat-label">Người tham gia</p>
              <p className="t-modal__stat-value">{tournament.participants ?? '—'}</p>
            </div>
            <div className="t-modal__stat">
              <MapPin className="t-modal__stat-icon" style={{ color: '#bfc9bf' }} />
              <p className="t-modal__stat-label">Địa điểm</p>
              <p className="t-modal__stat-value" style={{ fontSize: '0.8rem' }}>
                {tournament.location || '—'}
              </p>
            </div>
          </div>

          <div>
            <p className="t-modal__races-title">Danh sách chặng đua</p>
            {tournamentRaces.length === 0 ? (
              <div className="sp-empty" style={{ padding: '1.5rem' }}>
                <p>Chưa có chặng nào được công bố.</p>
              </div>
            ) : (
              <div className="t-modal__races-list">
                {tournamentRaces.map(race => (
                  <div key={race.raceId ?? race.id} className="t-modal__race-item">
                    <div className="t-modal__race-info">
                      <p className="t-modal__race-name">{race.name || race.raceName}</p>
                      <div className="t-modal__race-meta">
                        <span>
                          <Clock size={12} />
                          {formatDateTime(race.scheduledAt)}
                        </span>
                        <span>
                          <MapPin size={12} />
                          {race.location || tournament.location || '—'}
                        </span>
                        {race.prizePool ? (
                          <span>
                            <Trophy size={12} />
                            {formatPrize(race.prizePool)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="t-modal__race-actions">
                      <StatusBadge status={race.status} />
                      <button
                        type="button"
                        className="t-btn t-btn--gold"
                        onClick={() => onBet(race)}
                      >
                        <Coins size={14} />
                        Đặt cược
                      </button>
                      <button
                        type="button"
                        className="t-btn t-btn--ghost"
                        onClick={() => onOpenRace(race)}
                      >
                        <Eye size={14} />
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sp-modal__footer">
          <button type="button" className="sp-btn sp-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

function RaceDetailModal({ race, horses, onClose }) {
  if (!race) return null
  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal sp-modal--lg" onClick={e => e.stopPropagation()}>
        <div className="sp-modal__header">
          <div>
            <p className="sp-modal__eyebrow">Chi tiết chặng đua</p>
            <h3 className="sp-modal__title">{race.name || race.raceName}</h3>
          </div>
          <StatusBadge status={race.status} />
          <button type="button" className="sp-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="sp-modal__body">
          <div className="t-modal__stats">
            <div className="t-modal__stat">
              <p className="t-modal__stat-label">Bắt đầu</p>
              <p className="t-modal__stat-value" style={{ fontSize: '0.85rem' }}>
                {formatDateTime(race.scheduledAt)}
              </p>
            </div>
            <div className="t-modal__stat">
              <p className="t-modal__stat-label">Đóng đăng ký</p>
              <p className="t-modal__stat-value" style={{ fontSize: '0.85rem' }}>
                {formatDateTime(race.registrationDeadline)}
              </p>
            </div>
            <div className="t-modal__stat">
              <p className="t-modal__stat-label">Địa điểm</p>
              <p className="t-modal__stat-value" style={{ fontSize: '0.8rem' }}>
                {race.location || '—'}
              </p>
            </div>
            <div className="t-modal__stat">
              <p className="t-modal__stat-label">Tổng giải</p>
              <p className="t-modal__stat-value">{formatPrize(race.prizePool)}</p>
            </div>
          </div>

          <div>
            <p className="t-modal__races-title">Danh sách ngựa tham gia</p>
            {horses.length === 0 ? (
              <div className="sp-empty" style={{ padding: '1.5rem' }}>
                <p>Chưa có ngựa nào được công bố cho chặng này.</p>
              </div>
            ) : (
              <div className="t-modal__race-list">
                {horses.map(h => (
                  <div key={h.id ?? h.horseId} className="t-modal__horse-item">
                    <div className="t-modal__horse-gate">#{h.gate}</div>
                    <div className="t-modal__horse-info">
                      <p className="t-modal__horse-name">{h.horseName || h.name}</p>
                      <p className="t-modal__horse-jockey">Kỵ sĩ: {h.jockeyName || '—'}</p>
                      {h.form && (
                        <p className="t-modal__horse-form">Phong độ: {h.form}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sp-modal__footer">
          <button type="button" className="sp-btn sp-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([])
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [selectedRace, setSelectedRace] = useState(null)
  const [bettingRace, setBettingRace] = useState(null)
  const [bettingHorses, setBettingHorses] = useState([])
  const [userBalance, setUserBalance] = useState(0)
  const [toast, setToast] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tournamentList, raceList] = await Promise.all([
        tournamentService.getTournamentsList().catch(() => []),
        raceService.getRacesList().catch(() => []),
      ])

      setTournaments(tournamentList.length > 0 ? tournamentList : MOCK_TOURNAMENTS)
      setRaces(raceList.length > 0 ? raceList : MOCK_RACES)
    } catch {
      setTournaments(MOCK_TOURNAMENTS)
      setRaces(MOCK_RACES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load user balance once
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    getMyProfile(token)
      .then(p => setUserBalance(p?.pointWallet?.balance ?? 0))
      .catch(() => setUserBalance(0))
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // When opening betting, load horses for that race (mock fallback)
  const openBetting = useCallback(async (race) => {
    setBettingRace(race)
    // TODO: Replace mock with real API GET /api/races/:id/entries
    const filtered = MOCK_HORSES.filter(h =>
      h.raceId === (race.raceId ?? race.id)
    )
    setBettingHorses(filtered.length > 0 ? filtered : MOCK_HORSES)
  }, [])

  const filtered = tournaments.filter(t => {
    const matchesTab = activeTab === 'all' || t.status === activeTab
    const q = search.trim().toLowerCase()
    const matchesSearch = !q ||
      t.name?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const tabCounts = TABS.reduce((acc, tab) => {
    if (tab.id === 'all') {
      acc[tab.id] = tournaments.length
    } else {
      acc[tab.id] = tournaments.filter(t => t.status === tab.id).length
    }
    return acc
  }, {})

  const handlePlacedBet = (bet) => {
    // Refresh balance
    const token = getAccessToken()
    if (token) {
      getMyProfile(token)
        .then(p => setUserBalance(p?.pointWallet?.balance ?? 0))
        .catch(() => {})
    }
    setToast({ type: 'success', text: 'Đặt cược thành công! Chúc bạn may mắn.' })
  }

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">

        {/* Header */}
        <div className="sp-page-header">
          <div>
            <p className="sp-page-eyebrow">Khám phá</p>
            <h1 className="sp-page-title">Giải đấu</h1>
            <p className="sp-page-subtitle">
              Theo dõi các giải đua ngựa nổi bật và tham gia đặt cược PTS
            </p>
          </div>
          <div className="sp-wallet-mini" title="Số dư ví điểm của bạn">
            <Coins size={16} />
            <div>
              <p className="sp-wallet-mini__label">Số dư</p>
              <p className="sp-wallet-mini__value">{formatPoints(userBalance)} PTS</p>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`sp-alert sp-alert--${toast.type}`} role="status">
            <span>{toast.text}</span>
            <button type="button" className="sp-alert__close" onClick={() => setToast(null)}>✕</button>
          </div>
        )}

        {/* Search */}
        <div className="sp-search-wrap">
          <Search className="sp-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm giải đấu theo tên, địa điểm…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sp-search-input"
          />
          {search && (
            <button type="button" className="sp-search-clear" onClick={() => setSearch('')}>
              <X />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bh-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`bh-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className="bh-tab__count">{tabCounts[tab.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="sp-loading">
            <div className="sp-spinner" />
            <p>Đang tải danh sách giải đấu…</p>
          </div>
        ) : error ? (
          <div className="sp-empty">
            <span className="sp-empty__icon">⚠️</span>
            <p className="sp-empty__title">Không tải được dữ liệu</p>
            <p className="sp-empty__desc">{error}</p>
            <button type="button" className="sp-btn sp-btn--ghost" onClick={loadData}>
              Thử lại
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="t-grid">
            {filtered.map(t => {
              const raceCount = races.filter(
                r => r.tournamentId === (t.tournamentId ?? t.id)
              ).length
              return (
                <TournamentCard
                  key={t.tournamentId ?? t.id}
                  tournament={t}
                  raceCount={raceCount}
                  onClick={setSelectedTournament}
                />
              )
            })}
          </div>
        ) : (
          <div className="sp-empty">
            <span className="sp-empty__icon">🏆</span>
            <p className="sp-empty__title">Không tìm thấy giải đấu</p>
            <p className="sp-empty__desc">
              {search ? 'Thử thay đổi từ khóa tìm kiếm' : 'Chưa có giải đấu nào trong danh mục này'}
            </p>
            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => { setSearch(''); setActiveTab('all') }}>
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Tournament detail modal */}
      {selectedTournament && (
        <TournamentModal
          tournament={selectedTournament}
          races={races}
          onClose={() => setSelectedTournament(null)}
          onBet={(race) => {
            setSelectedTournament(null)
            openBetting(race)
          }}
          onOpenRace={(race) => {
            setSelectedTournament(null)
            setSelectedRace(race)
          }}
        />
      )}

      {/* Race detail modal */}
      {selectedRace && (
        <RaceDetailModal
          race={selectedRace}
          horses={MOCK_HORSES.filter(h => h.raceId === (selectedRace.raceId ?? selectedRace.id))}
          onClose={() => setSelectedRace(null)}
        />
      )}

      {/* Betting modal */}
      {bettingRace && (
        <BettingModal
          race={bettingRace}
          horses={bettingHorses}
          userBalance={userBalance}
          onClose={() => setBettingRace(null)}
          onPlaced={handlePlacedBet}
        />
      )}
    </div>
  )
}
