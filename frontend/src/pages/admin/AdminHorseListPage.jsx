/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, CheckCircle2, XCircle, Eye } from "lucide-react";
import { horseService } from "../../services/horseService";
import { formatDate, mapStatusToVietnamese } from "../../utils/formatter";
import "./AdminHorseListPage.css";

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

  // === SOCKET / REALTIME NOTE (tiếng Việt) ===
  // Khu vực dành cho realtime: polling 4s tương tự SidebarAdmin.
  // Mục đích: cập nhật số lượng ngựa PENDING và danh sách ngựa mới
  // đăng ký theo thời gian thực mà admin không cần F5 trang.
  // Sau này khi backend tích hợp socket.io, có thể thay thế bằng:
  //   socket.on('horse:created', (horse) => setHorses((prev) => [horse, ...prev]));
  //   socket.on('horse:statusChanged', (updated) => replaceHorse(updated));
  useEffect(() => {
    const interval = setInterval(() => {
      // poll ngầm nhưng không hiển thị loading để tránh nhảy UI
      horseService
        .getHorsesList(statusFilter)
        .then((list) => setHorses(Array.isArray(list) ? list : []))
        .catch(() => {});
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
    setHorses((prev) =>
      prev.map((h) => (h.horseId === updated.horseId ? updated : h))
    );
  };

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

  const handleReject = async (horse) => {
    const reason = window.prompt("Lý do từ chối (tùy chọn):", "");
    if (reason === null) return;
    setBusyId(horse.horseId);
    try {
      // horseService.rejectHorse dùng repository.updateStatus
      // truyền lý do qua payload nếu backend hỗ trợ
      const updated = await horseService.rejectHorse(horse.horseId);
      replaceHorse(updated);
      void reason; // backend hiện không lưu, giữ biến để mở rộng
    } catch (e) {
      window.alert(e.message || "Không từ chối được ngựa");
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
            Quản lý hồ sơ ngựa đua, duyệt hồ sơ mới và theo dõi phong độ.
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
                                onClick={() => handleReject(h)}
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

      {detailHorse && (
        <div
          className="ahl-modal-backdrop"
          onClick={() => setDetailHorse(null)}
        >
          <div
            className="ahl-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ahl-modal__bar" />
            <div className="ahl-modal__header">
              <div>
                <h2 className="ahl-modal__title">{detailHorse.name}</h2>
                <p className="ahl-modal__subtitle">
                  Mã ngựa: #{detailHorse.horseId}
                </p>
              </div>
              <button
                type="button"
                className="ahl-modal__close"
                onClick={() => setDetailHorse(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="ahl-modal__body">
              <DetailRow label="Giống" value={detailHorse.breed} />
              <DetailRow
                label="Tuổi"
                value={
                  detailHorse.birthYear
                    ? `${new Date().getFullYear() - detailHorse.birthYear} tuổi`
                    : "—"
                }
              />
              <DetailRow label="Màu sắc" value={detailHorse.color} />
              <DetailRow label="Giới tính" value={detailHorse.sex} />
              <DetailRow
                label="Chủ sở hữu"
                value={detailHorse.owner?.fullName}
              />
              <DetailRow
                label="Email chủ"
                value={detailHorse.owner?.email}
              />
              <DetailRow
                label="Trạng thái"
                value={
                  <span className={statusBadgeClass(detailHorse.status)}>
                    {mapStatusToVietnamese(detailHorse.status) ||
                      detailHorse.status}
                  </span>
                }
              />
              <DetailRow
                label="Lý do từ chối"
                value={detailHorse.rejectionReason}
              />
              <DetailRow
                label="Ngày duyệt"
                value={formatDate(detailHorse.approvedAt)}
              />
              <DetailRow
                label="Ngày tạo"
                value={formatDate(detailHorse.createdAt)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="ahl-detail-row">
      <span className="ahl-detail-row__label">{label}</span>
      <span className="ahl-detail-row__value">{value || "—"}</span>
    </div>
  );
}
