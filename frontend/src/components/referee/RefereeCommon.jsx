/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared components for Referee pages.
 */

import { RefreshCcw } from "lucide-react";
import "./RefereeCommon.css";

/* ============================================
   REF COMMON — CSS variables (reuse --ho-* tokens)
   ============================================ */

/* === PAGE HEADER === */
export function RefereePageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  onRefresh,
  refreshing,
}) {
  return (
    <header className="ref-page-header">
      <div className="ref-page-header__main">
        {eyebrow ? <p className="ref-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="ref-page-header__title">{title}</h1>
        {subtitle ? <p className="ref-page-header__subtitle">{subtitle}</p> : null}
      </div>
      <div className="ref-page-header__actions">
        {actions}
        {onRefresh ? (
          <button
            type="button"
            className="ref-btn ref-btn--ghost"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCcw size={14} />
            {refreshing ? "Đang tải…" : "Làm mới"}
          </button>
        ) : null}
      </div>
    </header>
  );
}

/* === STAT CARD === */
export function RefereeStatCard({
  icon: Icon,
  label,
  value,
  accent = "default",
  subtitle,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`ref-stat-card ref-stat-card--${accent}${onClick ? " ref-stat-card--clickable" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="ref-stat-card__icon">
        <Icon size={20} />
      </div>
      <div className="ref-stat-card__body">
        <p className="ref-stat-card__label">{label}</p>
        <p className="ref-stat-card__value">{value ?? "—"}</p>
        {subtitle ? <p className="ref-stat-card__subtitle">{subtitle}</p> : null}
      </div>
    </button>
  );
}

/* === RACE STATUS BADGE === */
const RACE_STATUS_CONFIG = {
  Scheduled:      { variant: "info",    label: "Chờ bắt đầu" },
  InProgress:    { variant: "live",    label: "Đang diễn ra" },
  Paused:        { variant: "warn",   label: "Tạm dừng" },
  PendingResult: { variant: "warn",   label: "Chờ kết quả" },
  Completed:     { variant: "ok",     label: "Hoàn thành" },
  Cancelled:     { variant: "danger", label: "Đã hủy" },
};

export function RaceStatusBadge({ status }) {
  const cfg = RACE_STATUS_CONFIG[status] || { variant: "muted", label: status || "—" };
  return <span className={`ref-badge ref-badge--${cfg.variant}`}>{cfg.label}</span>;
}

/* === LEG STATUS BADGE === */
const LEG_STATUS_CONFIG = {
  AwaitingSubmission:  { variant: "info",   label: "Chờ nhập" },
  SubmittedByMe:       { variant: "warn",   label: "Đã submit" },
  WaitingOtherReferee: { variant: "info",   label: "Chờ TT còn lại" },
  AutoMatched:         { variant: "ok",     label: "Khớp tự động" },
  Conflicted:          { variant: "danger", label: "Xung đột" },
  NotSubmitted:        { variant: "muted",   label: "Chưa nhập" },
};

export function LegStatusBadge({ status }) {
  const cfg = LEG_STATUS_CONFIG[status] || { variant: "muted", label: status || "—" };
  return <span className={`ref-badge ref-badge--${cfg.variant}`}>{cfg.label}</span>;
}

/* === SUBMISSION STATUS BADGE === */
const SUB_STATUS_CONFIG = {
  WaitingOtherReferee: { variant: "info",   label: "Chờ TT còn lại" },
  AutoMatched:         { variant: "ok",     label: "Khớp tự động" },
  Conflicted:          { variant: "danger", label: "Xung đột" },
};

export function SubmissionStatusBadge({ status }) {
  const cfg = SUB_STATUS_CONFIG[status] || { variant: "muted", label: status || "—" };
  return <span className={`ref-badge ref-badge--${cfg.variant}`}>{cfg.label}</span>;
}

/* === HORSE STATUS BADGE === */
const HORSE_RESULT_CONFIG = {
  FINISHED: { variant: "ok",     label: "Về đích" },
  DNF:      { variant: "muted", label: "DNF" },
  DQ:       { variant: "danger",label: "DQ" },
};

export function HorseResultStatusBadge({ status }) {
  const cfg = HORSE_RESULT_CONFIG[status] || { variant: "muted", label: status || "—" };
  return <span className={`ref-badge ref-badge--${cfg.variant}`}>{cfg.label}</span>;
}

/* === CONFLICT STATUS BADGE === */
const CONFLICT_STATUS_CONFIG = {
  Conflicted:   { variant: "danger", label: "Xung đột" },
  UnderReview: { variant: "warn",   label: "Đang xem xét" },
  Resolved:    { variant: "ok",     label: "Đã giải quyết" },
  Rejected:    { variant: "muted",  label: "Từ chối" },
};

export function ConflictStatusBadge({ status }) {
  const cfg = CONFLICT_STATUS_CONFIG[status] || { variant: "muted", label: status || "—" };
  return <span className={`ref-badge ref-badge--${cfg.variant}`}>{cfg.label}</span>;
}

/* === ERROR ALERT === */
export function RefereeErrorAlert({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="ref-alert ref-alert--error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="ref-btn ref-btn--ghost ref-btn--sm" onClick={onRetry}>
          <RefreshCcw size={12} /> Thử lại
        </button>
      ) : null}
    </div>
  );
}

/* === CONFLICT ALERT CARD === */
export function ConflictAlertCard({ raceName, legName, onView }) {
  return (
    <div className="ref-conflict-card">
      <div className="ref-conflict-card__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div className="ref-conflict-card__body">
        <h4>{raceName}</h4>
        <p>{legName}</p>
        <p className="ref-conflict-card__desc">Kết quả leg có sự khác biệt giữa 2 trọng tài.</p>
      </div>
      {onView ? (
        <button type="button" className="ref-btn ref-btn--ghost ref-btn--sm" onClick={onView}>
          Chi tiết
        </button>
      ) : null}
    </div>
  );
}

/* === TOOLBAR === */
export function RefereeToolbar({ children }) {
  return <div className="ref-toolbar">{children}</div>;
}

export function RefereeSearchInput({ value, onChange, placeholder = "Tìm kiếm…" }) {
  return (
    <input
      type="search"
      className="ref-search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function RefereeFilterSelect({ value, onChange, options, label = "Lọc" }) {
  return (
    <label className="ref-filter">
      <span className="ref-filter__label">{label}</span>
      <select
        className="ref-filter__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
