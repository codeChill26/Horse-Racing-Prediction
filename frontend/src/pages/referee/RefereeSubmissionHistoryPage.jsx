/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Submission History Page
 * Route: /referee/submissions
 *
 * Features:
 * - View submission history
 * - Filter by status (Waiting, Matched, Conflict)
 * - Search
 * - View submission detail in modal
 *
 * FIXES:
 * - BUG-REF-004: dùng refereeSubmissionService.getMySubmissions()
 * - A11y: aria labels, keyboard nav
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  X,
  Eye,
  FileText,
  Hash,
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import { refereeSubmissionService } from "../../services/refereeService";
import "./RefereeSubmissionHistoryPage.css";

// ============================================================
// STATUS CONFIG
// ============================================================
const STATUS_CONFIG = {
  WaitingOtherReferee: { variant: "info", label: "Chờ trọng tài còn lại" },
  Conflicted: { variant: "danger", label: "Xung đột" },
  AutoMatched: { variant: "ok", label: "Khớp tự động" },
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "Waiting", label: "Chờ xác nhận" },
  { value: "Matched", label: "Đã khớp" },
  { value: "Conflict", label: "Xung đột" },
];

// ============================================================
// SUBMISSION FILTER
// ============================================================
function SubmissionFilter({ value, onChange }) {
  return (
    <div className="submission-filter">
      <Filter size={16} />
      <select
        className="submission-filter__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// SEARCH INPUT
// ============================================================
function SearchInput({ value, onChange, onClear }) {
  return (
    <div className="submission-search">
      <Search size={16} className="submission-search__icon" />
      <input
        type="text"
        className="submission-search__input"
        placeholder="Tìm kiếm race, leg..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="submission-search__clear"
          onClick={onClear}
          aria-label="Xóa tìm kiếm"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// SUBMISSION TABLE
// ============================================================
function SubmissionTable({ submissions, onViewDetail, isLoading }) {
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
      <div className="submission-table" role="table" aria-label="Bảng lịch sử submission" aria-busy="true">
        <div className="submission-table__header" role="row">
          <span role="columnheader">Race</span>
          <span role="columnheader">Leg</span>
          <span role="columnheader">Thời gian</span>
          <span role="columnheader">Trạng thái</span>
          <span role="columnheader">Thao tác</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="submission-table__skeleton-row">
            <Skeleton width="35%" height="16px" />
            <Skeleton width="25%" height="16px" />
            <Skeleton width="25%" height="16px" />
            <Skeleton width="100px" height="24px" borderRadius="6px" />
            <Skeleton width="80px" height="32px" borderRadius="8px" />
          </div>
        ))}
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return null;
  }

  return (
    <div className="submission-table" role="table" aria-label="Bảng lịch sử submission">
      <div className="submission-table__header" role="row">
        <span role="columnheader">Race</span>
        <span role="columnheader">Leg</span>
        <span role="columnheader">Thời gian</span>
        <span role="columnheader">Trạng thái</span>
        <span role="columnheader">Thao tác</span>
      </div>
      <tbody>
        {submissions.map((submission) => {
          const statusConfig = STATUS_CONFIG[submission.comparisonStatus] || {
            variant: "muted",
            label: submission.comparisonStatus || "—",
          };

          return (
            <tr
              key={submission.id || submission.submissionId}
              className="submission-table__row"
              onClick={() => onViewDetail(submission)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onViewDetail(submission);
                }
              }}
              tabIndex={0}
              role="row"
              aria-label={`${submission.raceName} - ${submission.legName || `Leg ${submission.legNumber}`} - ${statusConfig.label}`}
            >
              <td className="submission-table__cell" role="cell">
                <div className="submission-table__race">
                  <span className="submission-table__race-id">
                    <Hash size={12} aria-hidden="true" />
                    {submission.raceId}
                  </span>
                  <span className="submission-table__race-name">
                    {submission.raceName}
                  </span>
                </div>
              </td>
              <td className="submission-table__cell" role="cell">
                <span className="submission-table__leg">
                  {submission.legName || `Leg ${submission.legNumber}`}
                </span>
              </td>
              <td className="submission-table__cell" role="cell">
                <div className="submission-table__time">
                  <span className="submission-table__time-relative">
                    {formatRelativeTime(submission.submittedAt)}
                  </span>
                  <span className="submission-table__time-absolute">
                    {formatDateTime(submission.submittedAt)}
                  </span>
                </div>
              </td>
              <td className="submission-table__cell" role="cell">
                <span
                  className={`submission-status-badge submission-status-badge--${statusConfig.variant}`}
                  aria-label={`Trạng thái: ${statusConfig.label}`}
                >
                  {statusConfig.label}
                </span>
              </td>
              <td className="submission-table__cell submission-table__cell--action" role="cell">
                <button
                  type="button"
                  className="submission-table__btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail(submission);
                  }}
                  aria-label={`Xem chi tiết submission ${submission.raceName}`}
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
// SUBMISSION DETAIL MODAL
// ============================================================
function SubmissionDetailModal({ isOpen, onClose, submission }) {
  if (!isOpen || !submission) return null;

  const statusConfig = STATUS_CONFIG[submission.comparisonStatus] || {
    variant: "muted",
    label: submission.comparisonStatus || "—",
  };

  const renderStatusIcon = (status) => {
    switch (status) {
      case "AutoMatched":
        return <CheckCircle2 size={20} aria-hidden="true" />;
      case "Conflicted":
        return <AlertTriangle size={20} aria-hidden="true" />;
      default:
        return <Clock size={20} aria-hidden="true" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content submission-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-header__label">Chi tiết Submission</span>
            <h3>{submission.raceName}</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="submission-detail-modal__body">
          {/* Status Banner */}
          <div className={`submission-detail-status submission-detail-status--${statusConfig.variant}`}>
            <div className="submission-detail-status__icon">
              {renderStatusIcon(submission.comparisonStatus)}
            </div>
            <div className="submission-detail-status__content">
              <span className="submission-detail-status__title">{statusConfig.label}</span>
              <span className="submission-detail-status__subtitle">
                {submission.comparisonStatus === "WaitingOtherReferee" &&
                  "Trọng tài còn lại chưa submit kết quả."}
                {submission.comparisonStatus === "AutoMatched" &&
                  "Kết quả khớp với trọng tài còn lại."}
                {submission.comparisonStatus === "Conflicted" &&
                  "Có xung đột kết quả giữa 2 trọng tài."}
              </span>
            </div>
          </div>

          {/* Submission Info */}
          <div className="submission-detail-info">
            <div className="submission-detail-info__item">
              <span className="submission-detail-info__label">Leg</span>
              <span className="submission-detail-info__value">
                {submission.legName || `Leg ${submission.legNumber}`}
              </span>
            </div>
            <div className="submission-detail-info__item">
              <span className="submission-detail-info__label">Thời gian</span>
              <span className="submission-detail-info__value">
                {new Date(submission.submittedAt).toLocaleString("vi-VN")}
              </span>
            </div>
          </div>

          {/* Referee Note */}
          {submission.refereeNote && (
            <div className="submission-detail-note">
              <div className="submission-detail-note__header">
                <FileText size={14} />
                <span>Ghi chú trọng tài</span>
              </div>
              <p className="submission-detail-note__content">{submission.refereeNote}</p>
            </div>
          )}

          {/* Results Table */}
          {submission.results && submission.results.length > 0 && (
            <div className="submission-detail-results">
              <h4 className="submission-detail-results__title">
                <Hash size={14} />
                Kết quả đã submit
              </h4>
              <div className="submission-detail-results__table">
                <div className="submission-detail-results__header">
                  <span>Cổng</span>
                  <span>Ngựa</span>
                  <span>Kỵ sĩ</span>
                  <span>Thứ hạng</span>
                  <span>Trạng thái</span>
                </div>
                {submission.results.map((result, index) => (
                  <div key={result.horseId || index} className="submission-detail-results__row">
                    <div className="submission-detail-results__gate">
                      <span>{result.gateNumber}</span>
                    </div>
                    <span className="submission-detail-results__horse">
                      {result.horseName}
                    </span>
                    <span className="submission-detail-results__jockey">
                      {result.jockeyName || "—"}
                    </span>
                    <span className="submission-detail-results__rank">
                      {result.rank ? `#${result.rank}` : "—"}
                    </span>
                    <span
                      className={`submission-detail-results__status submission-detail-results__status--${
                        result.status === "FINISHED"
                          ? "ok"
                          : result.status === "DQ"
                            ? "danger"
                            : result.status === "DNF"
                              ? "warn"
                              : "muted"
                      }`}
                    >
                      {result.status || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          {submission.note && (
            <div className="submission-detail-results__note">
              <span className="submission-detail-results__note-label">Ghi chú:</span>
              <span>{submission.note}</span>
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
function EmptyState({ isFiltered }) {
  return (
    <div className="submission-empty">
      <FileText size={48} />
      <h3>{isFiltered ? "Không tìm thấy submission nào" : "Chưa có submission nào"}</h3>
      <p>
        {isFiltered
          ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          : "Danh sách submission của bạn sẽ xuất hiện ở đây sau khi bạn nhập kết quả."}
      </p>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RefereeSubmissionHistoryPage() {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch submissions on mount with cancellation guard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const subs = await refereeSubmissionService.getMySubmissions();
        if (!cancelled) setSubmissions(subs);
      } catch (e) {
        if (!cancelled) console.error("Failed to load submissions:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter((sub) => {
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "Waiting" && sub.comparisonStatus !== "WaitingOtherReferee") {
          return false;
        }
        if (statusFilter === "Matched" && sub.comparisonStatus !== "AutoMatched") {
          return false;
        }
        if (statusFilter === "Conflict" && sub.comparisonStatus !== "Conflicted") {
          return false;
        }
      }

      // Search filter
      if (query) {
        const raceName = (sub.raceName || "").toLowerCase();
        const legName = (sub.legName || "").toLowerCase();
        if (!raceName.includes(query) && !legName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, search, statusFilter]);

  // Handle view detail
  const handleViewDetail = (submission) => {
    setSelectedSubmission(submission);
    setShowDetailModal(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedSubmission(null);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearch("");
  };

  // Loading state
  if (loading) {
    return (
      <div className="submission-history-page">
        <div className="submission-history-page__inner">
          <button
            type="button"
            className="submission-btn submission-btn--back"
            onClick={() => navigate("/referee")}
          >
            <ArrowLeft size={16} /> Quay lại Dashboard
          </button>

          <header className="submission-history-page__header">
            <div>
              <p className="submission-history-page__eyebrow">Referee</p>
              <h1 className="submission-history-page__title">Lịch sử Submission</h1>
              <p className="submission-history-page__subtitle">
                Theo dõi tất cả kết quả bạn đã submit.
              </p>
            </div>
          </header>

          <div className="submission-history-page__toolbar">
            <SearchInput value="" onChange={() => {}} onClear={() => {}} />
            <SubmissionFilter value="ALL" onChange={() => {}} />
          </div>

          <SubmissionTable submissions={[]} onViewDetail={() => {}} isLoading={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="submission-history-page">
      <div className="submission-history-page__inner">
        {/* Back Button */}
        <button
          type="button"
          className="submission-btn submission-btn--back"
          onClick={() => navigate("/referee")}
        >
          <ArrowLeft size={16} /> Quay lại Dashboard
        </button>

        {/* Page Header */}
        <header className="submission-history-page__header">
          <div>
            <p className="submission-history-page__eyebrow">Referee</p>
            <h1 className="submission-history-page__title">Lịch sử Submission</h1>
            <p className="submission-history-page__subtitle">
              Theo dõi tất cả kết quả bạn đã submit.
            </p>
          </div>
          <div className="submission-history-page__stats">
            <span className="submission-history-page__stats-count">
              {filteredSubmissions.length} / {submissions.length} submission
            </span>
          </div>
        </header>

        {/* Toolbar */}
        <div className="submission-history-page__toolbar">
          <SearchInput value={search} onChange={setSearch} onClear={handleClearSearch} />
          <SubmissionFilter value={statusFilter} onChange={setStatusFilter} />
        </div>

        {/* Table or Empty */}
        {filteredSubmissions.length === 0 ? (
          <EmptyState isFiltered={search !== "" || statusFilter !== "ALL"} />
        ) : (
          <SubmissionTable
            submissions={filteredSubmissions}
            onViewDetail={handleViewDetail}
            isLoading={false}
          />
        )}
      </div>

      {/* Detail Modal */}
      <SubmissionDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        submission={selectedSubmission}
      />
    </div>
  );
}
