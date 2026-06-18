/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, CheckCircle2, XCircle, Eye, MessageSquare } from "lucide-react";
import { raceService } from "../../services/raceService";
import { formatDate } from "../../utils/formatter";
import {
  SeverityBadge,
  StatusBadge,
} from "../../components/ui/Badges";
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal";
import "./AdminDeviationPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "REVIEWING", label: "Đang xem xét" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "REJECTED", label: "Bị bác bỏ" },
];

const SEVERITY_OPTIONS = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "LOW", label: "Thấp" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HIGH", label: "Cao" },
  { value: "CRITICAL", label: "Nghiêm trọng" },
];

// TODO: Replace mock data with real API when backend endpoint is available.
// Backend hiện chưa có route cho deviation/discrepancy.
const MOCK_DEVIATIONS = [
  {
    id: "DEV-001",
    type: "Kết quả vạch đích",
    raceId: 12,
    raceName: "Chung kết Belmont Stakes",
    reporter: "Camera Tower A",
    description: "Thứ tự về đích vị trí 2 và 3 bị mờ, hai tháp camera ghi nhận khác nhau.",
    severity: "HIGH",
    status: "PENDING",
    createdAt: "2026-06-15T08:32:00Z",
  },
  {
    id: "DEV-002",
    type: "Thời gian chặng",
    raceId: 11,
    raceName: "Vòng loại Kentucky Derby",
    reporter: "Hệ thống TimingChip",
    description: "Chip thời gian ngựa số 4 báo trễ 0.3s so với camera tự động.",
    severity: "MEDIUM",
    status: "REVIEWING",
    createdAt: "2026-06-14T15:18:00Z",
  },
  {
    id: "DEV-003",
    type: "Trọng tài xung đột",
    raceId: 10,
    raceName: "Preakness Stakes",
    reporter: "Trọng tài #4",
    description: "Hai trọng tài đưa ra phán quyết khác nhau về pha chạm rào ở lượt 5.",
    severity: "CRITICAL",
    status: "PENDING",
    createdAt: "2026-06-13T11:00:00Z",
  },
  {
    id: "DEV-004",
    type: "Điểm phạt sai",
    raceId: 9,
    raceName: "Tournament GrandStride 2026",
    reporter: "Hệ thống Score",
    description: "Tính điểm trừ 2s cho ngựa #7 nhưng hình ảnh không xác nhận lỗi.",
    severity: "LOW",
    status: "RESOLVED",
    createdAt: "2026-06-12T09:45:00Z",
  },
  {
    id: "DEV-005",
    type: "Cổng đăng ký",
    raceId: 8,
    raceName: "Arc de Triomphe",
    reporter: "Hệ thống đăng ký",
    description: "Cổng đăng ký đóng trước thời hạn 5 phút do lỗi kỹ thuật.",
    severity: "MEDIUM",
    status: "REJECTED",
    createdAt: "2026-06-11T16:20:00Z",
  },
];

function truncate(value, max = 28) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export default function AdminDeviationPage() {
  const [deviations, setDeviations] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [noteModal, setNoteModal] = useState(null);

  const loadDeviations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // TODO: Replace mock data with real API when backend endpoint is available.
      await raceService.getDiscrepancyDetails().catch(() => null);
      setDeviations(MOCK_DEVIATIONS);
    } catch (e) {
      setError(e.message || "Không tải được danh sách sai lệch");
      setDeviations(MOCK_DEVIATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeviations();
  }, [loadDeviations]);

  // === SOCKET / REALTIME NOTE (tiếng Việt) ===
  // Khu vực dành cho realtime: cập nhật sai lệch mới từ hệ thống.
  // Khi backend tích hợp socket.io, có thể:
  //   socket.on('deviation:created', (dev) => setDeviations((prev) => [dev, ...prev]));
  //   socket.on('deviation:statusChanged', (dev) => replaceDeviation(dev));

  const filtered = useMemo(() => {
    let list = deviations;
    if (statusFilter !== "ALL") {
      list = list.filter((d) => d.status === statusFilter);
    }
    if (severityFilter !== "ALL") {
      list = list.filter((d) => d.severity === severityFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          (d.raceName ?? "").toLowerCase().includes(q) ||
          (d.reporter ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [deviations, statusFilter, severityFilter, search]);

  const stats = useMemo(() => {
    return {
      total: deviations.length,
      pending: deviations.filter((d) => d.status === "PENDING").length,
      critical: deviations.filter((d) => d.severity === "CRITICAL").length,
      resolved: deviations.filter((d) => d.status === "RESOLVED").length,
    };
  }, [deviations]);

  const replaceDeviation = (updated) => {
    setDeviations((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleResolve = (dev) => setNoteModal({ dev, nextStatus: "RESOLVED" });
  const handleReject = (dev) => setNoteModal({ dev, nextStatus: "REJECTED" });

  const handleStartReview = (dev) => {
    // TODO: Replace mock update with real API when available
    replaceDeviation({ ...dev, status: "REVIEWING" });
  };

  const submitNote = (note) => {
    if (!noteModal) return;
    const { dev, nextStatus } = noteModal;
    // TODO: Replace mock update with real API when available
    replaceDeviation({ ...dev, status: nextStatus, resolutionNote: note });
    setNoteModal(null);
  };

  return (
    <div className="adv-page">
      <header className="adv-page__header">
        <div>
          <h1 className="adv-page__title">Xử lý sai lệch</h1>
          <p className="adv-page__desc">
            Theo dõi và phân xử các sai lệch phát sinh trong quá trình tổ chức giải.
          </p>
        </div>
      </header>

      <div className="adv-stats">
        <div className="adv-stat">
          <div className="adv-stat__label">Tổng sai lệch</div>
          <div className="adv-stat__value">{stats.total}</div>
        </div>
        <div className="adv-stat">
          <div className="adv-stat__label">Chờ xử lý</div>
          <div className="adv-stat__value adv-stat__value--warn">{stats.pending}</div>
        </div>
        <div className="adv-stat">
          <div className="adv-stat__label">Nghiêm trọng</div>
          <div className="adv-stat__value adv-stat__value--err">{stats.critical}</div>
        </div>
        <div className="adv-stat">
          <div className="adv-stat__label">Đã xử lý</div>
          <div className="adv-stat__value adv-stat__value--ok">{stats.resolved}</div>
        </div>
      </div>

      <div className="adv-toolbar">
        <div className="adv-search-wrap">
          <Search className="adv-search-icon" size={14} />
          <input
            className="adv-search"
            type="search"
            placeholder="Tìm theo mã, loại, chặng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="adv-select"
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
          className="adv-select"
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
          className="adv-btn adv-btn--ghost"
          onClick={loadDeviations}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && !loading && <div className="adv-alert--error">{error}</div>}

      {/* TODO: Backend chưa có API, dùng mock data tạm thời */}
      <div className="adv-mock-banner">
        ⚠️ Dữ liệu đang hiển thị từ mock. Backend chưa cung cấp API cho sai lệch.
      </div>

      <div className="adv-panel">
        {loading ? (
          <div className="adv-loading">
            <div className="adv-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="adv-empty">Không có sai lệch nào phù hợp bộ lọc.</div>
        ) : (
          <div className="adv-table-wrap">
            <table className="adv-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Loại</th>
                  <th>Chặng</th>
                  <th>Mức độ</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const isBusy = busyId === d.id;
                  return (
                    <tr key={d.id}>
                      <td>
                        <span className="adv-code">{d.id}</span>
                      </td>
                      <td>
                        <div className="adv-name" title={d.type}>
                          {truncate(d.type, 26)}
                        </div>
                      </td>
                      <td>
                        <div className="adv-name" title={d.raceName}>
                          {truncate(d.raceName, 22)}
                        </div>
                        <div className="adv-meta">Chặng #{d.raceId}</div>
                      </td>
                      <td>
                        <SeverityBadge severity={d.severity} />
                      </td>
                      <td>
                        <StatusBadge status={d.status} />
                      </td>
                      <td>{formatDate(d.createdAt)}</td>
                      <td>
                        <div className="adv-actions">
                          <button
                            type="button"
                            className="adv-icon-btn"
                            title="Xem chi tiết"
                            onClick={() => setDetail(d)}
                          >
                            <Eye size={14} />
                          </button>
                          {d.status === "PENDING" && (
                            <button
                              type="button"
                              className="adv-icon-btn adv-icon-btn--info"
                              title="Bắt đầu xem xét"
                              disabled={isBusy}
                              onClick={() => handleStartReview(d)}
                            >
                              <MessageSquare size={14} />
                            </button>
                          )}
                          {(d.status === "PENDING" || d.status === "REVIEWING") && (
                            <>
                              <button
                                type="button"
                                className="adv-icon-btn adv-icon-btn--ok"
                                title="Xử lý xong"
                                disabled={isBusy}
                                onClick={() => handleResolve(d)}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="adv-icon-btn adv-icon-btn--err"
                                title="Bác bỏ"
                                disabled={isBusy}
                                onClick={() => handleReject(d)}
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal — hiển thị đầy đủ thông tin đã ẩn trên bảng */}
      {detail && (
        <AdminModal
          size="lg"
          accent="info"
          title={`Sai lệch ${detail.id}`}
          subtitle={detail.type}
          onClose={() => setDetail(null)}
        >
          <AdminModalSection title="Tổng quan" description="Thông tin mô tả sai lệch.">
            <AdminModalField label="Mô tả đầy đủ">
              <div className="adv-modal-text">{detail.description}</div>
            </AdminModalField>
          </AdminModalSection>

          <AdminModalSection
            title="Phân loại"
            description="Mức độ nghiêm trọng và trạng thái xử lý hiện tại."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Mức độ">
                <SeverityBadge severity={detail.severity} />
              </AdminModalField>
              <AdminModalField label="Trạng thái">
                <StatusBadge status={detail.status} />
              </AdminModalField>
              <AdminModalField label="Mã sai lệch">
                <div className="adv-modal-mono">{detail.id}</div>
              </AdminModalField>
              <AdminModalField label="Ngày tạo">
                <div>{formatDate(detail.createdAt)}</div>
              </AdminModalField>
            </div>
          </AdminModalSection>

          <AdminModalSection
            title="Chặng liên quan"
            description="Thông tin chặng đua phát sinh sai lệch."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Tên chặng">
                <div>{detail.raceName}</div>
              </AdminModalField>
              <AdminModalField label="Mã chặng">
                <div className="adv-modal-mono">#{detail.raceId}</div>
              </AdminModalField>
              <AdminModalField label="Người báo cáo">
                <div>{detail.reporter || "—"}</div>
              </AdminModalField>
            </div>
          </AdminModalSection>

          {detail.resolutionNote && (
            <AdminModalSection
              title="Lịch sử xử lý"
              description="Ghi chú do trọng tài / quản trị viên đã ghi nhận."
            >
              <div className="adv-modal-text">{detail.resolutionNote}</div>
            </AdminModalSection>
          )}
        </AdminModal>
      )}

      {/* Note form modal */}
      {noteModal && (
        <AdminModal
          size="sm"
          accent={noteModal.nextStatus === "RESOLVED" ? "primary" : "danger"}
          title={
            noteModal.nextStatus === "RESOLVED"
              ? "Xác nhận xử lý sai lệch"
              : "Bác bỏ sai lệch"
          }
          subtitle={`Mã: ${noteModal.dev.id} — ${noteModal.dev.type}`}
          onClose={() => setNoteModal(null)}
        >
          <NoteForm
            nextStatus={noteModal.nextStatus}
            onCancel={() => setNoteModal(null)}
            onSubmit={submitNote}
          />
        </AdminModal>
      )}
    </div>
  );
}

function NoteForm({ nextStatus, onCancel, onSubmit }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nextStatus === "REJECTED" && !note.trim()) {
      setError("Cần nhập lý do bác bỏ.");
      return;
    }
    onSubmit(note.trim());
  };

  const footer = (
    <>
      <button type="button" className="adv-btn adv-btn--ghost" onClick={onCancel}>
        Hủy
      </button>
      <button
        type="submit"
        form="adv-note-form"
        className={`adv-btn ${nextStatus === "RESOLVED" ? "adv-btn--ok" : "adv-btn--danger"}`}
      >
        {nextStatus === "RESOLVED" ? "Xác nhận xử lý" : "Bác bỏ"}
      </button>
    </>
  );

  return (
    <form id="adv-note-form" onSubmit={handleSubmit}>
      {error && <AdminModalAlert type="error">{error}</AdminModalAlert>}

      <AdminModalSection
        title="Ghi chú xử lý"
        description={
          nextStatus === "REJECTED"
            ? "Vui lòng nêu rõ lý do bác bỏ để lưu vết kiểm toán."
            : "Có thể nhập ghi chú để làm rõ cách xử lý."
        }
      >
        <AdminModalField label="Ghi chú" required={nextStatus === "REJECTED"}>
          <textarea
            rows={4}
            required={nextStatus === "REJECTED"}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError("");
            }}
            placeholder="Nhập ghi chú..."
          />
        </AdminModalField>
      </AdminModalSection>

      {footer}
    </form>
  );
}
