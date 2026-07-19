/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Race Control Page
 * Route: /referee/races/:raceId/control
 *
 * Features:
 * - Start race (Scheduled → InProgress)
 * - Select leg
 * - Enter results for each horse
 * - Submit results
 * - View comparison status (Waiting, Matched, Conflict)
 *
 * FIXES:
 * - BUG-REF-002: handleStartRace & confirmSubmit gọi API thật qua service;
 *   handleStartRace gọi lại loadRace() 1 lần sau khi start thành công để đồng bộ
 *   race.legs + leg.status (BE chỉ trả race cha trong response startRace).
 * - BUG-REF-003: validateResults block modal confirmation khi form lỗi
 * - BUG-REF-008: Pre-fill rank/status từ mock → khởi tạo rỗng khi leg chưa submit
 * - A11y: aria-describedby, aria-invalid, role=alert, keyboard nav
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Trophy,
  Hash,
  Lock,
  Eye,
  RefreshCcw,
  X,
  Flag,
} from "lucide-react";
import {
  refereeRaceService,
  refereeSubmissionService,
} from "../../services/refereeService";
import { showToast } from "../../hooks/showToast";
import RaceStartConfirmModal from "../../components/common/RaceStartConfirmModal";
import ReportViolationModal from "../../components/referee/ReportViolationModal";
import { normalizeRaceStatus } from "../../utils/raceStatus";
import "./RefereeRaceControlPage.css";

// ============================================================
// RACE STATUS CONFIG
// ============================================================
const RACE_STATUS_CONFIG = {
  Scheduled: { variant: "info", label: "Chờ bắt đầu" },
  InProgress: { variant: "live", label: "Đang diễn ra" },
  Paused: { variant: "warn", label: "Tạm dừng" },
  PendingResult: { variant: "warn", label: "Chờ kết quả" },
  Completed: { variant: "ok", label: "Hoàn thành" },
  Cancelled: { variant: "danger", label: "Đã hủy" },
  Finished: { variant: "ok", label: "Hoàn thành" },
};

const LEG_STATUS_CONFIG = {
  AwaitingSubmission: { variant: "muted", label: "Chờ nhập" },
  SubmittedByMe: { variant: "warn", label: "Đã submit" },
  WaitingOtherReferee: { variant: "info", label: "Chờ TT còn lại" },
  AutoMatched: { variant: "ok", label: "Khớp tự động" },
  Conflicted: { variant: "danger", label: "Xung đột" },
  NotSubmitted: { variant: "muted", label: "Chưa nhập" },
};

const RESULT_STATUS_OPTIONS = [
  { value: "", label: "Chọn trạng thái..." },
  { value: "FINISHED", label: "FINISHED - Về đích" },
  { value: "DNF", label: "DNF - Did Not Finish" },
  { value: "DQ", label: "DQ - Disqualified" },
];

// ============================================================
// RACE HEADER CARD
// ============================================================
function RaceHeaderCard({ race, onStartRace, isStarting }) {
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

  const normalizedStatus = normalizeRaceStatus(race.status);
  const statusConfig = RACE_STATUS_CONFIG[normalizedStatus] || { variant: "muted", label: race.status };
  const canStart = normalizedStatus === "Scheduled";
  const isInProgress = normalizedStatus === "InProgress";
  const isPaused = normalizedStatus === "Paused";

  return (
    <div className="race-header-card">
      <div className="race-header-card__main">
        <div className="race-header-card__header">
          <div>
            <span className="race-header-card__id" aria-label={`Mã race ${race.raceId || race.id}`}>
              <Hash size={14} aria-hidden="true" /> Race #{(race.raceId || race.id)}
            </span>
            <h1 className="race-header-card__title">{race.name}</h1>
            <p className="race-header-card__tournament">
              <Trophy size={14} />
              {race.tournamentName}
            </p>
          </div>
          <div className="race-header-card__badges">
            <span className={`race-status-badge race-status-badge--${statusConfig.variant}`}>
              {statusConfig.label}
            </span>
            {race.bettingStatus === "Closed" ? (
              <span className="race-status-badge race-status-badge--muted">
                <Lock size={12} /> Cược đã khóa
              </span>
            ) : (
              <span className="race-status-badge race-status-badge--info">
                <Eye size={12} /> Cược mở
              </span>
            )}
          </div>
        </div>

        <div className="race-header-card__meta">
          <div className="race-header-card__meta-item">
            <MapPin size={14} />
            <span>{race.location || "Chưa cập nhật"}</span>
          </div>
          <div className="race-header-card__meta-item">
            <Clock size={14} />
            <span>{formatDateTime(race.scheduledStartTime)}</span>
          </div>
        </div>

        {race.assignedRole && (
          <div className="race-header-card__role">
            <span>Vai trò:</span>
            <strong>{race.assignedRole}</strong>
            {race.otherRefereeName && (
              <>
                <span>· Trọng tài còn lại:</span>
                <strong>{race.otherRefereeName}</strong>
              </>
            )}
          </div>
        )}
      </div>

      <div className="race-header-card__action">
        {canStart && (
          <button
            type="button"
            className="race-btn race-btn--start"
            onClick={onStartRace}
            disabled={isStarting}
          >
            <PlayCircle size={18} />
            {isStarting ? "Đang bắt đầu..." : "START RACE"}
          </button>
        )}
        {isPaused && (
          <div className="race-header-card__paused-msg">
            <AlertTriangle size={16} />
            Race đang bị tạm dừng do có conflict.
          </div>
        )}
        {isInProgress && (
          <div className="race-header-card__live-msg">
            <span className="race-header-card__live-dot" />
            Race đang diễn ra
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LEG SELECTOR
// ============================================================
function LegSelector({ legs, selectedLegId, onSelectLeg }) {
  return (
    <div className="leg-selector" role="region" aria-label="Chọn leg">
      <h2 className="leg-selector__title">
        <Hash size={16} /> Chọn Leg
      </h2>
      <div className="leg-selector__list" role="listbox" aria-label="Danh sách leg">
        {legs.map((leg) => {
          const statusConfig = LEG_STATUS_CONFIG[leg.status] || { variant: "muted", label: leg.status };
          const isSelected = selectedLegId === (leg.id || leg.legId);
          const isLocked = leg.mySubmissionStatus === "SubmittedByMe" ||
            leg.mySubmissionStatus === "WaitingOtherReferee" ||
            leg.status === "Conflicted" ||
            leg.status === "AutoMatched";

          return (
            <button
              key={leg.id || leg.legId}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-disabled={isLocked}
              className={`leg-selector__item${isSelected ? " leg-selector__item--selected" : ""}${isLocked ? " leg-selector__item--locked" : ""}`}
              onClick={() => !isLocked && onSelectLeg(leg)}
              onKeyDown={(e) => {
                if (!isLocked && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelectLeg(leg);
                }
              }}
              disabled={isLocked}
              title={isLocked ? "Leg này đã được submit hoặc bị khóa" : undefined}
            >
              <div className="leg-selector__item-header">
                <span className="leg-selector__item-number">Leg {leg.legNumber}</span>
                <span className={`leg-status-badge leg-status-badge--${statusConfig.variant}`}>
                  {statusConfig.label}
                </span>
              </div>
              <span className="leg-selector__item-name">{leg.name}</span>
              {isLocked && (
                <span className="leg-selector__item-lock" aria-hidden="true">
                  <Lock size={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// HORSE RESULT TABLE
// ============================================================
function HorseResultTable({ results, onChange, errors, onReportViolation, disabled }) {
  const errorCount = useMemo(() => Object.keys(errors || {}).length, [errors]);

  const handleStatusChange = (index, status) => {
    const newResults = [...results];
    newResults[index] = {
      ...newResults[index],
      status,
      // Khi chọn FINISHED → tự set rank = 1; khi chọn DNF/DQ → xóa rank
      rank: status === "FINISHED" ? (newResults[index].rank || 1) : "",
    };
    onChange(newResults);
  };

  const handleRankChange = (index, rank) => {
    const newResults = [...results];
    const val = rank === "" ? "" : Math.max(1, parseInt(rank, 10) || 1);
    newResults[index] = { ...newResults[index], rank: val };
    onChange(newResults);
  };

  const handleNoteChange = (index, note) => {
    const newResults = [...results];
    newResults[index] = { ...newResults[index], note };
    onChange(newResults);
  };

  const finishedCount = results.filter((r) => r.status === "FINISHED").length;

  return (
    <div className="horse-result-table" role="region" aria-label="Bảng nhập kết quả ngựa">
      {/* Screen-reader error summary */}
      {errorCount > 0 && (
        <div role="alert" aria-live="polite" className="sr-only">
          Có {errorCount} lỗi trong biểu mẫu. Vui lòng kiểm tra lại.
        </div>
      )}

      <div className="horse-result-table__header" role="row">
        <span role="columnheader">Cổng</span>
        <span role="columnheader">Ngựa</span>
        <span role="columnheader">Kỵ sĩ</span>
        <span role="columnheader">Thứ hạng</span>
        <span role="columnheader">Trạng thái</span>
        <span role="columnheader">Ghi chú</span>
        {onReportViolation && <span role="columnheader">Hành động</span>}
      </div>
      <div className="horse-result-table__body" role="rowgroup">
        {results.map((result, index) => {
          const rowError = errors?.[index];
          const errorId = `row-error-${index}`;
          return (
            <div
              key={result.horseId || index}
              className={`horse-result-table__row${rowError ? " horse-result-table__row--error" : ""}`}
              role="row"
              aria-invalid={!!rowError}
              aria-describedby={rowError ? errorId : undefined}
            >
              <div className="horse-result-table__gate" role="cell">
                <span>{result.gateNumber}</span>
              </div>
              <div className="horse-result-table__horse" role="cell">
                <strong>{result.horseName || "Ngựa"}</strong>
              </div>
              <div className="horse-result-table__jockey" role="cell">
                <span>{result.jockeyName || "—"}</span>
              </div>
              <div className="horse-result-table__rank" role="cell">
                <select
                  className="horse-result-table__select"
                  value={result.rank || ""}
                  onChange={(e) => handleRankChange(index, e.target.value)}
                  disabled={result.status !== "FINISHED"}
                  aria-label={`Thứ hạng ngựa ${result.horseName || index + 1}`}
                  aria-disabled={result.status !== "FINISHED"}
                >
                  <option value="">—</option>
                  {finishedCount > 0 &&
                    Array.from({ length: finishedCount }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
              </div>
              <div className="horse-result-table__status" role="cell">
                <select
                  className="horse-result-table__select"
                  value={result.status || ""}
                  onChange={(e) => handleStatusChange(index, e.target.value)}
                  aria-label={`Trạng thái ngựa ${result.horseName || index + 1}`}
                  aria-invalid={!!rowError && !result.status}
                >
                  {RESULT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {rowError && (
                  <span id={errorId} className="horse-result-table__error-msg" role="alert">
                    {rowError}
                  </span>
                )}
              </div>
              <div className="horse-result-table__note" role="cell">
                <input
                  type="text"
                  className="horse-result-table__input"
                  value={result.note || ""}
                  onChange={(e) => handleNoteChange(index, e.target.value)}
                  placeholder={result.status === "DQ" ? "Lý do DQ..." : "Ghi chú..."}
                  aria-label={`Ghi chú ngựa ${result.horseName || index + 1}`}
                />
              </div>
              {onReportViolation && (
                <div className="horse-result-table__action" role="cell">
                  <button
                    type="button"
                    className="horse-result-table__btn horse-result-table__btn--flag"
                    onClick={() => onReportViolation(result)}
                    disabled={disabled || !result.horseId}
                    aria-label={`Báo cáo vi phạm cho ngựa ${result.horseName || index + 1}`}
                    title="Báo cáo vi phạm"
                  >
                    <Flag size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// REFEREE NOTE BOX
// ============================================================
function RefereeNoteBox({ value, onChange }) {
  return (
    <div className="referee-note-box">
      <label className="referee-note-box__label" htmlFor="referee-note">
        <Clock size={14} />
        Ghi chú trọng tài
      </label>
      <textarea
        id="referee-note"
        className="referee-note-box__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="VD: Điều kiện sân trơn, 1 ngựa gãy móng ở phút 3..."
        rows={3}
        aria-label="Ghi chú trọng tài cho leg này"
      />
    </div>
  );
}

// ============================================================
// SUBMISSION STATUS BANNER
// ============================================================
function SubmissionStatusBanner({ status }) {
  if (!status) return null;

  const statusConfig = LEG_STATUS_CONFIG[status] || { variant: "muted", label: status };

  const statusMessages = {
    AwaitingSubmission: "Leg này chưa được nhập kết quả.",
    SubmittedByMe: "Bạn đã submit. Đang chờ trọng tài còn lại.",
    WaitingOtherReferee: "Đang chờ trọng tài còn lại submit.",
    AutoMatched: "Kết quả khớp với trọng tài còn lại. Hoàn tất!",
    Conflicted: "Có xung đột kết quả. Hệ thống đang xử lý.",
  };

  const icons = {
    AwaitingSubmission: Clock,
    SubmittedByMe: Clock,
    WaitingOtherReferee: Clock,
    AutoMatched: CheckCircle2,
    Conflicted: AlertTriangle,
  };

  const Icon = icons[status] || Clock;

  return (
    <div
      className={`submission-status-banner submission-status-banner--${statusConfig.variant}`}
      role="status"
      aria-live="polite"
    >
      <div className="submission-status-banner__icon">
        <Icon size={20} />
      </div>
      <div className="submission-status-banner__content">
        <span className="submission-status-banner__title">
          {statusConfig.label}
        </span>
        <span className="submission-status-banner__message">
          {statusMessages[status] || status}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// SUBMIT RESULT MODAL
// ============================================================
function SubmitResultModal({ isOpen, onConfirm, onCancel, isSubmitting, legName }) {
  const cancelRef = useRef(null);

  // Focus cancel button when modal opens
  useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape" && !isSubmitting) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="confirm-modal-title">Xác nhận gửi kết quả</h3>
          <button
            ref={cancelRef}
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-icon">
            <AlertTriangle size={32} />
          </div>
          <p id="confirm-modal-desc">
            Bạn có chắc muốn gửi kết quả cho <strong>{legName}</strong>?
          </p>
          <div className="modal-warning">
            <Lock size={14} />
            <span>
              Kết quả đã gửi <strong>không thể chỉnh sửa</strong>.
              Trọng tài còn lại sẽ không thấy kết quả của bạn cho đến khi họ submit.
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn--cancel"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--confirm"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang gửi..." : "Xác nhận gửi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SKELETON
// ============================================================
function PageSkeleton() {
  return (
    <div className="race-control-skeleton">
      <div className="race-control-skeleton__header">
        <div>
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--medium" />
        </div>
        <div className="skeleton-line skeleton-line--button" />
      </div>
      <div className="race-control-skeleton__legs">
        <div className="skeleton-line skeleton-line--short" />
        <div className="race-control-skeleton__leg-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      </div>
      <div className="race-control-skeleton__table">
        <div className="skeleton-line skeleton-line--full" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-line skeleton-line--row" />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyLegState() {
  return (
    <div className="race-control-empty">
      <Hash size={48} />
      <h3>Chọn một Leg</h3>
      <p>Chọn leg từ danh sách bên trái để nhập kết quả.</p>
    </div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================
function ErrorState({ message, onRetry }) {
  return (
    <div className="race-control-error">
      <AlertTriangle size={48} />
      <h3>Đã xảy ra lỗi</h3>
      <p>{message || "Không thể tải dữ liệu race."}</p>
      <button type="button" className="race-btn race-btn--primary" onClick={onRetry}>
        <RefreshCcw size={14} /> Thử lại
      </button>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RefereeRaceControlPage() {
  const navigate = useNavigate();
  const { raceId } = useParams();
  const toastify = {
    success: (msg) => showToast.success(msg),
    error: (msg) => showToast.error(msg),
    warn: (msg) => showToast.warn(msg),
    info: (msg) => showToast.info(msg),
  };

  const [race, setRace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedLegId, setSelectedLegId] = useState(null);
  const [results, setResults] = useState([]);
  const [refereeNote, setRefereeNote] = useState("");
  const [errors, setErrors] = useState({});

  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startError, setStartError] = useState("");

  // FLOW 5 — Referee báo cáo vi phạm
  const [reportEntry, setReportEntry] = useState(null);

  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [toast, setToast] = useState(null);

  // Inline submit focus — hỗ trợ URL ?focus=submit
  const [searchParams] = useSearchParams();
  const submitButtonRef = useRef(null);

  // Track original results to detect unsaved changes (BUG-REF-017)
  const [originalResults, setOriginalResults] = useState([]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!results.length || !originalResults.length) return false;
    if (results.length !== originalResults.length) return true;

    return results.some((r, idx) => {
      const orig = originalResults[idx];
      return (
        r.status !== orig.status ||
        r.rank !== orig.rank ||
        r.note !== orig.note
      );
    });
  }, [results, originalResults]);

  // Manual reload handler
  const loadRace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raceData = await refereeRaceService.getRaceControlDetail(raceId);
      setRace(raceData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu race.");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  // Fetch race on mount and raceId change with cancellation guard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const raceData = await refereeRaceService.getRaceControlDetail(raceId);
        if (!cancelled) setRace(raceData);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không thể tải dữ liệu race.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [raceId]);

  // Khi navigate từ AssignedRacesPage với ?focus=submit → scroll + focus nút Submit
  useEffect(() => {
    if (loading) return;
    if (searchParams.get("focus") !== "submit") return;
    if (!submitButtonRef.current) return;
    submitButtonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => submitButtonRef.current?.focus?.(), 350);
    return () => clearTimeout(t);
  }, [loading, searchParams]);

  // Sau khi loadRace() reload (vd: sau handleStartRace), nếu selectedLegId không
  // còn trong race.legs mới → reset state để UI không tham chiếu leg rỗng.
  useEffect(() => {
    if (!selectedLegId || !race?.legs) return;
    const stillExists = race.legs.some(
      (l) => (l.id || l.legId) === selectedLegId,
    );
    if (stillExists) return;
    setSelectedLegId(null);
    setResults([]);
    setOriginalResults([]);
    setRefereeNote("");
    setErrors({});
    setSubmissionStatus(null);
  }, [race?.legs, selectedLegId]);

  // Nếu race chỉ có 1 leg (hoặc 0 leg) → ẩn panel "Chọn Leg" và auto-select
  // leg duy nhất để ResultsPanel hiển thị ngay khi user mở trang.
  const hasMultipleLegs = (race?.legs?.length || 0) > 1;
  useEffect(() => {
    if (hasMultipleLegs || !race?.legs || race.legs.length === 0) return;
    if (selectedLegId) return;
    const onlyLeg = race.legs[0];
    if (!onlyLeg) return;
    // Tận dụng handleSelectLeg để khởi tạo đầy đủ state (results/originalResults/
    // submissionStatus/refereeNote). handleSelectLeg có guard `hasUnsavedChanges`
    // nhưng khi chưa có dữ liệu (selectedLegId === null) thì guard không kích hoạt.
    handleSelectLeg(onlyLeg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race?.legs, hasMultipleLegs]);

  // Toast auto dismiss

  // Handle leg selection
  // Function declaration (được hoist) để useEffect auto-select ở trên có thể tham
  // chiếu trước khi khai báo — tránh lỗi "Cannot access variable before it is declared"
  // của plugin react-hooks (const arrow function bị TDZ).
  function handleSelectLeg(leg) {
    // BUG-REF-017: Warn if user has unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "Bạn có dữ liệu chưa lưu trên leg hiện tại.\nRời khỏi sẽ mất dữ liệu đã nhập.\n\nTiếp tục?",
      );
      if (!confirmed) return;
    }

    setSelectedLegId(leg.id || leg.legId);
    setErrors({});

    // BUG-REF-008: luôn khởi tạo rỗng; không pre-fill rank/status từ mock data.
    // BE hiện trả leg.mySubmissionStatus ∈ {"Submitted","NotSubmitted"} (PascalCase)
    // và leg.status === race.status (SCREAMING_SNAKE). Chuẩn hoá về 1 dạng
    // để so sánh ổn định ở canSubmit.
    const mySub = (leg.mySubmissionStatus || leg.submissionStatus || "").toLowerCase();
    const isAlreadySubmitted =
      mySub === "submitted" ||
      mySub === "submittedbyme" ||
      mySub === "submitted_by_me" ||
      mySub === "waitingotherreferee" ||
      mySub === "waiting_other_referee";

    setSubmissionStatus(isAlreadySubmitted ? "SubmittedByMe" : "AwaitingSubmission");

    const initialResults = (leg.horses || []).map((h) => ({
      horseId: h.horseId,
      entryId: h.entryId ?? h.horseId, // BE dùng entryId, FE có thể chỉ có horseId
      gateNumber: h.gateNumber,
      horseName: h.horseName,
      jockeyName: h.jockeyName,
      // Nếu đã submit thì hiện lại kết quả để xem; nếu chưa thì để rỗng
      status: isAlreadySubmitted ? (h.status || "") : "",
      rank: isAlreadySubmitted ? (h.rank ?? "") : "",
      note: isAlreadySubmitted ? (h.note || "") : "",
    }));
    setResults(initialResults);
    // BUG-REF-017: Store original for change detection
    setOriginalResults(isAlreadySubmitted ? initialResults : []);
    setRefereeNote(isAlreadySubmitted ? (leg.refereeNote || "") : "");
  }

  // Start race via API (BUG-REF-002) — FLOW 4 Step 1
  // Sau khi BE confirm status chuyển sang InProgress, ta gọi lại loadRace() để
  // làm mới TOÀN BỘ (race.legs, leg.status, mySubmissionStatus, bettingStatus...)
  // vì response startRace chỉ trả race cha, không refresh các quan hệ con.
  // Không reset selectedLegId cứng — giữ leg user đang chọn nếu vẫn còn; tự động
  // rỗng nếu BE loại bỏ (handled trong useEffect dưới).
  const handleStartRace = async () => {
    setIsStarting(true);
    setStartError("");
    try {
      const updated = await refereeRaceService.startRace(raceId);
      if (updated) {
        setRace((prev) => ({ ...(prev || {}), ...updated }));
      }
      toastify.success(
        "Race đã bắt đầu! Cược mới đã bị khóa. Đang tải lại dữ liệu..."
      );
      setShowStartModal(false);

      // Reload race 1 lần để UI đồng bộ hoàn toàn với BE (status + legs +
      // bettingStatus). Trước đây chỉ patch race từ response startRace → các
      // leg.submissionStatus vẫn là snapshot cũ lúc race còn Scheduled, khiến
      // trạng thái leg hiển thị không phản ánh "đang diễn ra".
      await loadRace();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không thể bắt đầu race.";
      setStartError(msg);
      toastify.error(msg);
    } finally {
      setIsStarting(false);
    }
  };

  const openStartModal = () => {
    setStartError("");
    setShowStartModal(true);
  };

  // Validate results - sử dụng service validation + additional checks
  const validateResults = () => {
    const newErrors = {};

    // 1. Kiểm tra mỗi horse đã có status
    results.forEach((result, index) => {
      if (!result.status) {
        newErrors[index] = "Phải chọn trạng thái";
      } else if (result.status === "FINISHED") {
        // 2. FINISHED phải có rank >= 1
        if (!result.rank || result.rank < 1) {
          newErrors[index] = "Phải nhập thứ hạng";
        }
      }
    });

    // 3. Kiểm tra rank trùng lặp (Business Rule #7)
    const finishedResults = results.filter((r) => r.status === "FINISHED" && r.rank != null && r.rank >= 1);
    const ranks = finishedResults.map((r) => r.rank);
    const uniqueRanks = new Set(ranks);
    if (ranks.length !== uniqueRanks.size) {
      // Mark tất cả dòng trùng rank
      const seen = {};
      finishedResults.forEach((result) => {
        const globalIdx = results.indexOf(result);
        if (seen[result.rank] !== undefined) {
          newErrors[globalIdx] = "Thứ hạng trùng lặp";
          newErrors[seen[result.rank]] = "Thứ hạng trùng lặp";
        } else {
          seen[result.rank] = globalIdx;
        }
      });
    }

    // 4. Kiểm tra rank liên tục 1, 2, 3... (Business Rule #7)
    if (Object.keys(newErrors).length === 0 && finishedResults.length > 0) {
      const sortedRanks = [...ranks].sort((a, b) => a - b);
      for (let i = 0; i < sortedRanks.length; i++) {
        if (sortedRanks[i] !== i + 1) {
          // Báo lỗi trên row có rank bị thiếu/ sai
          results.forEach((result, idx) => {
            if (result.status === "FINISHED" && result.rank === sortedRanks[i]) {
              if (!newErrors[idx]) {
                newErrors[idx] = "Thứ hạng phải liên tục từ 1";
              }
            }
          });
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // BUG-REF-003: validateResults trả về false → không mở modal
  const handleSubmitResults = async () => {
    if (!validateResults()) {
      toastify.error("Vui lòng kiểm tra lại thông tin kết quả.");
      return;
    }
    setShowConfirmModal(true);
  };

  // BUG-REF-002: confirmSubmit gọi API thật, reload race sau khi submit thành công
  // FLOW 4 — Blind Double Entry: BE trả về { status: 'PENDING_PARTNER' | 'AUTO_MATCHED' | 'CONFLICTED' }
  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    try {
      // Map results từ FE shape (horseId + status) → BE rawResults (entryId + isDnf/isDq + rank)
      const rawResults = results
        .filter((r) => r.status) // chỉ gửi những dòng đã chọn status
        .map((r) => ({
          horseId: r.horseId, // service sẽ map horseId → entryId
          rank: r.rank ? Number(r.rank) : null,
          status: r.status, // 'FINISHED' | 'DNF' | 'DQ'
          isDnf: r.status === "DNF",
          isDq: r.status === "DQ",
        }));

      const data = await refereeSubmissionService.submitRaceResult({
        raceId,
        rawResults,
      });

      // Sau submit thành công: cập nhật trạng thái phù hợp (FE-only, vì BE
      // chưa emit socket event `race:auto_matched` / `race:conflicted`)
      const resultStatus = String(data?.status || "").toUpperCase();
      if (resultStatus === "AUTO_MATCHED") {
        setRace((prev) => prev ? {
          ...prev,
          status: "PendingResult",
          _matchStatus: "AutoMatched",
        } : prev);
        toastify.success(
          data?.message ||
            "Khớp 100% với trọng tài còn lại. Race chuyển sang PENDING_RESULT."
        );
      } else if (resultStatus === "CONFLICTED") {
        setRace((prev) => prev ? {
          ...prev,
          status: "Paused",
          _matchStatus: "Conflicted",
        } : prev);
        toastify.warn(
          data?.message ||
            "Sai lệch với trọng tài còn lại. Race chuyển sang PAUSED chờ Admin."
        );
      } else {
        // PENDING_PARTNER (chỉ có 1 referee nộp)
        setSubmissionStatus("WaitingOtherReferee");
        toastify.info(
          data?.message ||
            "Kết quả đã gửi. Đang chờ trọng tài còn lại hoàn thành Blind Submission."
        );
      }

      // Reset form
      setSelectedLegId(null);
      setResults([]);
      setOriginalResults([]);
      setRefereeNote("");
      setErrors({});

      // Reload race data để cập nhật trạng thái leg mới nhất
      await loadRace();
    } catch (e) {
      toastify.error(
        e instanceof Error ? e.message : "Không thể gửi kết quả."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // BUG-V-11 — FLOW 5 Step 1: Referee ghi nhận vi phạm cho 1 entry
  const handleReportViolation = (entry) => {
    setReportEntry(entry);
  };

  const handleViolationSubmitted = (created) => {
    setReportEntry(null);
    showToast.success(
      `Đã ghi nhận vi phạm #${created?.id ?? ""} cho entry cổng ${reportEntry?.gateNumber ?? "?"}.`
    );
    // Reload race để cập nhật nếu BE cache violation count
    loadRace();
  };

  // Get selected leg
  const selectedLeg = useMemo(() => {
    if (!selectedLegId || !race) return null;
    return race.legs?.find((l) => l.id === selectedLegId || l.legId === selectedLegId);
  }, [selectedLegId, race]);

  // Can submit — normalize status (PascalCase / SCREAMING_SNAKE) về 1 dạng để so sánh.
  // BE hiện trả leg.status = race.status (SCREAMING_SNAKE) và
  // mySubmissionStatus ∈ {"Submitted","NotSubmitted"} (PascalCase).
  // Chuẩn hoá lowercase để check 1 lần.
  const normalize = (s) => String(s || "").toLowerCase();
  const raceStatusLower = normalize(race?.status);
  const legStatusLower = normalize(selectedLeg?.status);
  const legSubmissionStatusLower = normalize(
    selectedLeg?.mySubmissionStatus || selectedLeg?.submissionStatus
  );

  // Đếm số FINISHED entries để khớp với leg thật
  const finishedCount = results.filter((r) => r.status === "FINISHED").length;

  const canSubmit =
    (raceStatusLower === "inprogress" || raceStatusLower === "in_progress") &&
    selectedLeg &&
    // Leg sẵn sàng để nhập: race SCHEDULED→AwaitingSubmission (BE trả "SCHEDULED")
    // hoặc đã IN_PROGRESS mà referee chưa submit (BE trả "IN_PROGRESS" / "PENDING_RESULT").
    (legStatusLower === "scheduled" ||
      legStatusLower === "awaitingsubmission" ||
      legStatusLower === "awaiting_submission" ||
      legStatusLower === "not_submitted" ||
      legStatusLower === "inprogress" ||
      legStatusLower === "in_progress") &&
    legSubmissionStatusLower !== "submitted" &&
    legSubmissionStatusLower !== "submittedbyme" &&
    legSubmissionStatusLower !== "submitted_by_me" &&
    legSubmissionStatusLower !== "waitingotherreferee" &&
    legSubmissionStatusLower !== "waiting_other_referee" &&
    finishedCount > 0;

  // Loading state
  if (loading) {
    return (
      <div className="race-control-page">
        <div className="race-control-page__inner">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="race-control-page">
        <div className="race-control-page__inner">
          <button
            type="button"
            className="race-btn race-btn--back"
            onClick={() => navigate("/referee/assigned-races")}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <ErrorState message={error} onRetry={loadRace} />
        </div>
      </div>
    );
  }

  return (
    <div className="race-control-page">
      {/* Toast */}
      {toast && (
        <div
          className={`race-toast race-toast--${toast.type}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <span className="race-toast__icon" aria-hidden="true">
            {toast.type === "success" ? "✓" : "!"}
          </span>
          <span className="race-toast__message">{toast.message}</span>
          <button
            type="button"
            className="race-toast__close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="race-control-page__inner">
        {/* Back Button */}
        <button
          type="button"
          className="race-btn race-btn--back"
          onClick={() => navigate("/referee/assigned-races")}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        {/* Page Header */}
        <header className="race-control-page__header">
          <div>
            <p className="race-control-page__eyebrow">Race Control</p>
            <h1 className="race-control-page__title">
              Điều khiển Race
            </h1>
          </div>
          <button
            type="button"
            className="race-btn race-btn--refresh"
            onClick={loadRace}
          >
            <RefreshCcw size={14} /> Làm mới
          </button>
        </header>

        {/* Race Header Card */}
        <RaceHeaderCard
          race={race}
          onStartRace={openStartModal}
          isStarting={isStarting}
        />

        {/* Main Content Grid — chỉ 2 cột khi có nhiều leg. Race 1 leg ẩn panel Chọn Leg. */}
        <div
          className={`race-control-grid${hasMultipleLegs ? "" : " race-control-grid--single"}`}
        >
          {/* Leg Selector — chỉ render khi race có nhiều leg */}
          {hasMultipleLegs && (
            <div className="race-control-grid__legs">
              <LegSelector
                legs={race.legs || []}
                selectedLegId={selectedLegId}
                onSelectLeg={handleSelectLeg}
              />
            </div>
          )}

          {/* Results Panel */}
          <div
            className={`race-control-grid__results${hasMultipleLegs ? "" : " race-control-grid__results--full"}`}
          >
            {!selectedLeg ? (
              hasMultipleLegs ? (
                <EmptyLegState />
              ) : (
                // Race 0 leg (bất thường) — báo nhẹ thay vì empty state
                <div className="race-control-empty">
                  <Hash size={48} />
                  <h3>Chưa có leg nào</h3>
                  <p>Race chưa được cấu hình leg. Vui lòng liên hệ admin.</p>
                </div>
              )
            ) : (
              <div className="results-panel">
                {/* Submission Status Banner */}
                <SubmissionStatusBanner status={submissionStatus} />

                {/* Leg Title — race nhiều leg mới hiện h2 tên leg, race 1 leg thì header gọn lại */}
                {hasMultipleLegs ? (
                  <div className="results-panel__header">
                    <h2>{selectedLeg.name}</h2>
                    <span
                      className={`leg-status-badge leg-status-badge--${LEG_STATUS_CONFIG[submissionStatus]?.variant || "muted"}`}
                      aria-label={`Trạng thái: ${LEG_STATUS_CONFIG[submissionStatus]?.label || "—"}`}
                    >
                      {LEG_STATUS_CONFIG[submissionStatus]?.label || "—"}
                    </span>
                  </div>
                ) : (
                  <div className="results-panel__status-row">
                    <span
                      className={`leg-status-badge leg-status-badge--${LEG_STATUS_CONFIG[submissionStatus]?.variant || "muted"}`}
                      aria-label={`Trạng thái leg: ${LEG_STATUS_CONFIG[submissionStatus]?.label || "—"}`}
                    >
                      {LEG_STATUS_CONFIG[submissionStatus]?.label || "—"}
                    </span>
                  </div>
                )}

                {/* Horse Result Table */}
                <HorseResultTable
                  results={results}
                  onChange={setResults}
                  errors={errors}
                  onReportViolation={
                    normalizeRaceStatus(race?.status) === "InProgress"
                      ? handleReportViolation
                      : null
                  }
                  disabled={isSubmitting}
                />

                {/* Referee Note */}
                <RefereeNoteBox
                  value={refereeNote}
                  onChange={setRefereeNote}
                />

                {/* Submit Button */}
                {canSubmit && (
                  <div className="results-panel__actions">
                    <button
                      ref={submitButtonRef}
                      type="button"
                      className="race-btn race-btn--submit"
                      onClick={handleSubmitResults}
                      disabled={isSubmitting}
                      aria-label={`Gửi kết quả cho ${selectedLeg?.name}`}
                    >
                      <CheckCircle2 size={16} />
                      {isSubmitting ? "Đang gửi..." : "SUBMIT RESULT"}
                    </button>
                  </div>
                )}

                {/* Blind Notice */}
                <div className="results-panel__blind-notice">
                  <Lock size={14} />
                  <span>
                    Kết quả bạn nhập sẽ không hiển thị cho trọng tài còn lại cho đến khi backend xác nhận.
                    Bạn không thể sửa kết quả đã gửi.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <SubmitResultModal
        isOpen={showConfirmModal}
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
        isSubmitting={isSubmitting}
        legName={selectedLeg?.name}
      />

      {/* Start Race Confirm Modal — FLOW 4 Step 1 */}
      {showStartModal ? (
        <RaceStartConfirmModal
          race={race}
          refereeRole={race?.assignedRole || "Referee"}
          busy={isStarting}
          error={startError}
          onClose={() => {
            if (!isStarting) setShowStartModal(false);
          }}
          onConfirm={handleStartRace}
        />
      ) : null}

      {/* Report Violation Modal — FLOW 5 Step 1 */}
      {reportEntry ? (
        <ReportViolationModal
          raceId={raceId}
          entry={reportEntry}
          onClose={() => setReportEntry(null)}
          onSubmitted={handleViolationSubmitted}
        />
      ) : null}
    </div>
  );
}
