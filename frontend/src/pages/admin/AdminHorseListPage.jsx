/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdminHorseListPage — Flow 1 (Horse Registration & Approval)
 *
 * Endpoint (theo mainflow.md):
 * - GET  /api/admin/horses?status=ALL|PENDING|APPROVED|REJECTED|INACTIVE
 * - POST /api/admin/horses/:id/review   { status: APPROVED|REJECTED, reason? }
 * - POST /api/admin/horses/:id/revoke   { reason: '...' }
 *
 * Cột thao tác theo status:
 * - PENDING  → [Duyệt] [Từ chối]
 * - APPROVED → [Thu hồi]
 * - các status khác → chỉ xem chi tiết
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldOff,
} from "lucide-react";
import { horseService } from "../../services/horseService";
import { formatDate, mapStatusToVietnamese } from "../../utils/formatter";
import HorseActionModal from "../../components/admin/horse/HorseActionModal";
import "./AdminHorseListPage.css";

// Backend hiện KHÔNG hỗ trợ status='INACTIVE' ở PATCH /api/admin/horses/:id/status
// (chỉ chấp nhận APPROVED/REJECTED). Đặt REVOKE_DISABLED = true để ẩn hoàn toàn nút Thu hồi.
// Khi backend bổ sung POST /api/admin/horses/:id/revoke → đổi thành false.
const REVOKE_DISABLED = true;

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "APPROVED":
      return "ahl-badge ahl-badge--approved";
    case "PENDING":
      return "ahl-badge ahl-badge--pending";
    case "REJECTED":
      return "ahl-badge ahl-badge--rejected";
    case "INACTIVE":
      return "ahl-badge ahl-badge--inactive";
    default:
      return "ahl-badge";
  }
}

export default function AdminHorseListPage() {
  const [horses, setHorses] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [detailHorse, setDetailHorse] = useState(null);

  // Modal state: loại action đang mở
  // { mode: 'reject' | 'revoke', horse }
  const [actionModal, setActionModal] = useState(null);
  const [actionError, setActionError] = useState("");

  const loadHorses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await horseService.getHorsesList(statusFilter);
      setHorses(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Không tải được danh sách ngựa");
      setHorses([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadHorses();
  }, [loadHorses]);

  // Polling nhẹ 8s — placeholder cho Socket.IO sau này
  useEffect(() => {
    const interval = setInterval(() => {
      horseService
        .getHorsesList(statusFilter)
        .then((list) => setHorses(Array.isArray(list) ? list : []))
        .catch((e) => {
          // Surface lỗi nhẹ trên thanh thông báo — tránh nuốt lỗi
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[AdminHorseListPage] polling error:", e);
          }
          setError((prev) =>
            prev ? prev : `Không thể đồng bộ danh sách: ${e?.message || "lỗi mạng"}`
          );
        });
    }, 8000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return horses;
    return horses.filter((h) => {
      return (
        String(h.horseId ?? "").includes(q) ||
        (h.name ?? "").toLowerCase().includes(q) ||
        (h.breed ?? "").toLowerCase().includes(q) ||
        (h.owner?.fullName ?? "").toLowerCase().includes(q)
      );
    });
  }, [horses, search]);

  const stats = useMemo(() => {
    return {
      total: horses.length,
      pending: horses.filter((h) => h.status === "PENDING").length,
      approved: horses.filter((h) => h.status === "APPROVED").length,
      rejected: horses.filter((h) => h.status === "REJECTED").length,
    };
  }, [horses]);

  const replaceHorse = (updated) => {
    if (!updated || updated.horseId == null) return;
    setHorses((prev) =>
      prev.map((h) => (h.horseId === updated.horseId ? updated : h))
    );
  };


  // === ACTIONS ===
  const handleApprove = async (horse) => {
    const ok = window.confirm(
      `Duyệt hồ sơ ngựa #${horse.horseId} (${horse.name})?`
    );
    if (!ok) return;
    setBusyId(horse.horseId);
    try {
      const updated = await horseService.approveHorse(horse.horseId);
      replaceHorse(updated);
    } catch (e) {
      window.alert(e.message || "Không duyệt được ngựa");
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (horse) => {
    setActionError("");
    setActionModal({ mode: "reject", horse });
  };

  const openRevoke = (horse) => {
    setActionError("");
    setActionModal({ mode: "revoke", horse });
  };

  const closeActionModal = () => {
    if (busyId) return;
    setActionModal(null);
    setActionError("");
  };

  const handleConfirmAction = async ({ reason }) => {
    if (!actionModal) return;
    const { mode, horse } = actionModal;
    setActionError("");
    setBusyId(horse.horseId);
    try {
      if (mode === "reject") {
        const updated = await horseService.rejectHorse(horse.horseId, reason);
        replaceHorse(updated);
      } else if (mode === "revoke") {
        await horseService.revokeHorse(horse.horseId, reason);
        // Sau revoke, ngựa chuyển INACTIVE — reload list theo filter hiện tại
        await loadHorses();
      }
      setActionModal(null);
    } catch (e) {
      setActionError(e.message || "Thao tác thất bại");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ahl-page">
      <header className="ahl-page__header">
        <div>
          <h1 className="ahl-page__title">Danh sách ngựa</h1>
          <p className="ahl-page__desc">
            Quản lý hồ sơ ngựa đua, duyệt hồ sơ mới và thu hồi ngựa đã cấp phép.
          </p>
        </div>
      </header>

      <div className="ahl-stats">
        <div className="ahl-stat">
          <div className="ahl-stat__label">Tổng ngựa</div>
          <div className="ahl-stat__value">{stats.total}</div>
        </div>
        <div className="ahl-stat">
          <div className="ahl-stat__label">Chờ duyệt</div>
          <div className="ahl-stat__value ahl-stat__value--warn">
            {stats.pending}
          </div>
        </div>
        <div className="ahl-stat">
          <div className="ahl-stat__label">Đã duyệt</div>
          <div className="ahl-stat__value ahl-stat__value--ok">
            {stats.approved}
          </div>
        </div>
        <div className="ahl-stat">
          <div className="ahl-stat__label">Bị từ chối</div>
          <div className="ahl-stat__value ahl-stat__value--err">
            {stats.rejected}
          </div>
        </div>
      </div>

      <div className="ahl-toolbar">
        <div className="ahl-search-wrap">
          <Search className="ahl-search-icon" size={14} />
          <input
            className="ahl-search"
            type="search"
            placeholder="Tìm theo tên ngựa, giống, chủ sở hữu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="ahl-select"
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
          className="ahl-btn ahl-btn--ghost"
          onClick={loadHorses}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && !loading && (
        <div className="ahl-alert--error">{error}</div>
      )}

      <div className="ahl-panel">
        {loading ? (
          <div className="ahl-loading">
            <div className="ahl-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="ahl-empty">Không có ngựa nào phù hợp bộ lọc.</div>
        ) : (
          <div className="ahl-table-wrap">
            <table className="ahl-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ngựa</th>
                  <th>Giống</th>
                  <th>Tuổi</th>
                  <th>Chủ sở hữu</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => {
                  const isBusy = busyId === h.horseId;
                  const year =
                    h.birthYear ||
                    (h.dateOfBirth
                      ? new Date(h.dateOfBirth).getFullYear()
                      : null);
                  const age = year ? new Date().getFullYear() - year : "—";
                  return (
                    <tr key={h.horseId}>
                      <td>#{h.horseId}</td>
                      <td>
                        <div className="ahl-name">{h.name}</div>
                        {h.color && (
                          <div className="ahl-meta">Màu: {h.color}</div>
                        )}
                      </td>
                      <td>{h.breed || "—"}</td>
                      <td>{age}</td>
                      <td>
                        <div>{h.owner?.fullName || "—"}</div>
                        {h.owner?.email && (
                          <div className="ahl-meta">{h.owner.email}</div>
                        )}
                      </td>
                      <td>
                        <span className={statusBadgeClass(h.status)}>
                          {mapStatusToVietnamese(h.status) || h.status}
                        </span>
                      </td>
                      <td>{formatDate(h.createdAt)}</td>
                      <td>
                        <div className="ahl-actions">
                          <button
                            type="button"
                            className="ahl-icon-btn"
                            title="Xem chi tiết"
                            onClick={() => setDetailHorse(h)}
                          >
                            <Eye size={14} />
                          </button>

                          {h.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                className="ahl-icon-btn ahl-icon-btn--ok"
                                title="Duyệt"
                                disabled={isBusy}
                                onClick={() => handleApprove(h)}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="ahl-icon-btn ahl-icon-btn--err"
                                title="Từ chối"
                                disabled={isBusy}
                                onClick={() => openReject(h)}
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}

                          {/*
                           * Nút "Thu hồi" tạm ẩn hoàn toàn khi REVOKE_DISABLED=true.
                           * Trước đây vẫn render nút có title cảnh báo "backend chưa hỗ trợ"
                           * — gây hiểu nhầm UX (user bấm xong mới biết lỗi). Giờ chỉ hiển thị
                           * khi backend đã sẵn sàng.
                           */}
                          {h.status === "APPROVED" && !REVOKE_DISABLED && (
                            <button
                              type="button"
                              className="ahl-icon-btn ahl-icon-btn--warn"
                              title="Thu hồi ngựa (INACTIVE)"
                              disabled={isBusy}
                              onClick={() => openRevoke(h)}
                            >
                              <ShieldOff size={14} />
                            </button>
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

      {detailHorse && (
        <DetailModal horse={detailHorse} onClose={() => setDetailHorse(null)} />
      )}

      {actionModal ? (
        <HorseActionModal
          mode={actionModal.mode}
          horse={actionModal.horse}
          busy={busyId === actionModal.horse.horseId}
          error={actionError}
          onClose={closeActionModal}
          onConfirm={handleConfirmAction}
        />
      ) : null}
    </div>
  );
}

function DetailModal({ horse, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    const handleCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="ahl-dialog"
      aria-labelledby="ahl-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="ahl-modal__bar" />
      <header className="ahl-modal__header">
        <div>
          <h2 id="ahl-modal-title" className="ahl-modal__title">
            {horse?.name}
          </h2>
          <p className="ahl-modal__subtitle">
            Mã ngựa: #{horse?.horseId}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="ahl-modal__close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ✕
        </button>
      </header>
      <div className="ahl-modal__body">
        <DetailRow label="Giống" value={horse?.breed} />
        <DetailRow label="Màu lông" value={horse?.color} />
        <DetailRow label="Giới tính" value={horse?.sex} />
        <DetailRow
          label="Ngày sinh"
          value={
            horse?.dateOfBirth
              ? new Date(horse.dateOfBirth).toLocaleDateString("vi-VN")
              : "—"
          }
        />
        <DetailRow
          label="Trạng thái"
          value={
            <span className={statusBadgeClass(horse?.status)}>
              {mapStatusToVietnamese(horse?.status) || horse?.status}
            </span>
          }
        />
        {horse?.rejectionReason ? (
          <DetailRow label="Lý do từ chối" value={horse.rejectionReason} />
        ) : null}
        {horse?.revokeReason ? (
          <DetailRow label="Lý do thu hồi" value={horse.revokeReason} />
        ) : null}
        <DetailRow
          label="Chủ sở hữu"
          value={
            horse?.owner
              ? `${horse.owner.fullName || "—"}${
                  horse.owner.email ? ` (${horse.owner.email})` : ""
                }`
              : "—"
          }
        />
        <DetailRow label="Ngày tạo" value={formatDate(horse?.createdAt)} />
        {horse?.approvedAt ? (
          <DetailRow label="Ngày duyệt" value={formatDate(horse.approvedAt)} />
        ) : null}
      </div>
      <footer className="ahl-modal__footer">
        <button
          type="button"
          className="ahl-btn ahl-btn--primary"
          onClick={onClose}
        >
          Đóng
        </button>
      </footer>
    </dialog>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="ahl-modal__row">
      <div className="ahl-modal__row-label">{label}</div>
      <div className="ahl-modal__row-value">{value ?? "—"}</div>
    </div>
  );
}