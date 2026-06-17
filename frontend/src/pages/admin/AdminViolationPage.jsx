/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Eye, Gavel, Edit3 } from "lucide-react";
import { raceService } from "../../services/raceService";
import { formatDate, formatPoints } from "../../utils/formatter";
import {
  SeverityBadge,
  StatusBadge,
  RoleBadge,
} from "../../components/ui/Badges";
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal";
import "./AdminViolationPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "OPEN", label: "Đang xử lý" },
  { value: "REVIEWING", label: "Đang xem xét" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "DISMISSED", label: "Bỏ qua" },
];

const SEVERITY_OPTIONS = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "WARNING", label: "Cảnh báo" },
  { value: "MINOR", label: "Nhẹ" },
  { value: "MAJOR", label: "Nặng" },
  { value: "SEVERE", label: "Rất nặng" },
];

// TODO: Replace mock data with real API when backend endpoint is available.
// Backend hiện chưa có route cho violations.
const MOCK_VIOLATIONS = [
  {
    id: "VIO-001",
    subject: "J. Doe",
    subjectRole: "JOCKEY",
    type: "Sử dụng roi quá số lần quy định",
    raceId: 12,
    raceName: "Belmont Stakes 2026",
    severity: "MAJOR",
    penalty: 5000,
    status: "OPEN",
    recordedAt: "2026-06-15T14:32:00Z",
    description: "Hệ thống camera ghi nhận kỵ sĩ sử dụng roi 8 lần trong chặng, vượt mức 5 lần cho phép.",
    recordedBy: "Trọng tài #2 (Trần Văn A)",
  },
  {
    id: "VIO-002",
    subject: "M. Petrov",
    subjectRole: "JOCKEY",
    type: "Chạm rào gây ảnh hưởng ngựa khác",
    raceId: 11,
    raceName: "Kentucky Derby Qualifier",
    severity: "SEVERE",
    penalty: 15000,
    status: "REVIEWING",
    recordedAt: "2026-06-14T16:00:00Z",
    description: "Phóng viên camera tower B xác nhận có va chạm giữa ngựa số 7 và ngựa số 9 ở lượt 4.",
    recordedBy: "Camera Tower B",
  },
  {
    id: "VIO-003",
    subject: "Stable 23",
    subjectRole: "HORSE_OWNER",
    type: "Đăng ký ngựa trễ hạn 3 lần",
    raceId: null,
    raceName: null,
    severity: "MINOR",
    penalty: 1000,
    status: "RESOLVED",
    recordedAt: "2026-06-13T10:20:00Z",
    description: "Chủ ngựa đăng ký trễ 3 lần trong 2 tháng qua, vi phạm quy chế.",
    recordedBy: "Hệ thống Registration",
  },
  {
    id: "VIO-004",
    subject: "Trainer S. Jenkins",
    subjectRole: "HORSE_OWNER",
    type: "Dùng dược phẩm bị cấm trong danh sách",
    raceId: 10,
    raceName: "Preakness Stakes",
    severity: "SEVERE",
    penalty: 50000,
    status: "OPEN",
    recordedAt: "2026-06-12T08:45:00Z",
    description: "Kết quả kiểm tra nước tiểu ngựa số 3 dương tính với chất cấm Substabalone-X.",
    recordedBy: "Phòng xét nghiệm VET-Lab",
  },
  {
    id: "VIO-005",
    subject: "Camera Tower B",
    subjectRole: "STAFF",
    type: "Ghi nhận hình ảnh sai lệch kết quả",
    raceId: 9,
    raceName: "Tournament GrandStride 2026",
    severity: "WARNING",
    penalty: 0,
    status: "DISMISSED",
    recordedAt: "2026-06-11T17:10:00Z",
    description: "Camera Tower B ghi sai thứ tự về đích trong 3 giây đầu.",
    recordedBy: "Ban giám sát",
  },
];

function truncate(value, max = 28) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export default function AdminViolationPage() {
  const [violations, setViolations] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [statusModal, setStatusModal] = useState(null);

  const loadViolations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // TODO: Replace mock data with real API when backend endpoint is available.
      await raceService.fetchViolationsList().catch(() => null);
      setViolations(MOCK_VIOLATIONS);
    } catch (e) {
      setError(e.message || "Không tải được danh sách vi phạm");
      setViolations(MOCK_VIOLATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  // === SOCKET / REALTIME NOTE (tiếng Việt) ===
  // Khu vực dành cho realtime: cập nhật vi phạm mới từ hệ thống trọng tài.
  // Khi backend tích hợp socket.io, có thể:
  //   socket.on('violation:created', (v) => setViolations((prev) => [v, ...prev]));
  //   socket.on('violation:statusChanged', (v) => replaceViolation(v));

  const filtered = useMemo(() => {
    let list = violations;
    if (statusFilter !== "ALL") {
      list = list.filter((v) => v.status === statusFilter);
    }
    if (severityFilter !== "ALL") {
      list = list.filter((v) => v.severity === severityFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.id.toLowerCase().includes(q) ||
          (v.subject ?? "").toLowerCase().includes(q) ||
          (v.type ?? "").toLowerCase().includes(q) ||
          (v.raceName ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [violations, statusFilter, severityFilter, search]);

  const stats = useMemo(() => {
    return {
      total: violations.length,
      open: violations.filter((v) => v.status === "OPEN").length,
      severe: violations.filter((v) => v.severity === "SEVERE").length,
      totalPenalty: violations.reduce((sum, v) => sum + (v.penalty || 0), 0),
    };
  }, [violations]);

  const replaceViolation = (updated) => {
    setViolations((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v))
    );
  };

  const submitStatusChange = (newStatus, note) => {
    if (!statusModal) return;
    // TODO: Replace mock update with real API when available
    replaceViolation({ ...statusModal, status: newStatus, resolutionNote: note });
    setStatusModal(null);
  };

  return (
    <div className="avp-page">
      <header className="avp-page__header">
        <div>
          <h1 className="avp-page__title">Vi phạm kỷ luật</h1>
          <p className="avp-page__desc">
            Theo dõi, điều tra và ra quyết định xử lý các vi phạm trong thi đấu.
          </p>
        </div>
      </header>

      <div className="avp-stats">
        <div className="avp-stat">
          <div className="avp-stat__label">Tổng vi phạm</div>
          <div className="avp-stat__value">{stats.total}</div>
        </div>
        <div className="avp-stat">
          <div className="avp-stat__label">Đang xử lý</div>
          <div className="avp-stat__value avp-stat__value--warn">{stats.open}</div>
        </div>
        <div className="avp-stat">
          <div className="avp-stat__label">Mức rất nặng</div>
          <div className="avp-stat__value avp-stat__value--err">{stats.severe}</div>
        </div>
        <div className="avp-stat">
          <div className="avp-stat__label">Tổng phạt (điểm)</div>
          <div className="avp-stat__value avp-stat__value--gold">
            {formatPoints(stats.totalPenalty)}
          </div>
        </div>
      </div>

      <div className="avp-toolbar">
        <div className="avp-search-wrap">
          <Search className="avp-search-icon" size={14} />
          <input
            className="avp-search"
            type="search"
            placeholder="Tìm theo mã, đối tượng, loại, chặng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="avp-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="avp-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="avp-btn avp-btn--ghost"
          onClick={loadViolations}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && !loading && <div className="avp-alert--error">{error}</div>}

      {/* TODO: Backend chưa có API, dùng mock data tạm thời */}
      <div className="avp-mock-banner">
        ⚠️ Dữ liệu đang hiển thị từ mock. Backend chưa cung cấp API cho vi phạm.
      </div>

      <div className="avp-panel">
        {loading ? (
          <div className="avp-loading">
            <div className="avp-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="avp-empty">Không có vi phạm nào phù hợp bộ lọc.</div>
        ) : (
          <div className="avp-table-wrap">
            <table className="avp-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Đối tượng</th>
                  <th>Loại vi phạm</th>
                  <th>Mức độ</th>
                  <th>Trạng thái</th>
                  <th>Ngày ghi nhận</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className="avp-code">{v.id}</span>
                    </td>
                    <td>
                      <div className="avp-name" title={v.subject}>
                        {truncate(v.subject, 18)}
                      </div>
                      <div className="avp-meta">
                        <RoleBadge role={v.subjectRole} />
                      </div>
                    </td>
                    <td>
                      <div className="avp-type" title={v.type}>
                        {truncate(v.type, 30)}
                      </div>
                    </td>
                    <td>
                      <SeverityBadge severity={v.severity} />
                    </td>
                    <td>
                      <StatusBadge status={v.status} />
                    </td>
                    <td>{formatDate(v.recordedAt)}</td>
                    <td>
                      <div className="avp-actions">
                        <button
                          type="button"
                          className="avp-icon-btn"
                          title="Xem chi tiết"
                          onClick={() => setDetail(v)}
                        >
                          <Eye size={14} />
                        </button>
                        {(v.status === "OPEN" || v.status === "REVIEWING") && (
                          <button
                            type="button"
                            className="avp-icon-btn avp-icon-btn--gold"
                            title="Cập nhật xử lý"
                            onClick={() => setStatusModal(v)}
                          >
                            <Gavel size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <AdminModal
          size="lg"
          accent="danger"
          title={`Vi phạm ${detail.id}`}
          subtitle={`${detail.subject} • ${detail.type}`}
          onClose={() => setDetail(null)}
        >
          <AdminModalSection
            title="Thông tin vi phạm"
            description="Mô tả chi tiết về vi phạm được trọng tài ghi nhận."
          >
            <AdminModalField label="Mô tả đầy đủ">
              <div className="avp-modal-text">{detail.description}</div>
            </AdminModalField>
          </AdminModalSection>

          <AdminModalSection
            title="Đối tượng & vai trò"
            description="Cá nhân / tổ chức vi phạm."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Đối tượng">
                <div>{detail.subject}</div>
              </AdminModalField>
              <AdminModalField label="Vai trò đối tượng">
                <RoleBadge role={detail.subjectRole} />
              </AdminModalField>
            </div>
          </AdminModalSection>

          <AdminModalSection
            title="Phân loại & xử lý"
            description="Mức độ nghiêm trọng, hình phạt và trạng thái hiện tại."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Mức độ">
                <SeverityBadge severity={detail.severity} />
              </AdminModalField>
              <AdminModalField label="Trạng thái">
                <StatusBadge status={detail.status} />
              </AdminModalField>
              <AdminModalField label="Số điểm phạt">
                <div>
                  {detail.penalty > 0
                    ? `−${formatPoints(detail.penalty)} điểm`
                    : "Không phạt điểm"}
                </div>
              </AdminModalField>
              <AdminModalField label="Ngày ghi nhận">
                <div>{formatDate(detail.recordedAt)}</div>
              </AdminModalField>
              <AdminModalField label="Chặng liên quan">
                <div>
                  {detail.raceName
                    ? `${detail.raceName}${detail.raceId ? ` (#${detail.raceId})` : ""}`
                    : "—"}
                </div>
              </AdminModalField>
              <AdminModalField label="Người ghi nhận">
                <div>{detail.recordedBy || "—"}</div>
              </AdminModalField>
            </div>
          </AdminModalSection>

          {detail.resolutionNote && (
            <AdminModalSection
              title="Lịch sử xử lý"
              description="Biên bản, quyết định do trọng tài / quản trị viên ghi nhận."
            >
              <div className="avp-modal-text">{detail.resolutionNote}</div>
            </AdminModalSection>
          )}
        </AdminModal>
      )}

      {/* Status update modal */}
      {statusModal && (
        <AdminModal
          size="md"
          accent="gold"
          title="Cập nhật xử lý vi phạm"
          subtitle={`Mã: ${statusModal.id} — ${statusModal.subject}`}
          onClose={() => setStatusModal(null)}
        >
          <StatusForm
            current={statusModal}
            onCancel={() => setStatusModal(null)}
            onSubmit={submitStatusChange}
          />
        </AdminModal>
      )}
    </div>
  );
}

function StatusForm({ current, onCancel, onSubmit }) {
  const [nextStatus, setNextStatus] = useState("REVIEWING");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const transitions = {
    OPEN: [
      { value: "REVIEWING", label: "Bắt đầu xem xét" },
      { value: "RESOLVED", label: "Xử lý xong" },
      { value: "DISMISSED", label: "Bỏ qua" },
    ],
    REVIEWING: [
      { value: "RESOLVED", label: "Xử lý xong" },
      { value: "DISMISSED", label: "Bỏ qua" },
    ],
  };
  const options = transitions[current.status] ?? [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nextStatus) {
      setError("Vui lòng chọn trạng thái mới.");
      return;
    }
    if ((nextStatus === "RESOLVED" || nextStatus === "DISMISSED") && !note.trim()) {
      setError("Vui lòng nhập biên bản / quyết định xử lý.");
      return;
    }
    onSubmit(nextStatus, note.trim());
  };

  const footer = (
    <>
      <button type="button" className="avp-btn avp-btn--ghost" onClick={onCancel}>
        Hủy
      </button>
      <button type="submit" form="avp-status-form" className="avp-btn avp-btn--gold">
        <Edit3 size={14} />
        Cập nhật
      </button>
    </>
  );

  return (
    <form id="avp-status-form" onSubmit={handleSubmit}>
      {error && <AdminModalAlert type="error">{error}</AdminModalAlert>}

      <AdminModalSection
        title="Trạng thái mới"
        description={`Chuyển từ "${current.status}" sang một trạng thái hợp lệ.`}
      >
        {options.length === 0 ? (
          <AdminModalAlert type="info">
            Trạng thái hiện tại không cho phép chuyển tiếp.
          </AdminModalAlert>
        ) : (
          <AdminModalField label="Trạng thái tiếp theo" required>
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </AdminModalField>
        )}

        <AdminModalField
          label="Ghi chú xử lý"
          required
          hint="Bắt buộc khi chuyển sang Đã xử lý / Bỏ qua."
        >
          <textarea
            rows={4}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError("");
            }}
            placeholder="Nhập biên bản, quyết định..."
          />
        </AdminModalField>
      </AdminModalSection>

      {footer}
    </form>
  );
}
