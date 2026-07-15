/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner - Giải đấu
 * - Danh sách giải đấu public (GET /api/tournaments)
 * - Chi tiết giải + chặng đua (GET /api/tournaments/:id/races)
 * - Đăng ký ngựa vào chặng (POST /api/races/:raceId/entries)
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Trophy, MapPin, Calendar, Eye, Plus, X, ChevronRight, ChevronDown, ListChecks, FileCheck2 } from "lucide-react"
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal"
import { StatusBadge } from "../../components/ui/Badges"
import { Skeleton } from "../../components/ui/Skeleton"
import { tournamentService } from "../../services/tournamentService"
import { raceService } from "../../services/raceService"
import { horseService } from "../../services/horseService"
import { raceEntryService } from "../../services/raceEntryService"
import { horseOwnerScheduleService } from "../../services/horseOwnerScheduleService"
import {
  OwnerPageHeader,
  OwnerToolbar,
  OwnerSearchInput,
  OwnerFilterSelect,
  OwnerErrorAlert,
} from "../../components/horseOwner/OwnerCommon"
import "./HorseOwnerTournamentPage.css"

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "OPEN", label: "Đang mở đăng ký" },
  { value: "ONGOING", label: "Đang diễn ra" },
  { value: "FINISHED", label: "Đã kết thúc" },
  { value: "CANCELLED", label: "Đã hủy" },
]

function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

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

const emptyRegisterForm = () => ({
  raceId: "",
  horseId: "",
  note: "",
})

export default function HorseOwnerTournamentPage() {
  const [tournaments, setTournaments] = useState([])
  const [horses, setHorses] = useState([])
  const [cachedEntries, setCachedEntries] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const [showDetail, setShowDetail] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [tournamentRaces, setTournamentRaces] = useState([])
  const [loadingRaces, setLoadingRaces] = useState(false)

  const [showRegister, setShowRegister] = useState(false)
  const [registerRace, setRegisterRace] = useState(null)

  const [toast, setToast] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [ts, hs, cached] = await Promise.all([
        tournamentService.getPublicTournaments(),
        horseService.getMyHorses().catch(() => []),
        Promise.resolve(horseOwnerScheduleService.getCachedEntries()),
      ])
      setTournaments(Array.isArray(ts) ? ts : [])
      setHorses(Array.isArray(hs) ? hs : [])
      setCachedEntries(cached || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tournaments.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false
      if (q) {
        const name = (t.name || "").toLowerCase()
        const desc = (t.description || "").toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [tournaments, search, statusFilter])

  const stats = useMemo(() => {
    const open = tournaments.filter((t) => t.status === "OPEN").length
    const ongoing = tournaments.filter((t) => t.status === "ONGOING").length
    const finished = tournaments.filter((t) => t.status === "FINISHED").length
    return { open, ongoing, finished, total: tournaments.length }
  }, [tournaments])

  const handleViewDetail = async (tournament) => {
    setSelectedTournament(tournament)
    setShowDetail(true)
    setLoadingRaces(true)
    try {
      const list = await raceService.getRacesByTournament(
        tournament.tournamentId || tournament.id,
      )
      setTournamentRaces(Array.isArray(list) ? list : [])
    } catch {
      setTournamentRaces([])
    } finally {
      setLoadingRaces(false)
    }
  }

  const handleOpenRegister = (race) => {
    setRegisterRace(race)
    setShowRegister(true)
  }

  const handleRegisterSuccess = async () => {
    setShowRegister(false)
    setRegisterRace(null)
    setToast({ type: "success", text: "Đã gửi đăng ký ngựa vào chặng đua, chờ admin duyệt" })
    // Refresh cache + tournaments
    await loadData()
  }

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
          eyebrow="Giải đấu"
          title="Giải đấu & cuộc đua"
          subtitle="Khám phá các giải đấu đang mở, xem điều kiện tham gia và đăng ký ngựa của bạn."
          onRefresh={loadData}
          refreshing={loading}
        />

        {error ? <OwnerErrorAlert message={error} onRetry={loadData} /> : null}

        <div className="oh-stats">
          <div className="oh-stat">
            <p className="oh-stat__label">Tổng giải đấu</p>
            <p className="oh-stat__value">{stats.total}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đang mở ĐK</p>
            <p className="oh-stat__value oh-stat__value--primary">{stats.open}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đang diễn ra</p>
            <p className="oh-stat__value oh-stat__value--gold">{stats.ongoing}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đã kết thúc</p>
            <p className="oh-stat__value">{stats.finished}</p>
          </div>
        </div>

        <OwnerToolbar>
          <OwnerSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên giải đấu…"
          />
          <OwnerFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            label="Trạng thái"
          />
        </OwnerToolbar>

        {loading ? (
          <div className="oh-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="oh-card-skeleton">
                <Skeleton className="oh-card-skeleton__line" />
                <Skeleton className="oh-card-skeleton__line oh-card-skeleton__line--short" />
                <Skeleton className="oh-card-skeleton__line" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="oh-empty">
            <Trophy size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>
              {tournaments.length === 0
                ? "Hiện chưa có giải đấu nào đang mở."
                : "Không có giải đấu nào khớp với bộ lọc hiện tại."}
            </p>
          </div>
        ) : (
          <div className="oh-grid">
            {filtered.map((t) => (
              <TournamentCard
                key={t.tournamentId || t.id}
                tournament={t}
                onView={() => handleViewDetail(t)}
              />
            ))}
          </div>
        )}
      </div>

      {showDetail && selectedTournament ? (
        <TournamentDetailModal
          tournament={selectedTournament}
          races={tournamentRaces}
          loadingRaces={loadingRaces}
          horses={horses}
          cachedEntries={cachedEntries}
          onClose={() => {
            setShowDetail(false)
            setSelectedTournament(null)
            setTournamentRaces([])
          }}
          onRegister={handleOpenRegister}
        />
      ) : null}

      {showRegister && registerRace ? (
        <RegisterHorseModal
          race={registerRace}
          horses={horses.filter((h) => h.status === "APPROVED")}
          cachedEntries={cachedEntries}
          onClose={() => {
            setShowRegister(false)
            setRegisterRace(null)
          }}
          onSuccess={handleRegisterSuccess}
        />
      ) : null}
    </div>
  )
}

/* ============== TOURNAMENT CARD ============== */
function TournamentCard({ tournament, onView }) {
  return (
    <article className="oh-tournament-card">
      <div className="oh-tournament-card__head">
        <div className="oh-tournament-card__icon" aria-hidden="true">
          <Trophy size={20} />
        </div>
        <div className="oh-tournament-card__title">
          <h3>{tournament.name || "Giải đấu"}</h3>
          <p>
            {tournament.status === "OPEN"
              ? "Đang mở đăng ký"
              : tournament.status === "ONGOING"
                ? "Đang diễn ra"
                : tournament.status === "FINISHED"
                  ? "Đã kết thúc"
                  : tournament.status || "—"}
          </p>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      {tournament.description ? (
        <p className="oh-tournament-card__desc">{tournament.description}</p>
      ) : null}

      <ul className="oh-tournament-card__meta">
        <li>
          <Calendar size={12} />{" "}
          {tournament.startAt ? formatDate(tournament.startAt) : "—"}
          {tournament.endAt ? ` → ${formatDate(tournament.endAt)}` : ""}
        </li>
        {tournament.location ? (
          <li>
            <MapPin size={12} /> {tournament.location}
          </li>
        ) : null}
      </ul>

      <div className="oh-tournament-card__footer">
        <span />
        <button type="button" className="oh-btn oh-btn--primary oh-btn--sm" onClick={onView}>
          <Eye size={12} /> Xem chi tiết
        </button>
      </div>
    </article>
  )
}

/* ============== DETAIL MODAL ============== */
function TournamentDetailModal({
  tournament,
  races,
  loadingRaces,
  horses,
  cachedEntries,
  onClose,
  onRegister,
}) {
  const [expanded, setExpanded] = useState(() => new Set())
  const ownerHorseIds = useMemo(
    () => new Set(horses.map((h) => String(h.horseId || h.id))),
    [horses],
  )

  const toggle = (raceId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(raceId)) next.delete(raceId)
      else next.add(raceId)
      return next
    })
  }

  return (
    <AdminModal
      title={tournament.name || "Chi tiết giải đấu"}
      subtitle={tournament.status || "—"}
      accent="gold"
      size="xl"
      onClose={onClose}
      footer={
        <button type="button" className="oh-btn oh-btn--primary" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="oh-detail-grid">
        <AdminModalSection title="Thông tin giải đấu">
          <dl className="oh-detail-list">
            <div>
              <dt>Tên giải</dt>
              <dd>{tournament.name || "—"}</dd>
            </div>
            {tournament.location ? (
              <div>
                <dt>Địa điểm</dt>
                <dd>{tournament.location}</dd>
              </div>
            ) : null}
            <div>
              <dt>Bắt đầu</dt>
              <dd>{formatDateTime(tournament.startAt)}</dd>
            </div>
            <div>
              <dt>Kết thúc</dt>
              <dd>{formatDateTime(tournament.endAt)}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>
                <StatusBadge status={tournament.status} />
              </dd>
            </div>
          </dl>
        </AdminModalSection>

        <AdminModalSection
          title="Mô tả"
          description="Giới thiệu tổng quan và điều kiện tham gia."
        >
          <p className="oh-tournament-desc">
            {tournament.description || "Chưa có mô tả chi tiết cho giải đấu này."}
          </p>
        </AdminModalSection>
      </div>

      <AdminModalSection
        title="Danh sách chặng đua"
        description={
          loadingRaces
            ? "Đang tải chặng đua…"
            : `${races.length} chặng đua trong giải`
        }
      >
        {loadingRaces ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Skeleton className="oh-card-skeleton__line" />
            <Skeleton className="oh-card-skeleton__line" />
          </div>
        ) : races.length === 0 ? (
          <p className="oh-empty oh-empty--inline">
            <ListChecks size={14} /> Chưa có chặng đua nào trong giải này.
          </p>
        ) : (
          <ul className="oh-race-list">
            {races.map((race) => {
              const myEntries = cachedEntries
                .filter((e) => String(e.raceId) === String(race.raceId || race.id))
                .filter((e) => ownerHorseIds.has(String(e.horseId)))
              const isRegistered = myEntries.length > 0
              const isOpen =
                tournament.status === "OPEN" && race.registrationOpen !== false

              return (
                <li key={race.raceId || race.id} className="oh-race-list__item">
                  <div className="oh-race-list__head">
                    <button
                      type="button"
                      className="oh-race-list__toggle"
                      onClick={() => toggle(race.raceId || race.id)}
                      aria-expanded={expanded.has(race.raceId || race.id)}
                    >
                      {expanded.has(race.raceId || race.id) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    <div className="oh-race-list__main">
                      <h4>{race.name || "Chặng đua"}</h4>
                      <p>
                        <Calendar size={11} /> {formatDateTime(race.scheduledAt)}
                        {race.location ? ` · ${race.location}` : ""}
                      </p>
                    </div>
                    <div className="oh-race-list__badges">
                      <StatusBadge status={race.status} />
                      {isRegistered ? (
                        <span className="oh-race-list__registered">
                          <FileCheck2 size={11} /> Đã ĐK
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="oh-btn oh-btn--primary oh-btn--sm"
                      onClick={() => onRegister(race)}
                      disabled={!isOpen || isRegistered}
                      title={
                        isRegistered
                          ? "Bạn đã đăng ký ngựa cho chặng này"
                          : !isOpen
                            ? "Chặng đua đang đóng đăng ký"
                            : "Đăng ký ngựa"
                      }
                    >
                      <Plus size={12} /> Đăng ký
                    </button>
                  </div>
                  {expanded.has(race.raceId || race.id) ? (
                    <div className="oh-race-list__body">
                      {myEntries.length > 0 ? (
                        <p className="oh-race-list__entries">
                          <strong>Ngựa của tôi đã đăng ký:</strong>{" "}
                          {myEntries.map((e) => e.horseName || `#${e.horseId}`).join(", ")}
                        </p>
                      ) : null}
                      <p className="oh-race-list__note">
                        Số ngựa đã đăng ký: {race.entryCount ?? "—"}
                      </p>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </AdminModalSection>
    </AdminModal>
  )
}

/* ============== REGISTER MODAL ============== */
function RegisterHorseModal({ race, horses, cachedEntries, onClose, onSuccess }) {
  const [form, setForm] = useState({ ...emptyRegisterForm(), raceId: race?.raceId || race?.id || "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (field) => (e) => {
    setForm((s) => ({ ...s, [field]: e.target.value }))
  }

  // Đã đăng ký chưa?
  const alreadyRegistered = useMemo(() => {
    if (!form.horseId || !race) return null
    return cachedEntries.find(
      (e) =>
        String(e.raceId) === String(race.raceId || race.id) &&
        String(e.horseId) === String(form.horseId),
    )
  }, [form.horseId, race, cachedEntries])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!form.horseId) {
      setError("Vui lòng chọn ngựa để đăng ký")
      return
    }
    if (alreadyRegistered) {
      setError("Ngựa này đã được đăng ký cho chặng đua")
      return
    }
    if (!race.registrationOpen && race.registrationOpen !== undefined) {
      setError("Chặng đua đã đóng đăng ký")
      return
    }

    setSaving(true)
    try {
      // Dùng raceEntryService.createEntry theo mainflow.md
      // POST /api/races/:raceId/entries — entry trực tiếp (không qua invitation)
      const entry = await raceEntryService.createEntry({
        raceId: Number(race.raceId || race.id),
        horseId: Number(form.horseId),
      })
      // Cache lại để schedule page nhận biết
      horseOwnerScheduleService.cacheEntry({
        raceId: Number(race.raceId || race.id),
        horseId: Number(form.horseId),
        horseName: horses.find((h) => String(h.horseId || h.id) === String(form.horseId))?.name || "",
        status: entry?.status || "PENDING",
        registeredAt: new Date().toISOString(),
      })
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminModal
      title="Đăng ký ngựa vào chặng đua"
      subtitle={race?.name || ""}
      accent="primary"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="oh-btn oh-btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="register-form"
            className="oh-btn oh-btn--primary"
            disabled={saving}
          >
            <Plus size={14} /> {saving ? "Đang gửi…" : "Xác nhận đăng ký"}
          </button>
        </>
      }
    >
      <form id="register-form" onSubmit={handleSubmit}>
        {error ? <AdminModalAlert type="error">{error}</AdminModalAlert> : null}
        <AdminModalAlert type="info">
          Đăng ký trực tiếp — ngựa sẽ vào danh sách chờ duyệt của admin. Nếu muốn mời
          kỵ sĩ trước khi đăng ký, hãy dùng trang "Mời kỵ sĩ" trước.
        </AdminModalAlert>
        {horses.length === 0 ? (
          <AdminModalAlert type="info">
            Bạn chưa có ngựa nào được duyệt. Hãy vào trang "Ngựa của tôi" để đăng ký ngựa trước.
          </AdminModalAlert>
        ) : null}

        <AdminModalSection title="Thông tin đăng ký">
          <div className="oh-form-grid">
            <AdminModalField label="Chọn ngựa" required className="oh-form-full">
              <select
                className="oh-input"
                value={form.horseId}
                onChange={handleChange("horseId")}
              >
                <option value="">Chọn ngựa…</option>
                {horses.map((h) => (
                  <option key={h.horseId || h.id} value={h.horseId || h.id}>
                    {h.name} {h.breed ? `· ${h.breed}` : ""}
                  </option>
                ))}
              </select>
            </AdminModalField>

            <AdminModalField
              label="Ghi chú"
              hint="Tùy chọn — ghi chú cho ban tổ chức."
              className="oh-form-full"
            >
              <textarea
                className="oh-input"
                value={form.note}
                onChange={handleChange("note")}
                placeholder="VD: Ngựa mới tập, cần bốc thăm cổng ngoài…"
                rows={3}
                disabled
                style={{ resize: "vertical", minHeight: "70px" }}
              />
              <span className="oh-field-hint">
                TODO: Backend chưa hỗ trợ lưu ghi chú kèm đăng ký.
              </span>
            </AdminModalField>
          </div>
        </AdminModalSection>

        {race ? (
          <AdminModalSection title="Thông tin chặng đua">
            <dl className="oh-detail-list">
              <div>
                <dt>Chặng</dt>
                <dd>{race.name}</dd>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd>{formatDateTime(race.scheduledAt)}</dd>
              </div>
              {race.location ? (
                <div>
                  <dt>Địa điểm</dt>
                  <dd>{race.location}</dd>
                </div>
              ) : null}
              <div>
                <dt>Đăng ký</dt>
                <dd>
                  {race.registrationOpen === false
                    ? "Đã đóng"
                    : "Đang mở"}
                </dd>
              </div>
            </dl>
          </AdminModalSection>
        ) : null}
      </form>
    </AdminModal>
  )
}
