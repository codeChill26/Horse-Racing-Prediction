/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner - Mời kỵ sĩ
 * - Tìm kỵ sĩ (GET /api/invitations/jockeys?name=...)
 * - Gửi lời mời (POST /api/invitations) — cần raceId, horseId, jockeyId
 * - Xem lịch sử lời mời đã gửi (GET /api/invitations?status=...)
 * - Xác nhận jockey đã accept (POST /api/invitations/:id/confirm)
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Send, X, RefreshCcw, Mail, Phone, User, Trophy, SendHorizonal, BadgeCheck, BadgeAlert, Clock4 } from "lucide-react"
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal"
import { StatusBadge } from "../../components/ui/Badges"
import { Skeleton } from "../../components/ui/Skeleton"
import { horseService } from "../../services/horseService"
import { tournamentService } from "../../services/tournamentService"
import { raceService } from "../../services/raceService"
import { invitationService } from "../../services/invitationService"
import {
  OwnerPageHeader,
  OwnerToolbar,
  OwnerSearchInput,
  OwnerFilterSelect,
  OwnerErrorAlert,
  OwnerPrimaryButton,
} from "../../components/horseOwner/OwnerCommon"
import "./HorseOwnerInviteJockeyPage.css"

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả lời mời" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "ACCEPTED", label: "Đã chấp nhận" },
  { value: "DECLINED", label: "Đã từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
]

const emptyInviteForm = () => ({
  raceId: "",
  horseId: "",
  jockeyId: "",
  message: "",
})

export default function HorseOwnerInviteJockeyPage() {
  const [jockeys, setJockeys] = useState([])
  const [horses, setHorses] = useState([])
  const [races, setRaces] = useState([])
  const [invitations, setInvitations] = useState([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const [loadingJockeys, setLoadingJockeys] = useState(true)
  const [loadingHorses, setLoadingHorses] = useState(true)
  const [loadingRaces, setLoadingRaces] = useState(true)
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  const [error, setError] = useState("")

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedJockey, setSelectedJockey] = useState(null)
  const [toast, setToast] = useState(null)

  /* === Load data === */
  const loadJockeys = useCallback(async () => {
    setLoadingJockeys(true)
    try {
      const list = await invitationService.searchJockeys(search)
      setJockeys(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingJockeys(false)
    }
  }, [search])

  const loadHorses = useCallback(async () => {
    setLoadingHorses(true)
    try {
      const list = await horseService.getMyHorses()
      const arr = Array.isArray(list) ? list : []
      setHorses(arr.filter((h) => h.status === "APPROVED"))
    } catch {
      setHorses([])
    } finally {
      setLoadingHorses(false)
    }
  }, [])

  const loadRaces = useCallback(async () => {
    setLoadingRaces(true)
    try {
      const tournaments = await tournamentService.getPublicTournaments()
      const ts = Array.isArray(tournaments) ? tournaments : []
      const all = []
      for (const t of ts) {
        if (t.status !== "OPEN" && t.status !== "ONGOING") continue
        try {
          const rs = await raceService.getRacesByTournament(
            t.tournamentId || t.id,
          )
          for (const r of rs || []) {
            all.push({
              ...r,
              tournament: {
                tournamentId: t.tournamentId || t.id,
                name: t.name,
                status: t.status,
              },
            })
          }
        } catch {
          /* skip */
        }
      }
      setRaces(all)
    } catch {
      setRaces([])
    } finally {
      setLoadingRaces(false)
    }
  }, [])

  const loadInvitations = useCallback(async (status) => {
    setLoadingInvitations(true)
    try {
      const list = await invitationService.listInvitations(status)
      setInvitations(Array.isArray(list) ? list : [])
    } catch (e) {
      // Nếu backend không trả được (admin-only chẳng hạn) thì vẫn tiếp tục
      console.warn("Không tải được danh sách lời mời:", e)
      setInvitations([])
    } finally {
      setLoadingInvitations(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadHorses()
    loadRaces()
  }, [loadHorses, loadRaces])

  useEffect(() => {
    loadInvitations(statusFilter === "ALL" ? undefined : statusFilter)
  }, [loadInvitations, statusFilter])

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => {
      loadJockeys()
    }, 300)
    return () => window.clearTimeout(t)
  }, [loadJockeys, search])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  /* === Stats === */
  const stats = useMemo(() => {
    const pending = invitations.filter((i) => i.status === "PENDING").length
    const accepted = invitations.filter((i) => i.status === "ACCEPTED").length
    const declined = invitations.filter((i) => i.status === "DECLINED").length
    return {
      total: invitations.length,
      pending,
      accepted,
      declined,
    }
  }, [invitations])

  const handleOpenInvite = (jockey) => {
    setSelectedJockey(jockey)
    setShowInviteModal(true)
  }

  const handleInviteSuccess = async () => {
    setShowInviteModal(false)
    setSelectedJockey(null)
    setToast({ type: "success", text: "Đã gửi lời mời đến kỵ sĩ" })
    await loadInvitations(statusFilter === "ALL" ? undefined : statusFilter)
  }

  const handleConfirmInvitation = async (inv) => {
    try {
      await invitationService.confirmInvitation(inv.invitationId || inv.id)
      setToast({ type: "success", text: "Đã xác nhận — entry sẽ được tạo tự động" })
      await loadInvitations(statusFilter === "ALL" ? undefined : statusFilter)
    } catch (e) {
      setToast({ type: "error", text: e instanceof Error ? e.message : String(e) })
    }
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
          eyebrow="Mời kỵ sĩ"
          title="Tìm và mời kỵ sĩ"
          subtitle="Mời kỵ sĩ phù hợp để cùng ngựa của bạn tham gia các giải đấu sắp tới."
          onRefresh={() => {
            loadJockeys()
            loadHorses()
            loadRaces()
            loadInvitations(statusFilter === "ALL" ? undefined : statusFilter)
          }}
          refreshing={loadingJockeys || loadingHorses || loadingRaces}
        />

        {error ? <OwnerErrorAlert message={error} onRetry={loadJockeys} /> : null}

        <div className="oh-stats">
          <div className="oh-stat">
            <p className="oh-stat__label">Tổng lời mời</p>
            <p className="oh-stat__value">{stats.total}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đang chờ</p>
            <p className="oh-stat__value oh-stat__value--gold">{stats.pending}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đã chấp nhận</p>
            <p className="oh-stat__value oh-stat__value--primary">{stats.accepted}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đã từ chối</p>
            <p className="oh-stat__value oh-stat__value--danger">{stats.declined}</p>
          </div>
        </div>

        {/* === JOCKEYS SECTION === */}
        <section className="oh-section">
          <div className="oh-section__head">
            <div>
              <h2>Danh sách kỵ sĩ</h2>
              <p>
                {loadingJockeys
                  ? "Đang tải…"
                  : `${jockeys.length} kỵ sĩ khả dụng`}
              </p>
            </div>
          </div>

          <OwnerToolbar>
            <OwnerSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên kỵ sĩ…"
            />
          </OwnerToolbar>

          {loadingJockeys ? (
            <div className="oh-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="oh-card-skeleton">
                  <Skeleton className="oh-card-skeleton__line" />
                  <Skeleton className="oh-card-skeleton__line oh-card-skeleton__line--short" />
                  <Skeleton className="oh-card-skeleton__line" />
                </div>
              ))}
            </div>
          ) : jockeys.length === 0 ? (
            <div className="oh-empty">
              <User size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
              <p>Chưa có kỵ sĩ phù hợp với từ khóa "{search || ""}".</p>
            </div>
          ) : (
            <div className="oh-grid">
              {jockeys.map((jockey) => (
                <JockeyCard
                  key={jockey.userId || jockey.jockeyId || jockey.id}
                  jockey={jockey}
                  onInvite={() => handleOpenInvite(jockey)}
                />
              ))}
            </div>
          )}
        </section>

        {/* === INVITATIONS SECTION === */}
        <section className="oh-section">
          <div className="oh-section__head">
            <div>
              <h2>Lời mời của tôi</h2>
              <p>
                {loadingInvitations
                  ? "Đang tải…"
                  : `${invitations.length} lời mời đã gửi`}
              </p>
            </div>
          </div>

          <OwnerToolbar>
            <OwnerFilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              label="Trạng thái"
            />
          </OwnerToolbar>

          {loadingInvitations ? (
            <div className="oh-invitation-list">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="oh-card-skeleton">
                  <Skeleton className="oh-card-skeleton__line" />
                  <Skeleton className="oh-card-skeleton__line oh-card-skeleton__line--short" />
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="oh-empty">
              <Send size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
              <p>Chưa có lời mời nào trong danh sách này.</p>
            </div>
          ) : (
            <ul className="oh-invitation-list">
              {invitations.map((inv) => (
                <InvitationRow
                  key={inv.invitationId || inv.id}
                  invitation={inv}
                  onConfirm={() => handleConfirmInvitation(inv)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {showInviteModal && selectedJockey ? (
        <InviteJockeyModal
          jockey={selectedJockey}
          horses={horses}
          races={races}
          invitations={invitations}
          onClose={() => {
            setShowInviteModal(false)
            setSelectedJockey(null)
          }}
          onSuccess={handleInviteSuccess}
        />
      ) : null}
    </div>
  )
}

/* ============== JOCKEY CARD ============== */
function JockeyCard({ jockey, onInvite }) {
  const fullName = jockey.fullName || jockey.name || "Kỵ sĩ"
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

  return (
    <article className="oh-jockey-card">
      <div className="oh-jockey-card__head">
        <div className="oh-jockey-card__avatar" aria-hidden="true">
          {initials || "JK"}
        </div>
        <div className="oh-jockey-card__title">
          <h3>{fullName}</h3>
          <p>
            {jockey.email ? (
              <>
                <Mail size={11} /> {jockey.email}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        {jockey.isActive ? (
          <span className="oh-jockey-card__status">
            <BadgeCheck size={12} /> Sẵn sàng
          </span>
        ) : (
          <span className="oh-jockey-card__status oh-jockey-card__status--muted">
            <BadgeAlert size={12} /> Bận
          </span>
        )}
      </div>

      {jockey.phoneNumber ? (
        <p className="oh-jockey-card__phone">
          <Phone size={12} /> {jockey.phoneNumber}
        </p>
      ) : null}

      {jockey.bio ? <p className="oh-jockey-card__bio">{jockey.bio}</p> : null}

      <div className="oh-jockey-card__footer">
        <span className="oh-jockey-card__id">
          Mã: #{jockey.userId || jockey.jockeyId || jockey.id}
        </span>
        <button
          type="button"
          className="oh-btn oh-btn--primary oh-btn--sm"
          onClick={onInvite}
        >
          <SendHorizonal size={12} /> Mời
        </button>
      </div>
    </article>
  )
}

/* ============== INVITATION ROW ============== */
function InvitationRow({ invitation, onConfirm }) {
  const jockeyName = invitation.jockey?.fullName || invitation.jockeyName || "Kỵ sĩ"
  const horseName = invitation.horse?.name || invitation.horseName || "Ngựa"
  const raceName = invitation.race?.name || invitation.raceName || "Chặng đua"
  const tournamentName = invitation.race?.tournament?.name || invitation.tournamentName
  const created = invitation.createdAt ? new Date(invitation.createdAt) : null

  return (
    <li className="oh-invitation-row">
      <div className="oh-invitation-row__avatar">
        <Trophy size={18} />
      </div>
      <div className="oh-invitation-row__body">
        <div className="oh-invitation-row__head">
          <h4>
            {jockeyName} → {horseName}
          </h4>
          <StatusBadge status={invitation.status} />
        </div>
        <p>
          <Clock4 size={11} /> {raceName}
          {tournamentName ? ` · ${tournamentName}` : ""}
          {created ? ` · ${created.toLocaleDateString("vi-VN")}` : ""}
        </p>
        {invitation.declineReason ? (
          <p className="oh-invitation-row__reason">
            Lý do: {invitation.declineReason}
          </p>
        ) : null}
      </div>
      <div className="oh-invitation-row__action">
        {invitation.status === "ACCEPTED" ? (
          <button
            type="button"
            className="oh-btn oh-btn--primary oh-btn--sm"
            onClick={onConfirm}
          >
            <BadgeCheck size={12} /> Xác nhận
          </button>
        ) : null}
      </div>
    </li>
  )
}

/* ============== INVITE MODAL ============== */
function InviteJockeyModal({ jockey, horses, races, invitations, onClose, onSuccess }) {
  const [form, setForm] = useState({
    ...emptyInviteForm(),
    jockeyId: jockey?.userId || jockey?.jockeyId || jockey?.id || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (field) => (e) => {
    setForm((s) => ({ ...s, [field]: e.target.value }))
  }

  // Pending invitations cho cùng cặp (horseId, jockeyId) — không cho phép gửi trùng
  const existingPending = useMemo(() => {
    if (!form.horseId || !form.jockeyId) return []
    return invitations.filter(
      (i) =>
        i.status === "PENDING" &&
        String(i.jockeyId) === String(form.jockeyId) &&
        String(i.horseId) === String(form.horseId),
    )
  }, [form.horseId, form.jockeyId, invitations])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!form.raceId) {
      setError("Vui lòng chọn chặng đua")
      return
    }
    if (!form.horseId) {
      setError("Vui lòng chọn ngựa")
      return
    }
    if (existingPending.length > 0) {
      setError("Bạn đã có lời mời đang chờ kỵ sĩ này cho ngựa này.")
      return
    }

    setSaving(true)
    try {
      await invitationService.createInvitation({
        raceId: Number(form.raceId),
        horseId: Number(form.horseId),
        jockeyId: Number(form.jockeyId),
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
      title={`Mời kỵ sĩ ${jockey?.fullName || ""}`}
      subtitle="Chọn chặng đua và ngựa muốn mời kỵ sĩ tham gia."
      accent="primary"
      size="lg"
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
            form="invite-form"
            className="oh-btn oh-btn--primary"
            disabled={saving}
          >
            <SendHorizonal size={14} /> {saving ? "Đang gửi…" : "Gửi lời mời"}
          </button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit}>
        {error ? <AdminModalAlert type="error">{error}</AdminModalAlert> : null}

        {existingPending.length > 0 ? (
          <AdminModalAlert type="info">
            Đã có lời mời đang chờ kỵ sĩ này cho ngựa đã chọn. Vui lòng đợi phản hồi hoặc chọn ngựa khác.
          </AdminModalAlert>
        ) : null}

        <AdminModalSection
          title="Thông tin lời mời"
          description="Chọn chặng đua và ngựa muốn mời. Tất cả các trường có dấu * là bắt buộc."
        >
          <div className="oh-form-grid">
            <AdminModalField label="Chặng đua" required>
              <select
                className="oh-input"
                value={form.raceId}
                onChange={handleChange("raceId")}
              >
                <option value="">Chọn chặng đua…</option>
                {races.map((r) => (
                  <option key={r.raceId || r.id} value={r.raceId || r.id}>
                    {r.name}
                    {r.tournament?.name ? ` — ${r.tournament.name}` : ""}
                    {r.scheduledAt
                      ? ` (${new Date(r.scheduledAt).toLocaleDateString("vi-VN")})`
                      : ""}
                  </option>
                ))}
              </select>
            </AdminModalField>

            <AdminModalField label="Ngựa của tôi" required>
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
              label="Tin nhắn kèm theo"
              hint="Tùy chọn — sẽ hiển thị cho kỵ sĩ khi họ nhận được lời mời."
              className="oh-form-full"
            >
              <textarea
                className="oh-input"
                value={form.message}
                onChange={handleChange("message")}
                placeholder="VD: Rất mong được hợp tác với bạn tại giải đấu sắp tới…"
                rows={3}
                disabled
                style={{ resize: "vertical", minHeight: "70px" }}
              />
              <span className="oh-field-hint">
                TODO: Backend chưa hỗ trợ lưu message kèm lời mời.
              </span>
            </AdminModalField>
          </div>
        </AdminModalSection>

        {horses.length === 0 ? (
          <AdminModalAlert type="info">
            Bạn chưa có ngựa nào được duyệt. Hãy đăng ký ngựa trước khi mời kỵ sĩ.
          </AdminModalAlert>
        ) : null}
        {races.length === 0 ? (
          <AdminModalAlert type="info">
            Hiện chưa có chặng đua nào đang mở đăng ký.
          </AdminModalAlert>
        ) : null}
      </form>
    </AdminModal>
  )
}
