/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner - Quản lý ngựa
 * - Danh sách ngựa của owner (GET /api/horses/mine)
 * - Tạo ngựa mới (POST /api/horses) - backend hỗ trợ name, breed, dateOfBirth, sex, color
 * - Xem chi tiết (read-only; backend chưa có PUT /api/horses/:id cho owner)
 * - TODO: Backend chưa hỗ trợ update/delete horse cho owner
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Eye, X, AlertCircle, PawPrint, Calendar, Hash, Trophy, Activity, Award, FileCheck2, Trash2 } from "lucide-react"
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal"
import { StatusBadge } from "../../components/ui/Badges"
import { Skeleton } from "../../components/ui/Skeleton"
import { horseService } from "../../services/horseService"
import {
  OwnerPageHeader,
  OwnerPrimaryButton,
  OwnerToolbar,
  OwnerSearchInput,
  OwnerFilterSelect,
  OwnerErrorAlert,
} from "../../components/horseOwner/OwnerCommon"
import "./HorseOwnerHorseManagementPage.css"

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "INACTIVE", label: "Ngưng hoạt động" },
]

const SEX_OPTIONS = [
  { value: "", label: "Chọn giới tính" },
  { value: "MALE", label: "Đực" },
  { value: "FEMALE", label: "Cái" },
  { value: "GELDING", label: "Thiến" },
]

function computeAge(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  const years = diff / (1000 * 60 * 60 * 24 * 365.25)
  return Math.max(0, Math.floor(years))
}

const emptyForm = () => ({
  name: "",
  breed: "",
  dateOfBirth: "",
  sex: "",
  color: "",
})

export default function HorseOwnerHorseManagementPage() {
  const [horses, setHorses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedHorse, setSelectedHorse] = useState(null)

  const [toast, setToast] = useState(null)

  const loadHorses = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await horseService.getMyHorses()
      setHorses(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setHorses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHorses()
  }, [loadHorses])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return horses.filter((h) => {
      if (statusFilter !== "ALL" && h.status !== statusFilter) return false
      if (q) {
        const name = (h.name || "").toLowerCase()
        const breed = (h.breed || "").toLowerCase()
        if (!name.includes(q) && !breed.includes(q) && !String(h.horseId || "").includes(q)) {
          return false
        }
      }
      return true
    })
  }, [horses, search, statusFilter])

  const stats = useMemo(() => {
    const total = horses.length
    const active = horses.filter((h) => h.status === "APPROVED").length
    const pending = horses.filter((h) => h.status === "PENDING").length
    const rejected = horses.filter((h) => h.status === "REJECTED").length
    return { total, active, pending, rejected }
  }, [horses])

  const handleCreateSuccess = async () => {
    setShowFormModal(false)
    setToast({ type: "success", text: "Đã gửi hồ sơ ngựa, chờ admin duyệt" })
    await loadHorses()
  }

  const handleViewDetail = (horse) => {
    setSelectedHorse(horse)
    setShowDetailModal(true)
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
          eyebrow="Quản lý trang trại"
          title="Ngựa của tôi"
          subtitle="Theo dõi, đăng ký và quản lý tất cả ngựa thuộc sở hữu của bạn."
          primaryAction={
            <OwnerPrimaryButton
              icon={Plus}
              onClick={() => setShowFormModal(true)}
            >
              Đăng ký ngựa mới
            </OwnerPrimaryButton>
          }
          onRefresh={loadHorses}
          refreshing={loading}
        />

        {error ? <OwnerErrorAlert message={error} onRetry={loadHorses} /> : null}

        <div className="oh-stats">
          <div className="oh-stat">
            <p className="oh-stat__label">Tổng số ngựa</p>
            <p className="oh-stat__value">{stats.total}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Đang hoạt động</p>
            <p className="oh-stat__value oh-stat__value--primary">{stats.active}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Chờ duyệt</p>
            <p className="oh-stat__value oh-stat__value--gold">{stats.pending}</p>
          </div>
          <div className="oh-stat">
            <p className="oh-stat__label">Bị từ chối</p>
            <p className="oh-stat__value oh-stat__value--danger">{stats.rejected}</p>
          </div>
        </div>

        <OwnerToolbar>
          <OwnerSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, giống hoặc mã ngựa…"
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
            <PawPrint size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>
              {horses.length === 0
                ? "Bạn chưa đăng ký ngựa nào."
                : "Không có ngựa nào khớp với bộ lọc hiện tại."}
            </p>
            {horses.length === 0 ? (
              <div style={{ marginTop: "0.85rem" }}>
                <OwnerPrimaryButton
                  icon={Plus}
                  onClick={() => setShowFormModal(true)}
                >
                  Đăng ký ngựa đầu tiên
                </OwnerPrimaryButton>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="oh-grid">
            {filtered.map((horse) => (
              <HorseCard
                key={horse.horseId || horse.id}
                horse={horse}
                onView={() => handleViewDetail(horse)}
              />
            ))}
          </div>
        )}
      </div>

      {showFormModal ? (
        <HorseFormModal
          onClose={() => setShowFormModal(false)}
          onSuccess={handleCreateSuccess}
        />
      ) : null}

      {showDetailModal && selectedHorse ? (
        <HorseDetailModal
          horse={selectedHorse}
          onClose={() => setShowDetailModal(false)}
        />
      ) : null}
    </div>
  )
}

/* ============== HORSE CARD ============== */
function HorseCard({ horse, onView }) {
  const metrics = horse.careerMetrics || {}
  const age = computeAge(horse.dateOfBirth) || horse.age

  return (
    <article className="oh-horse-card">
      <div className="oh-horse-card__head">
        <div className="oh-horse-card__avatar" aria-hidden="true">
          <PawPrint size={22} />
        </div>
        <div className="oh-horse-card__title">
          <h3>{horse.name || "Chưa có tên"}</h3>
          <p>
            <Hash size={11} /> #{horse.horseId || horse.id} · {horse.breed || "Chưa rõ giống"}
          </p>
        </div>
        <StatusBadge status={horse.status} />
      </div>

      <div className="oh-horse-card__meta">
        <div>
          <span>Tuổi</span>
          <strong>{age != null ? `${age} tuổi` : "—"}</strong>
        </div>
        <div>
          <span>Số lần đua</span>
          <strong>{metrics.totalStarts ?? 0}</strong>
        </div>
        <div>
          <span>Thắng</span>
          <strong>{metrics.wins ?? 0}</strong>
        </div>
        <div>
          <span>Phong độ</span>
          <strong className="oh-horse-card__form">{metrics.recentFormText || "—"}</strong>
        </div>
      </div>

      {horse.color || horse.sex ? (
        <p className="oh-horse-card__sub">
          {[horse.sex, horse.color].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <div className="oh-horse-card__footer">
        {horse.dateOfBirth ? (
          <span className="oh-horse-card__age">
            <Calendar size={11} /> {new Date(horse.dateOfBirth).toLocaleDateString("vi-VN")}
          </span>
        ) : (
          <span />
        )}
        <button type="button" className="oh-btn oh-btn--ghost oh-btn--sm" onClick={onView}>
          <Eye size={12} /> Xem chi tiết
        </button>
      </div>
    </article>
  )
}

/* ============== FORM MODAL ============== */
function HorseFormModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (field) => (e) => {
    setForm((s) => ({ ...s, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên ngựa")
      return
    }
    if (
      form.dateOfBirth &&
      Number.isNaN(new Date(form.dateOfBirth).getTime())
    ) {
      setError("Ngày sinh không hợp lệ")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
      }
      if (form.breed.trim()) payload.breed = form.breed.trim()
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth
      if (form.sex) payload.sex = form.sex
      if (form.color.trim()) payload.color = form.color.trim()

      await horseService.registerNewHorseDirect(payload)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminModal
      title="Đăng ký ngựa mới"
      subtitle="Hồ sơ sẽ được gửi cho admin duyệt trước khi ngựa có thể tham gia giải đấu."
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
            form="horse-form"
            className="oh-btn oh-btn--primary"
            disabled={saving}
          >
            {saving ? "Đang gửi…" : "Gửi đăng ký"}
          </button>
        </>
      }
    >
      <form id="horse-form" onSubmit={handleSubmit}>
        {error ? <AdminModalAlert type="error">{error}</AdminModalAlert> : null}

        <AdminModalSection title="Thông tin cơ bản" description="Các trường có dấu * là bắt buộc.">
          <div className="oh-form-grid">
            <AdminModalField label="Tên ngựa" required>
              <input
                type="text"
                className="oh-input"
                value={form.name}
                onChange={handleChange("name")}
                placeholder="VD: Thunder Strike"
                autoFocus
              />
            </AdminModalField>
            <AdminModalField label="Giống" hint="VD: Thoroughbred, Arabian…">
              <input
                type="text"
                className="oh-input"
                value={form.breed}
                onChange={handleChange("breed")}
                placeholder="Thoroughbred"
              />
            </AdminModalField>
            <AdminModalField label="Ngày sinh">
              <input
                type="date"
                className="oh-input"
                value={form.dateOfBirth}
                onChange={handleChange("dateOfBirth")}
                max={new Date().toISOString().slice(0, 10)}
              />
            </AdminModalField>
            <AdminModalField label="Giới tính">
              <select
                className="oh-input"
                value={form.sex}
                onChange={handleChange("sex")}
              >
                {SEX_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </AdminModalField>
            <AdminModalField label="Màu lông" hint="Tùy chọn" className="oh-form-full">
              <input
                type="text"
                className="oh-input"
                value={form.color}
                onChange={handleChange("color")}
                placeholder="VD: Vàng kim, Nâu, Xám…"
              />
            </AdminModalField>
          </div>
        </AdminModalSection>

        <AdminModalSection
          title="Lưu ý"
          description="Sau khi gửi, ngựa sẽ ở trạng thái PENDING. Bạn có thể tiếp tục cập nhật thông tin hoặc đăng ký thi đấu khi admin duyệt."
        >
          <ul className="oh-form-tips">
            <li>
              <AlertCircle size={13} /> Admin sẽ xét duyệt trong vòng 24-48 giờ.
            </li>
            <li>
              <AlertCircle size={13} /> Ngựa bị từ chối có thể cập nhật lại sau.
            </li>
            <li>
              <AlertCircle size={13} /> Tên ngựa phải là duy nhất trong trang trại của bạn.
            </li>
          </ul>
        </AdminModalSection>
      </form>
    </AdminModal>
  )
}

/* ============== DETAIL MODAL ============== */
function HorseDetailModal({ horse, onClose }) {
  if (!horse) return null
  const metrics = horse.careerMetrics || {}
  const age = computeAge(horse.dateOfBirth) || horse.age
  const recent = metrics.recentForm || []

  return (
    <AdminModal
      title={horse.name || "Chi tiết ngựa"}
      subtitle={`Mã ngựa #${horse.horseId || horse.id}`}
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
        <AdminModalSection title="Thông tin cơ bản">
          <dl className="oh-detail-list">
            <div>
              <dt>Tên</dt>
              <dd>{horse.name || "—"}</dd>
            </div>
            <div>
              <dt>Giống</dt>
              <dd>{horse.breed || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Tuổi</dt>
              <dd>{age != null ? `${age} tuổi` : "—"}</dd>
            </div>
            <div>
              <dt>Giới tính</dt>
              <dd>{horse.sex || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Màu lông</dt>
              <dd>{horse.color || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Ngày sinh</dt>
              <dd>
                {horse.dateOfBirth
                  ? new Date(horse.dateOfBirth).toLocaleDateString("vi-VN")
                  : "—"}
              </dd>
            </div>
          </dl>
        </AdminModalSection>

        <AdminModalSection title="Trạng thái hồ sơ">
          <div className="oh-detail-status">
            <StatusBadge status={horse.status} />
            {horse.status === "REJECTED" && horse.rejectionReason ? (
              <p className="oh-detail-warning">
                <AlertCircle size={14} /> Lý do từ chối: <strong>{horse.rejectionReason}</strong>
              </p>
            ) : null}
            <dl className="oh-detail-list">
              <div>
                <dt>Ngày tạo</dt>
                <dd>
                  {horse.createdAt
                    ? new Date(horse.createdAt).toLocaleString("vi-VN")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Cập nhật</dt>
                <dd>
                  {horse.updatedAt
                    ? new Date(horse.updatedAt).toLocaleString("vi-VN")
                    : "—"}
                </dd>
              </div>
              {horse.approvedAt ? (
                <div>
                  <dt>Ngày duyệt</dt>
                  <dd>{new Date(horse.approvedAt).toLocaleString("vi-VN")}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </AdminModalSection>
      </div>

      <AdminModalSection title="Thành tích">
        <div className="oh-detail-stats">
          <div className="oh-detail-stat">
            <Activity size={18} />
            <div>
              <p className="oh-detail-stat__label">Tổng lần đua</p>
              <p className="oh-detail-stat__value">{metrics.totalStarts ?? 0}</p>
            </div>
          </div>
          <div className="oh-detail-stat">
            <Award size={18} />
            <div>
              <p className="oh-detail-stat__label">Số trận thắng</p>
              <p className="oh-detail-stat__value">{metrics.wins ?? 0}</p>
            </div>
          </div>
          <div className="oh-detail-stat">
            <Trophy size={18} />
            <div>
              <p className="oh-detail-stat__label">Tỷ lệ thắng</p>
              <p className="oh-detail-stat__value">
                {metrics.winRate != null ? `${metrics.winRate}%` : "—"}
              </p>
            </div>
          </div>
          <div className="oh-detail-stat">
            <FileCheck2 size={18} />
            <div>
              <p className="oh-detail-stat__label">Phong độ gần đây</p>
              <p className="oh-detail-stat__value oh-detail-stat__value--form">
                {metrics.recentFormText || "—"}
              </p>
            </div>
          </div>
        </div>
      </AdminModalSection>

      {recent.length > 0 ? (
        <AdminModalSection title="Lịch sử giải đấu gần đây">
          <ul className="oh-recent-list">
            {recent.map((r, idx) => (
              <li key={`${r.raceId}-${idx}`}>
                <div>
                  <strong>{r.raceName}</strong>
                  {r.tournamentName ? <span> · {r.tournamentName}</span> : null}
                  <p>
                    {r.scheduledAt
                      ? new Date(r.scheduledAt).toLocaleDateString("vi-VN")
                      : "—"}
                  </p>
                </div>
                <span className="oh-recent-list__pos">#{r.finishPosition || "—"}</span>
              </li>
            ))}
          </ul>
        </AdminModalSection>
      ) : null}

      <AdminModalSection
        title="Cập nhật thông tin"
        description="Tính năng chỉnh sửa hồ sơ ngựa sẽ được bổ sung khi backend hỗ trợ endpoint PATCH /api/horses/:id cho chủ ngựa."
      >
        <p className="oh-empty oh-empty--inline">
          <Trash2 size={14} /> TODO: Tính năng cập nhật / xóa ngựa cho owner sẽ được bổ sung khi backend cung cấp endpoint.
        </p>
      </AdminModalSection>
    </AdminModal>
  )
}
