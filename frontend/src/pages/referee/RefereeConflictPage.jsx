/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Conflict Page
 * Route: /referee/conflicts
 *
 * Features:
 * - View conflicts list
 * - View conflict details in modal
 * - Compare submissions between referees
 * - Highlight differences
 *
 * FIXES:
 * - BUG-REF-006: ConflictComparison dùng đúng field từ mock data
 *   (mySubmission, otherSubmission, differences)
 * - Import đúng MOCK_CONFLICTS thay vì MOCK_MY_CONFLICTS (không tồn tại)
 * - A11y: aria labels, keyboard nav, screen reader announcements
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Eye,
  Hash,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  MessageSquare,
  Shield,
  X,
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import { refereeConflictService } from "../../services/refereeService";
import "./RefereeConflictPage.css";

// ============================================================
// STATUS CONFIG
// ============================================================
const STATUS_CONFIG = {
  Conflicted: { variant: "danger", label: "Xung đột" },
  UnderReview: { variant: "warn", label: "Đang xem xét" },
  Resolved: { variant: "ok", label: "Đã giải quyết" },
  Rejected: { variant: "muted", label: "Bị từ chối" },
};

// ============================================================
// CONFLICT TABLE
// ============================================================
function ConflictTable({ conflicts, onViewDetail, isLoading }) {
  const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (iso) => {
    if (!iso) return "";
    const now = new Date();
    const date = new Date(iso);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  if (isLoading) {
    return (
      <div className="conflict-table" role="table" aria-label="Bảng danh sách conflict" aria-busy="true">
        <div className="conflict-table__header" role="row">
          <span role="columnheader">ID</span>
          <span role="columnheader">Race</span>
          <span role="columnheader">Leg</span>
          <span role="columnheader">Trạng thái</span>
          <span role="columnheader">Phát hiện</span>
          <span role="columnheader">Thao tác</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="conflict-table__skeleton-row">
            <Skeleton width="60px" height="16px" />
            <Skeleton width="35%" height="16px" />
            <Skeleton width="25%" height="16px" />
            <Skeleton width="100px" height="24px" borderRadius="6px" />
            <Skeleton width="80px" height="16px" />
            <Skeleton width="80px" height="32px" borderRadius="8px" />
          </div>
        ))}
      </div>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="conflict-table" role="table" aria-label="Bảng danh sách conflict">
      <div className="conflict-table__header" role="row">
        <span role="columnheader">ID</span>
        <span role="columnheader">Race</span>
        <span role="columnheader">Leg</span>
        <span role="columnheader">Trạng thái</span>
        <span role="columnheader">Phát hiện</span>
        <span role="columnheader">Thao tác</span>
      </div>
      <tbody>
        {conflicts.map((conflict) => {
          const statusConfig = STATUS_CONFIG[conflict.status] || { variant: "muted", label: conflict.status };

          return (
            <tr
              key={conflict.id || conflict.conflictId}
              className="conflict-table__row"
              onClick={() => onViewDetail(conflict)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onViewDetail(conflict);
                }
              }}
              tabIndex={0}
              role="row"
              aria-label={`${conflict.raceName} - ${conflict.legName || `Leg ${conflict.legNumber}`} - ${statusConfig.label}`}
            >
              <td className="conflict-table__cell" role="cell">
                <span className="conflict-table__id" aria-label={`ID ${conflict.conflictId || conflict.id}`}>
                  <Hash size={12} aria-hidden="true" />
                  {conflict.conflictId || conflict.id}
                </span>
              </td>
              <td className="conflict-table__cell" role="cell">
                <div className="conflict-table__race">
                  <span className="conflict-table__race-name">
                    {conflict.raceName}
                  </span>
                </div>
              </td>
              <td className="conflict-table__cell" role="cell">
                <span className="conflict-table__leg">
                  {conflict.legName || `Leg ${conflict.legNumber}`}
                </span>
              </td>
              <td className="conflict-table__cell" role="cell">
                <span
                  className={`conflict-status-badge conflict-status-badge--${statusConfig.variant}`}
                  aria-label={`Trạng thái: ${statusConfig.label}`}
                >
                  {statusConfig.label}
                </span>
              </td>
              <td className="conflict-table__cell" role="cell">
                <div className="conflict-table__time">
                  <span className="conflict-table__time-relative">
                    {formatRelativeTime(conflict.detectedAt)}
                  </span>
                  <span className="conflict-table__time-absolute">
                    {formatDateTime(conflict.detectedAt)}
                  </span>
                </div>
              </td>
              <td className="conflict-table__cell conflict-table__cell--action" role="cell">
                <button
                  type="button"
                  className="conflict-table__btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail(conflict);
                  }}
                  aria-label={`Xem chi tiết conflict ${conflict.raceName}`}
                >
                  <Eye size={14} aria-hidden="true" />
                  Chi tiết
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </div>
  );
}

// ============================================================
// CONFLICT COMPARISON
// ============================================================
function ConflictComparison({ mySubmission, otherSubmission, differences }) {
  // BUG-REF-006: Đảm bảo hàm này nhận đúng props từ conflict object
  // và hiển thị comparison đúng giữa kết quả của tôi vs trọng tài còn lại.
  const isDifferent = (horseId) => differences?.includes(horseId);

  const getRankDisplay = (result) => {
    if (!result) return "—";
    if (result.status === "DQ") return "DQ";
    if (result.status === "DNF") return "DNF";
    if (result.status === "FINISHED" && result.rank != null) return `#${result.rank}`;
    return "—";
  };

  // Merge all unique horses from both submissions
  const allHorses = useMemo(() => {
    const horseMap = new Map();

    mySubmission?.forEach((r) => {
      horseMap.set(r.horseId, { ...r, side: "me" });
    });

    otherSubmission?.forEach((r) => {
      if (horseMap.has(r.horseId)) {
        const existing = horseMap.get(r.horseId);
        horseMap.set(r.horseId, { ...existing, otherRank: r.rank, otherStatus: r.status });
      } else {
        horseMap.set(r.horseId, { ...r, side: "other", rank: undefined, status: undefined });
      }
    });

    return Array.from(horseMap.values());
  }, [mySubmission, otherSubmission]);

  if (!mySubmission && !otherSubmission) {
    return (
      <div className="conflict-comparison conflict-comparison--empty">
        <p>Không có dữ liệu so sánh.</p>
      </div>
    );
  }

  return (
    <div className="conflict-comparison" role="region" aria-label="So sánh kết quả giữa 2 trọng tài">
      {/* Header */}
      <div className="conflict-comparison__header" role="row">
        <div className="conflict-comparison__referee conflict-comparison__referee--me" aria-hidden="true">
          <Shield size={14} />
          <span>Kết quả của tôi</span>
        </div>
        <div className="conflict-comparison__referee conflict-comparison__referee--other" aria-hidden="true">
          <Shield size={14} />
          <span>Kết quả trọng tài còn lại</span>
        </div>
      </div>

      {/* Legend */}
      <div className="conflict-comparison__legend" aria-label="Chú thích màu">
        <span className="conflict-comparison__legend-item conflict-comparison__legend-item--diff">
          <span className="conflict-comparison__legend-dot" aria-hidden="true" />
          Dòng có khác biệt
        </span>
      </div>

      {/* Table */}
      <div className="conflict-comparison__table" role="table" aria-label="Bảng so sánh kết quả">
        <div className="conflict-comparison__table-header" role="row">
          <span role="columnheader">Cổng</span>
          <span role="columnheader">Ngựa</span>
          <span role="columnheader">Kỵ sĩ</span>
          <span role="columnheader" aria-label="Hạng của tôi">Hạng (tôi)</span>
          <span role="columnheader" aria-label="Hạng trọng tài còn lại">Hạng (kia)</span>
        </div>
        {allHorses.map((horse) => {
          const hasDiff = isDifferent(horse.horseId);
          const rankMe = getRankDisplay({ rank: horse.rank, status: horse.status });
          const rankOther = getRankDisplay({ rank: horse.otherRank, status: horse.otherStatus });
          const isRankDifferent = rankMe !== rankOther;

          return (
            <div
              key={horse.horseId}
              className={`conflict-comparison__row${hasDiff || isRankDifferent ? " conflict-comparison__row--diff" : ""}`}
              role="row"
              aria-label={hasDiff || isRankDifferent ? `Khác biệt: ${horse.horseName}` : horse.horseName}
            >
              <div className="conflict-comparison__gate" role="cell" aria-label="Cổng">
                <span>{horse.gateNumber}</span>
              </div>
              <span className="conflict-comparison__horse" role="cell">{horse.horseName || "Ngựa"}</span>
              <span className="conflict-comparison__jockey" role="cell">{horse.jockeyName || "—"}</span>
              <span
                className={`conflict-comparison__rank conflict-comparison__rank--me${isRankDifferent ? " conflict-comparison__rank--diff" : ""}`}
                role="cell"
                aria-label={`Hạng của tôi: ${rankMe}`}
              >
                {rankMe}
              </span>
              <span
                className={`conflict-comparison__rank conflict-comparison__rank--other${isRankDifferent ? " conflict-comparison__rank--diff" : ""}`}
                role="cell"
                aria-label={`Hạng trọng tài còn lại: ${rankOther}`}
              >
                {rankOther}
              </span>
            </div>
          );
        })}
      </div>

      {/* Differences Summary */}
      {differences && differences.length > 0 && (
        <div className="conflict-comparison__summary" role="status" aria-live="polite">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            Có <strong>{differences.length}</strong> ngựa có kết quả khác nhau giữa 2 trọng tài.
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CONFLICT DETAIL MODAL
// ============================================================
function ConflictDetailModal({ isOpen, onClose, conflict }) {
  const closeRef = useRef(null);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeRef.current) {
      closeRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !conflict) return null;

  const statusConfig = STATUS_CONFIG[conflict.status] || { variant: "muted", label: conflict.status };

  const renderStatusIcon = (status) => {
    switch (status) {
      case "Resolved": return <CheckCircle2 size={20} aria-hidden="true" />;
      case "Rejected": return <XCircle size={20} aria-hidden="true" />;
      case "UnderReview": return <RefreshCcw size={20} aria-hidden="true" />;
      default: return <AlertTriangle size={20} aria-hidden="true" />;
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      aria-describedby="conflict-modal-desc"
    >
      <div className="modal-content conflict-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-header__label">Chi tiết Conflict</span>
            <h3 id="conflict-modal-title">
              {conflict.raceName} — {conflict.legName || `Leg ${conflict.legNumber}`}
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng chi tiết conflict"
          >
            <X size={20} />
          </button>
        </div>

        <div id="conflict-modal-desc" className="conflict-detail-modal__body">
          {/* Status Banner */}
          <div
            className={`conflict-detail-status conflict-detail-status--${statusConfig.variant}`}
            role="status"
            aria-live="polite"
          >
            <div className="conflict-detail-status__icon">
              {renderStatusIcon(conflict.status)}
            </div>
            <div className="conflict-detail-status__content">
              <span className="conflict-detail-status__title">{statusConfig.label}</span>
              <span className="conflict-detail-status__subtitle">
                Phát hiện lúc: {new Date(conflict.detectedAt).toLocaleString("vi-VN")}
              </span>
            </div>
          </div>

          {/* Conflict Info */}
          <div className="conflict-detail-info" role="list">
            <div className="conflict-detail-info__item" role="listitem">
              <span className="conflict-detail-info__label">Conflict ID</span>
              <span className="conflict-detail-info__value">
                <Hash size={14} aria-hidden="true" />
                {conflict.conflictId || conflict.id}
              </span>
            </div>
            <div className="conflict-detail-info__item" role="listitem">
              <span className="conflict-detail-info__label">Leg</span>
              <span className="conflict-detail-info__value">
                {conflict.legName || `Leg ${conflict.legNumber}`}
              </span>
            </div>
          </div>

          {/* Comparison — BUG-REF-006: dùng đúng field names */}
          <ConflictComparison
            mySubmission={conflict.mySubmission}
            otherSubmission={conflict.otherSubmission}
            differences={conflict.differences}
          />

          {/* System Note */}
          {conflict.systemNote && (
            <div className="conflict-detail-note conflict-detail-note--system" role="note">
              <div className="conflict-detail-note__header">
                <AlertTriangle size={14} aria-hidden="true" />
                <span>Ghi chú hệ thống</span>
              </div>
              <p className="conflict-detail-note__content">{conflict.systemNote}</p>
            </div>
          )}

          {/* Admin Note */}
          {conflict.adminNote && (
            <div className="conflict-detail-note conflict-detail-note--admin" role="note">
              <div className="conflict-detail-note__header">
                <MessageSquare size={14} aria-hidden="true" />
                <span>Ghi chú admin</span>
              </div>
              <p className="conflict-detail-note__content">{conflict.adminNote}</p>
            </div>
          )}

          {/* Admin Resolution (if resolved) */}
          {conflict.adminResolution && (
            <div className="conflict-detail-resolution" role="region" aria-label="Quyết định cuối cùng">
              <div className="conflict-detail-resolution__header">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Quyết định cuối cùng</span>
              </div>
              <p className="conflict-detail-resolution__content">
                {conflict.adminResolution}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="modal-btn modal-btn--cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState() {
  return (
    <div className="conflict-empty">
      <CheckCircle2 size={48} />
      <h3>Không có conflict nào</h3>
      <p>Tất cả kết quả của bạn đã khớp với trọng tài còn lại hoặc chưa được xử lý.</p>
    </div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================
function ErrorState({ message, onRetry }) {
  return (
    <div className="conflict-error">
      <AlertTriangle size={48} />
      <h3>Đã xảy ra lỗi</h3>
      <p>{message || "Không thể tải danh sách conflict."}</p>
      <button type="button" className="conflict-btn conflict-btn--primary" onClick={onRetry}>
        <RefreshCcw size={14} /> Thử lại
      </button>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RefereeConflictPage() {
  const navigate = useNavigate();

  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedConflict, setSelectedConflict] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Manual retry handler
  const loadConflicts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refereeConflictService.getConflicts();
      setConflicts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách conflict.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch conflicts on mount with cancellation guard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await refereeConflictService.getConflicts();
        if (!cancelled) setConflicts(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không thể tải danh sách conflict.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle view detail
  const handleViewDetail = (conflict) => {
    setSelectedConflict(conflict);
    setShowDetailModal(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedConflict(null);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: conflicts.length,
      conflicted: conflicts.filter((c) => c.status === "Conflicted").length,
      underReview: conflicts.filter((c) => c.status === "UnderReview").length,
      resolved: conflicts.filter((c) => c.status === "Resolved").length,
      rejected: conflicts.filter((c) => c.status === "Rejected").length,
    };
  }, [conflicts]);

  // Loading state
  if (loading) {
    return (
      <div className="conflict-page">
        <div className="conflict-page__inner">
          <button
            type="button"
            className="conflict-btn conflict-btn--back"
            onClick={() => navigate("/referee")}
          >
            <ArrowLeft size={16} /> Quay lại Dashboard
          </button>

          <header className="conflict-page__header">
            <div>
              <p className="conflict-page__eyebrow">Referee</p>
              <h1 className="conflict-page__title">Quản lý Conflict</h1>
              <p className="conflict-page__subtitle">
                Xem và theo dõi các xung đột kết quả giữa bạn và trọng tài còn lại.
              </p>
            </div>
          </header>

          <ConflictTable conflicts={[]} onViewDetail={() => {}} isLoading={true} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="conflict-page">
        <div className="conflict-page__inner">
          <button
            type="button"
            className="conflict-btn conflict-btn--back"
            onClick={() => navigate("/referee")}
          >
            <ArrowLeft size={16} /> Quay lại Dashboard
          </button>
          <ErrorState message={error} onRetry={loadConflicts} />
        </div>
      </div>
    );
  }

  return (
    <div className="conflict-page">
      <div className="conflict-page__inner">
        {/* Back Button */}
        <button
          type="button"
          className="conflict-btn conflict-btn--back"
          onClick={() => navigate("/referee")}
        >
          <ArrowLeft size={16} /> Quay lại Dashboard
        </button>

        {/* Page Header */}
        <header className="conflict-page__header">
          <div>
            <p className="conflict-page__eyebrow">Referee</p>
            <h1 className="conflict-page__title">Quản lý Conflict</h1>
            <p className="conflict-page__subtitle">
              Xem và theo dõi các xung đột kết quả giữa bạn và trọng tài còn lại.
            </p>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="conflict-page__stats">
          <div className="conflict-stat-card">
            <span className="conflict-stat-card__value">{stats.total}</span>
            <span className="conflict-stat-card__label">Tổng số</span>
          </div>
          <div className="conflict-stat-card conflict-stat-card--danger">
            <span className="conflict-stat-card__value">{stats.conflicted}</span>
            <span className="conflict-stat-card__label">Xung đột</span>
          </div>
          <div className="conflict-stat-card conflict-stat-card--warn">
            <span className="conflict-stat-card__value">{stats.underReview}</span>
            <span className="conflict-stat-card__label">Đang xem xét</span>
          </div>
          <div className="conflict-stat-card conflict-stat-card--ok">
            <span className="conflict-stat-card__value">{stats.resolved}</span>
            <span className="conflict-stat-card__label">Đã giải quyết</span>
          </div>
          <div className="conflict-stat-card conflict-stat-card--muted">
            <span className="conflict-stat-card__value">{stats.rejected}</span>
            <span className="conflict-stat-card__label">Bị từ chối</span>
          </div>
        </div>

        {/* Table or Empty */}
        {conflicts.length === 0 ? (
          <EmptyState />
        ) : (
          <ConflictTable
            conflicts={conflicts}
            onViewDetail={handleViewDetail}
            isLoading={false}
          />
        )}
      </div>

      {/* Detail Modal */}
      <ConflictDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        conflict={selectedConflict}
      />
    </div>
  );
}
