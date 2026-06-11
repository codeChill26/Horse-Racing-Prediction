/**
 * TournamentsPage - Trang giải đấu
 * Giao diện dark theme đồng bộ với admin
 */

import { useCallback, useEffect, useState } from 'react'
import { Search, MapPin, Calendar, Trophy, Users, X } from 'lucide-react'
import { getMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { tournamentService } from '../../services/tournamentService'
import './TournamentsPage.css'

// Mock data khi API chưa có
const MOCK_TOURNAMENTS = [
  {
    id: 1,
    name: 'Giải Vô địch mùa xuân 2026',
    date: '15/06/2026 - 20/06/2026',
    location: 'Trường đua Bình Dương',
    totalRaces: 5,
    totalPrize: 2000000000,
    participants: 45,
    status: 'live',
    statusLabel: 'ĐANG DIỄN RA',
    description: 'Giải đua thường niên quy tụ những con ngựa xuất sắc nhất cả nước.',
    races: [
      { id: 'r1', name: 'Chặng 1', date: '15/06', status: 'finished', statusLabel: 'ĐÃ KẾT THÚC' },
      { id: 'r2', name: 'Chặng 2', date: '16/06', status: 'finished', statusLabel: 'ĐÃ KẾT THÚC' },
      { id: 'r3', name: 'Chặng 3', date: '17/06', status: 'live', statusLabel: 'ĐANG DIỄN RA' },
      { id: 'r4', name: 'Chặng 4', date: '18/06', status: 'upcoming', statusLabel: 'SẮP DIỄN RA' },
      { id: 'r5', name: 'Chặng 5', date: '19/06', status: 'upcoming', statusLabel: 'SẮP DIỄN RA' },
    ],
  },
  {
    id: 2,
    name: 'Cúp Tốc độ Quốc gia',
    date: '22/06/2026 - 25/06/2026',
    location: 'Trường đua Phú Thọ',
    totalRaces: 3,
    totalPrize: 900000000,
    participants: 30,
    status: 'upcoming',
    statusLabel: 'SẮP DIỄN RA',
    description: 'Giải đua tốc độ với những chặng đua ngắn, kịch tính.',
    races: [
      { id: 'r6', name: 'Chặng 1', date: '22/06', status: 'upcoming', statusLabel: 'SẮP DIỄN RA' },
      { id: 'r7', name: 'Chặng 2', date: '23/06', status: 'upcoming', statusLabel: 'SẮP DIỄN RA' },
      { id: 'r8', name: 'Chặng 3', date: '25/06', status: 'upcoming', statusLabel: 'SẮP DIỄN RA' },
    ],
  },
  {
    id: 3,
    name: 'Chặng Đua Mở Rộng',
    date: '10/01/2026 - 12/01/2026',
    location: 'Trường đua Long An',
    totalRaces: 4,
    totalPrize: 1200000000,
    participants: 60,
    status: 'finished',
    statusLabel: 'ĐÃ KẾT THÚC',
    description: 'Giải đua mở rộng với nhiều hạng mục thi đấu.',
    races: [
      { id: 'r9', name: 'Chặng 1', date: '10/01', status: 'finished', statusLabel: 'ĐÃ KẾT THÚC' },
      { id: 'r10', name: 'Chặng 2', date: '11/01', status: 'finished', statusLabel: 'ĐÃ KẾT THÚC' },
      { id: 'r11', name: 'Chặng 3', date: '12/01', status: 'finished', statusLabel: 'ĐÃ KẾT THÚC' },
    ],
  },
]

function StatusBadge({ status, label }) {
  const colors = {
    live: 'live',
    upcoming: 'upcoming',
    finished: 'finished',
  }
  return (
    <span className={`sp-badge sp-badge--${colors[status] || 'upcoming'}`}>
      {label}
    </span>
  )
}

function TournamentCard({ tournament, onClick }) {
  return (
    <div className="t-card" onClick={() => onClick(tournament)}>
      {/* Header */}
      <div className="t-card__header">
        <div className="t-card__title-row">
          <Trophy className="t-card__icon" />
          <h3 className="t-card__title">{tournament.name}</h3>
        </div>
        <StatusBadge status={tournament.status} label={tournament.statusLabel} />
      </div>

      {/* Description */}
      <p className="t-card__desc">{tournament.description}</p>

      {/* Meta */}
      <div className="t-card__meta">
        <div className="t-card__meta-item">
          <MapPin className="t-card__meta-icon" />
          <span>{tournament.location}</span>
        </div>
        <div className="t-card__meta-item">
          <Calendar className="t-card__meta-icon" />
          <span>{tournament.date}</span>
        </div>
        <div className="t-card__meta-item">
          <Trophy className="t-card__meta-icon" />
          <span>
            <span className="t-card__meta-label">Giải thưởng: </span>
            <span className="t-card__prize">
              {tournament.totalPrize.toLocaleString('vi-VN')} đ
            </span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="t-card__footer">
        <div className="t-card__stats">
          <span>{tournament.totalRaces} chặng</span>
          <span className="t-card__dot">•</span>
          <span>{tournament.participants} người tham gia</span>
        </div>
        <button type="button" className="t-card__link">
          Chi tiết →
        </button>
      </div>
    </div>
  )
}

function TournamentModal({ tournament, onClose }) {
  if (!tournament) return null

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal sp-modal--lg" onClick={e => e.stopPropagation()}>
        <div className="sp-modal__header">
          <div>
            <p className="sp-modal__eyebrow">Chi tiết giải đấu</p>
            <h3 className="sp-modal__title">{tournament.name}</h3>
          </div>
          <div className="sp-modal__header-right">
            <StatusBadge status={tournament.status} label={tournament.statusLabel} />
            <button type="button" className="sp-modal__close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="sp-modal__body">
          {/* Description */}
          <p className="t-modal__desc">{tournament.description}</p>

          {/* Stats row */}
          <div className="t-modal__stats">
            <div className="t-modal__stat">
              <Trophy className="t-modal__stat-icon" style={{ color: '#e6c364' }} />
              <p className="t-modal__stat-label">Giải thưởng</p>
              <p className="t-modal__stat-value">{(tournament.totalPrize / 1000000000).toFixed(1)} tỷ đ</p>
            </div>
            <div className="t-modal__stat">
              <Calendar className="t-modal__stat-icon" style={{ color: '#8dd6a6' }} />
              <p className="t-modal__stat-label">Số chặng</p>
              <p className="t-modal__stat-value">{tournament.totalRaces}</p>
            </div>
            <div className="t-modal__stat">
              <Users className="t-modal__stat-icon" style={{ color: '#89d2a2' }} />
              <p className="t-modal__stat-label">Người tham gia</p>
              <p className="t-modal__stat-value">{tournament.participants}</p>
            </div>
            <div className="t-modal__stat">
              <MapPin className="t-modal__stat-icon" style={{ color: '#bfc9bf' }} />
              <p className="t-modal__stat-label">Địa điểm</p>
              <p className="t-modal__stat-value">{tournament.location}</p>
            </div>
          </div>

          {/* Races list */}
          <div>
            <p className="t-modal__races-title">Danh sách chặng đua</p>
            <div className="t-modal__races-list">
              {tournament.races?.map(race => (
                <div key={race.id} className="t-modal__race-item">
                  <div className="t-modal__race-info">
                    <p className="t-modal__race-name">{race.name}</p>
                    <p className="t-modal__race-date">{race.date}</p>
                  </div>
                  <StatusBadge status={race.status} label={race.statusLabel} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TournamentsPage() {
  const [search, setSearch] = useState('')
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTournament, setSelectedTournament] = useState(null)

  const loadTournaments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await tournamentService.getTournamentsList()
      if (data.length > 0) {
        setTournaments(data)
      } else {
        setTournaments(MOCK_TOURNAMENTS)
      }
    } catch {
      setTournaments(MOCK_TOURNAMENTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTournaments()
  }, [loadTournaments])

  const filtered = tournaments.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">
        {/* Header */}
        <div className="sp-page-header">
          <div>
            <p className="sp-page-eyebrow">Khám phá</p>
            <h1 className="sp-page-title">Giải đấu</h1>
            <p className="sp-page-subtitle">Theo dõi các giải đua ngựa nổi bật</p>
          </div>
        </div>

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

        {/* Grid */}
        {loading ? (
          <div className="sp-loading">
            <div className="sp-spinner" />
            <p>Đang tải danh sách giải đấu…</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="t-grid">
            {filtered.map(t => (
              <TournamentCard
                key={t.id}
                tournament={t}
                onClick={setSelectedTournament}
              />
            ))}
          </div>
        ) : (
          <div className="sp-empty">
            <span className="sp-empty__icon">🏆</span>
            <p className="sp-empty__title">Không tìm thấy giải đấu</p>
            <p className="sp-empty__desc">Thử thay đổi từ khóa tìm kiếm</p>
            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setSearch('')}>
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedTournament && (
        <TournamentModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
        />
      )}
    </div>
  )
}
