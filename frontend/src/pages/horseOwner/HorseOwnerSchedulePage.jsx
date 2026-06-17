/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner - Lịch thi đấu
 *
 * TODO: Backend chưa có endpoint riêng cho "lịch thi đấu của owner"
 * (ví dụ GET /api/horse-owners/me/schedule).
 * Trang này tổng hợp từ:
 *   - GET /api/tournaments              (giải public)
 *   - GET /api/tournaments/:id/races    (chặng đua theo giải)
 *   - GET /api/horses/mine              (ngựa của tôi)
 *   - local cache (localStorage)        (các entry owner vừa tạo)
 *
 * MOCK DATA: Backend API cho lịch thi đấu owner chưa có sẵn.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Calendar, MapPin, Clock, RefreshCcw, X, Eye, Hash, Filter, Trophy, CheckCircle2 } from "lucide-react"
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
} from "../../components/ui/AdminModal"
import { StatusBadge } from "../../components/ui/Badges"
import { Skeleton } from "../../components/ui/Skeleton"
import { horseOwnerScheduleService } from "../../services/horseOwnerScheduleService"
import {
  OwnerPageHeader,
  OwnerToolbar,
  OwnerSearchInput,
  OwnerFilterSelect,
  OwnerErrorAlert,
} from "../../components/horseOwner/OwnerCommon"
import "./HorseOwnerSchedulePage.css"

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "UPCOMING", label: "Sắp diễn ra" },
  { value: "ONGOING", label: "Đang diễn ra" },
  { value: "FINISHED", label: "Đã kết thúc" },
]

const VIEW_OPTIONS = [
  { value: "LIST", label: "Danh sách" },
  { value: "TIMELINE", label: "Dòng thời gian" },
]

function formatDateTime(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getRaceStatusBucket(race) {
  const status = String(race.status || "").toUpperCase()
  if (status === "ONGOING") return "ONGOING"
  if (status === "FINISHED" || status === "CANCELLED") return "FINISHED"
  // Default — SCHEDULED / no status / OPEN registration
  return "UPCOMING"
}

export default function HorseOwnerSchedulePage() {
  const [horses, setHorses] = useState([])
  const [races, setRaces] = useState([])
  const [tournaments, setTournaments] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [statusFilter, setStatusFilter] = useState("ALL")
  const [tournamentFilter, setTournamentFilter] = useState("ALL")
  const [horseFilter, setHorseFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [view, setView] = useState("LIST")

  const [showDetail, setShowDetail] = useState(false)
  const [selectedRace, setSelectedRace] = useState(null)
  const [toast, setToast] = useState(null)

  const loadSchedule = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await horseOwnerScheduleService.buildSchedule()
      setHorses(data.horses || [])
      setRaces(data.races || [])
      setTournaments(data.tournaments || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setRaces([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return races.filter((race) => {
      // Status filter
      if (statusFilter !== "ALL") {
        const bucket = getRaceStatusBucket(race)
        if (bucket !== statusFilter) return false
      }
      // Tournament filter
      if (tournamentFilter !== "ALL") {
        if (String(race.tournament?.tournamentId) !== String(tournamentFilter)) {
          return false
        }
      }
      // Horse filter (chỉ giữ race mà ownerEntries có chứa horse đó)
      if (horseFilter !== "ALL") {
        const myEntries = race.ownerEntries || []
        if (!myEntries.some((e) => String(e.horseId) === String(horseFilter))) {
          return false
        }
      }
      // Search
      if (q) {
        const name = (race.name || "").toLowerCase()
        const tName = (race.tournament?.name || "").toLowerCase()
        if (!name.includes(q) && !tName.includes(q)) return false
      }
      return true
    })
  }, [races, statusFilter, tournamentFilter, horseFilter, search])

  // Group theo ngày (cho view TIMELINE)
  const groupedByDate = useMemo(() => {
    if (view !== "TIMELINE") return {}
    const groups = {}
    for (const race of filtered) {
      const key = race.scheduledAt
        ? new Date(race.scheduledAt).toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "Chưa cập nhật"
      if (!groups[key]) groups[key] = []
      groups[key].push(race)
    }
    return groups
  }, [filtered, view])

  const stats = useMemo(() => {
    const upcoming = races.filter((r) => getRaceStatusBucket(r) === "UPCOMING").length
    const ongoing = races.filter((r) => getRaceStatusBucket(r) === "ONGOING").length
    const finished = races.filter((r) => getRaceStatusBucket(r) === "FINISHED").length
    const registered = races.filter((r) => r.registered).length
    return { upcoming, ongoing, finished, registered }
  }, [races])

  return (
    <div className="oh-page">
      {toast ? (
        <div className={`owner-toast owner-toast--${toast.type}`} role="status">
          <span className="owner-toast-icon" aria-hidden="true">
            {toast.type === "success" ? "✓" : "!"}
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

      <div className="owner-page-inner">
        <OwnerPageHeader
          eyebrow="Lịch thi đấu"
          title="Lịch trình các chặng đua"
          subtitle="Theo dõi các chặng đua liên quan đến ngựa của bạn, cùng trạng thái đăng ký."
          onRefresh={loadSchedule}
          refreshing={loading}
        />

        {error ? <OwnerErrorAlert message={error} onRetry={loadSchedule} /> : null}

        <div className="oh-stats">
          <div className="oh-stat">
            <p className="oh-stat__label">Sắp diễn ra</p>
            <p className="oh-stat__value oh-stat__value--primary">{stats.upcoming}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đang diễn ra</p>
            <p className="oh-stat__value oh-stat__value--gold">{stats.ongoing}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đã kết thúc</p>
            <p className="oh-stat__value">{stats.finished}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Ngựa tôi đã ĐK</p>
            <p className="oh-stat__value oh-stat__value--primary">{stats.registered}</p>
          </div>
        </div>

        <OwnerToolbar>
          <OwnerSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên chặng hoặc giải đấu…"
          />
          <OwnerFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
            label="Trạng thái"
          />
          <OwnerFilterSelect
            value={tournamentFilter}
            onChange={setTournamentFilter}
            options={[
              { value: "ALL", label: "Tất cả giải" },
              ...tournaments.map((t) => ({
                value: String(t.tournamentId || t.id),
                label: t.name,
              })),
            ]}
            label="Giải đấu"
          />
          <OwnerFilterSelect
            value={horseFilter}
            onChange={setHorseFilter}
            options={[
              { value: "ALL", label: "Tất cả ngựa" },
              ...horses.map((h) => ({
                value: String(h.horseId || h.id),
                label: h.name,
              })),
            ]}
            label="Ngựa của tôi"
          />
          <OwnerFilterSelect
            value={view}
            onChange={setView}
            options={VIEW_OPTIONS}
            label="Hiển thị"
          />
        </OwnerToolbar>

        {loading ? (
          <div className="oh-schedule-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="oh-card-skeleton">
                <Skeleton className="oh-card-skeleton__line" />
                <Skeleton className="oh-card-skeleton__line oh-card-skeleton__line--short" />
                <Skeleton className="oh-card-skeleton__line" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="oh-empty">
            <Calendar size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>
              {races.length === 0
                ? "Chưa có lịch thi đấu nào sắp tới."
                : "Không có lịch thi đấu nào khớp với bộ lọc hiện tại."}
            </p>
          </div>
        ) : view === "LIST" ? (
          <ul className="oh-schedule-list">
            {filtered.map((race) => (
              <ScheduleRow
                key={race.raceId || race.id}
                race={race}
                onView={() => {
                  setSelectedRace(race)
                  setShowDetail(true)
                }}
              />
            ))}
          </ul>
        ) : (
          <div className="oh-timeline">
            {Object.entries(groupedByDate).map(([date, list]) => (
              <div key={date} className="oh-timeline__group">
                <div className="oh-timeline__date">
                  <Calendar size={14} /> {date}
                </div>
                <ul className="oh-schedule-list oh-schedule-list--nested">
                  {list.map((race) => (
                    <ScheduleRow
                      key={race.raceId || race.id}
                      race={race}
                      onView={() => {
                        setSelectedRace(race)
                        setShowDetail(true)
                      }}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDetail && selectedRace ? (
        <ScheduleDetailModal
          race={selectedRace}
          horses={horses}
          onClose={() => {
            setShowDetail(false)
            setSelectedRace(null)
          }}
        />
      ) : null}
    </div>
  )
}

/* ============== SCHEDULE ROW ============== */
function ScheduleRow({ race, onView }) {
  const bucket = getRaceStatusBucket(race)
  const myEntries = race.ownerEntries || []

  return (
    <li className="oh-schedule-row">
      <div className="oh-schedule-row__date" aria-hidden="true">
        {race.scheduledAt ? (
          <>
            <span className="oh-schedule-row__day">
              {new Date(race.scheduledAt).toLocaleDateString("vi-VN", { day: "2-digit" })}
            </span>
            <span className="oh-schedule-row__month">
              Th{new Date(race.scheduledAt).getMonth() + 1}
            </span>
          </>
        ) : (
          <span className="oh-schedule-row__day">—</span>
        )}
      </div>
      <div className="oh-schedule-row__main">
        <div className="oh-schedule-row__head">
          <h3>{race.name || "Chặng đua"}</h3>
          <StatusBadge
            status={bucket === "UPCOMING" ? "UPCOMING" : bucket === "ONGOING" ? "ONGOING" : "FINISHED"}
          />
          {race.registered ? (
            <span className="oh-schedule-row__registered">
              <CheckCircle2 size={12} /> Đã đăng ký
            </span>
          ) : null}
        </div>
        <ul className="oh-schedule-row__meta">
          {race.tournament?.name ? (
            <li>
              <Trophy size={12} /> {race.tournament.name}
            </li>
          ) : null}
          <li>
            <Clock size={12} /> {formatDateTime(race.scheduledAt)}
          </li>
          {race.location ? (
            <li>
              <MapPin size={12} /> {race.location}
            </li>
          ) : null}
        </ul>
        {myEntries.length > 0 ? (
          <p className="oh-schedule-row__horses">
            <strong>Ngựa của tôi:</strong>{" "}
            {myEntries
              .map((e) => e.horseName || `#${e.horseId}`)
              .join(", ")}
          </p>
        ) : null}
      </div>
      <div className="oh-schedule-row__action">
        <button type="button" className="oh-btn oh-btn--ghost oh-btn--sm" onClick={onView}>
          <Eye size={12} /> Chi tiết
        </button>
      </div>
    </li>
  )
}

/* ============== DETAIL MODAL ============== */
function ScheduleDetailModal({ race, horses, onClose }) {
  if (!race) return null
  const myEntries = race.ownerEntries || []
  const horsesById = useMemo(() => {
    const map = {}
    for (const h of horses || []) {
      const id = h.horseId || h.id
      if (id) map[String(id)] = h
    }
    return map
  }, [horses])

  return (
    <AdminModal
      title={race.name || "Chi tiết chặng đua"}
      subtitle={race.tournament?.name || "—"}
      accent="primary"
      size="lg"
      onClose={onClose}
      footer={
        <button type="button" className="oh-btn oh-btn--primary" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="oh-detail-grid">
        <AdminModalSection title="Thông tin chung">
          <dl className="oh-detail-list">
            <div>
              <dt>Giải đấu</dt>
              <dd>{race.tournament?.name || "—"}</dd>
            </div>
            <div>
              <dt>Chặng đua</dt>
              <dd>{race.name || "—"}</dd>
            </div>
            <div>
              <dt>Địa điểm</dt>
              <dd>{race.location || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Bắt đầu</dt>
              <dd>{formatDateTime(race.scheduledAt)}</dd>
            </div>
            {race.registrationDeadline ? (
              <div>
                <dt>Hạn đăng ký</dt>
                <dd>{formatDateTime(race.registrationDeadline)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Trạng thái</dt>
              <dd>
                <StatusBadge status={race.status} />
              </dd>
            </div>
            {race.registrationOpen != null ? (
              <div>
                <dt>Mở đăng ký</dt>
                <dd>{race.registrationOpen ? "Đang mở" : "Đã đóng"}</dd>
              </div>
            ) : null}
          </dl>
        </AdminModalSection>

        <AdminModalSection title="Ngựa của tôi tham gia">
          {myEntries.length === 0 ? (
            <p className="oh-empty oh-empty--inline">
              <Filter size={14} /> Bạn chưa đăng ký ngựa nào cho chặng đua này.
            </p>
          ) : (
            <ul className="oh-entry-list">
              {myEntries.map((entry, idx) => {
                const horse = horsesById[String(entry.horseId)]
                return (
                  <li key={`${entry.horseId}-${idx}`}>
                    <Hash size={12} /> {entry.horseName || horse?.name || `Ngựa #${entry.horseId}`}
                    <StatusBadge status={entry.status || "PENDING"} />
                  </li>
                )
              })}
            </ul>
          )}
        </AdminModalSection>
      </div>

      <AdminModalSection
        title="Ghi chú"
        description="Trang lịch thi đấu tổng hợp từ dữ liệu public của giải đấu và các entry bạn đã đăng ký."
      >
        <p className="oh-empty oh-empty--inline">
          TODO: Backend chưa có endpoint riêng cho lịch thi đấu của owner. Dữ liệu hiện được tổng hợp từ các API public và local cache.
        </p>
      </AdminModalSection>
    </AdminModal>
  )
}
