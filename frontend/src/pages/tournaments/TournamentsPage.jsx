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
import { bettingRepository } from '../../repositories/bettingRepository'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { formatPoints } from '../../utils/formatter'
import { StatusBadge } from '../../components/ui/Badges'
import BettingModal from '../../components/spectator/BettingModal'
import './TournamentsPage.css'

// FIX BUG-7.04: đã loại bỏ MOCK_TOURNAMENTS / MOCK_RACES — silent mock fallback.
// Theo pattern B-002 (giống BettingHistoryPage/StatisticsPage đã fix): nếu API
// trả [] hoặc lỗi → hiển thị empty state có CTA, KHÔNG tự fill mock data
// (mock chỉ dùng khi env `VITE_FALLBACK_TO_MOCK=true`).


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

function TournamentModal({ tournament, races, walletFrozen = false, onClose, onBet, onOpenRace }) {
  if (!tournament) return null

  // FIX BUG-7.15: cũ dùng `r.tournamentId === tournament.tournamentId || r.tournamentId === tournament.id`
  // — vẫn giữ logic nhưng bổ sung NaN-safe. Nếu BE trả id không tồn tại thì bỏ qua.
  const tournamentId = Number(tournament.tournamentId ?? tournament.id)
  const tournamentRaces = (Array.isArray(races) ? races : []).filter(r => {
    if (!r) return false
    const rId = Number(r.tournamentId)
    return Number.isFinite(rId) && rId === tournamentId
  })

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
                        disabled={walletFrozen}
                        title={walletFrozen ? 'Ví đang bị đóng băng' : ''}
                      >
                        <Coins size={14} />
                        {walletFrozen ? 'Ví bị đóng băng' : 'Đặt cược'}
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
  const [bettingRace, setBettingRace]       = useState(null)
  const [bettingEntries, setBettingEntries] = useState([])
  const [bettingLoading, setBettingLoading] = useState(false)
  const [userBalance, setUserBalance]       = useState(0)
  const [walletFrozen, setWalletFrozen]     = useState(false)
  const [toast, setToast] = useState(null)

  // Đóng gói refresh balance để truyền xuống BettingModal — modal sẽ gọi hàm này
  // ngay trước khi submit để chắc chắn maxAllowed đúng (tránh submit với balance cũ).
  const refreshBalance = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return 0
    try {
      const p = await getMyProfile(token)
      const balance = p?.pointWallet?.balance ?? 0
      setUserBalance(balance)
      setWalletFrozen(Boolean(p?.pointWallet?.isFrozen))
      return balance
    } catch {
      return userBalance
    }
  }, [userBalance])

  // FIX BUG-7.04: bỏ silent mock fallback.
  // - Nếu API trả [] → empty tournaments/races array → empty state với CTA.
  // - Nếu API lỗi → error state có Retry.
  // - KHÔNG fill MOCK_TOURNAMENTS/MOCK_RACES nữa.
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tournamentList, raceList] = await Promise.all([
        tournamentService.getTournamentsList(),
        raceService.getRacesList(),
      ])
      setTournaments(Array.isArray(tournamentList) ? tournamentList : [])
      setRaces(Array.isArray(raceList) ? raceList : [])
    } catch (e) {
      setError(e?.message || 'Không tải được danh sách giải đấu')
      setTournaments([])
      setRaces([])
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
      .then(p => {
        setUserBalance(p?.pointWallet?.balance ?? 0)
        setWalletFrozen(Boolean(p?.pointWallet?.isFrozen))
      })
      .catch(() => setUserBalance(0))
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // Mở betting: load detail race từ API thực (entries + odds + career stats)
  const openBetting = useCallback(async (race) => {
    if (walletFrozen) {
      setToast({ type: 'error', text: 'Ví của bạn đang bị đóng băng — không thể đặt cược.' })
      return
    }
    setBettingRace(race)
    setBettingEntries([])
    setBettingLoading(true)
    try {
      const detail = await bettingRepository.getRaceDetails(race.raceId ?? race.id)
      setBettingEntries(detail?.entries ?? [])
    } catch {
      setBettingEntries([])
      setToast({ type: 'error', text: 'Không tải được thông tin ngựa. Vui lòng thử lại.' })
    } finally {
      setBettingLoading(false)
    }
  }, [walletFrozen])

  // FIX BUG-7.15: tab filter normalize status về UPPERCASE để chịu BE trả
  // 'Open'/'OPEN'/'open' (case-insensitive). Cũ: `t.status === activeTab` so sánh
  // nhạy cảm.
  const filtered = tournaments.filter(t => {
    const tabUpper = String(activeTab || '').toUpperCase()
    const statusUpper = String(t.status || '').toUpperCase()
    const matchesTab = tabUpper === 'ALL' || statusUpper === tabUpper
    const q = search.trim().toLowerCase()
    const matchesSearch = !q ||
      t.name?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const tabCounts = TABS.reduce((acc, tab) => {
    const tabIdUpper = String(tab.id || '').toUpperCase()
    if (tabIdUpper === 'ALL') {
      acc[tab.id] = tournaments.length
    } else {
      acc[tab.id] = tournaments.filter(t =>
        String(t.status || '').toUpperCase() === tabIdUpper
      ).length
    }
    return acc
  }, {})

  const handlePlacedBet = async () => {
    await refreshBalance()
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

        {/* G9: Cảnh báo ví đóng băng */}
        {walletFrozen && (
          <div className="sp-alert sp-alert--error" role="alert" style={{ marginBottom: '1rem' }}>
            <Coins size={16} />
            <span>Ví điểm của bạn đang bị đóng băng bởi Admin — không thể đặt cược cho tới khi được mở.</span>
          </div>
        )}

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
              // FIX BUG-7.15: so sánh số, không so sánh chuỗi nhạy cảm.
              const tId = Number(t.tournamentId ?? t.id)
              const raceCount = races.filter(r => {
                const rId = Number(r.tournamentId)
                return Number.isFinite(rId) && Number.isFinite(tId) && rId === tId
              }).length
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
          walletFrozen={walletFrozen}
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
          horses={[]}
          onClose={() => setSelectedRace(null)}
        />
      )}

      {/* Betting modal */}
      {bettingRace && (
        <BettingModal
          race={bettingRace}
          entries={bettingLoading ? [] : bettingEntries}
          userBalance={userBalance}
          walletFrozen={walletFrozen}
          onRefreshBalance={refreshBalance}
          onClose={() => { setBettingRace(null); setBettingEntries([]) }}
          onPlaced={handlePlacedBet}
        />
      )}
    </div>
  )
}
