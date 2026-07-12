// Jockey Common Components - Shared UI components
import { RefreshCw, AlertCircle, Trophy, TrendingUp, Calendar, CheckCircle } from "lucide-react";

// ============================================
// Page Header
// ============================================

export function JockeyPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  onRefresh,
  refreshing,
}) {
  return (
    <div className="jock-page-header">
      <div className="jock-page-header-content">
        {eyebrow && <span className="jock-page-eyebrow">{eyebrow}</span>}
        <h1 className="jock-page-title">{title}</h1>
        {subtitle && <p className="jock-page-subtitle">{subtitle}</p>}
      </div>
      <div className="jock-page-header-actions">
        {actions}
        {onRefresh && (
          <button
            className="jock-icon-btn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Stat Card
// ============================================

export function JockeyStatCard({
  icon: Icon,
  label,
  value,
  accent,
  subtitle,
  onClick,
  trend,
}) {
  return (
    <div
      className={`jock-stat-card ${accent ? `jock-stat-card--${accent}` : ""} ${onClick ? "jock-stat-card--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="jock-stat-icon">
        <Icon size={24} />
      </div>
      <div className="jock-stat-content">
        <span className="jock-stat-label">{label}</span>
        <span className="jock-stat-value">{value}</span>
        {subtitle && <span className="jock-stat-subtitle">{subtitle}</span>}
        {trend && (
          <span className={`jock-stat-trend ${trend > 0 ? "positive" : "negative"}`}>
            <TrendingUp size={12} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Status Badges
// ============================================

export function JockeyRaceStatusBadge({ status }) {
  const config = {
    SCHEDULED: { label: "Scheduled", className: "badge--blue" },
    IN_PROGRESS: { label: "In Progress", className: "badge--green" },
    COMPLETED: { label: "Completed", className: "badge--gray" },
    CANCELLED: { label: "Cancelled", className: "badge--red" },
    POSTPONED: { label: "Postponed", className: "badge--amber" },
  };
  const { label, className } = config[status] || { label: status, className: "" };
  return <span className={`jock-badge ${className}`}>{label}</span>;
}

export function JockeyLegStatusBadge({ status }) {
  const config = {
    PENDING: { label: "Pending", className: "badge--gray" },
    LIVE: { label: "Live", className: "badge--green" },
    COMPLETED: { label: "Completed", className: "badge--blue" },
  };
  const { label, className } = config[status] || { label: status, className: "" };
  return <span className={`jock-badge ${className}`}>{label}</span>;
}

export function JockeyHorseStatusBadge({ status }) {
  const config = {
    FIT: { label: "Fit", className: "badge--green" },
    UNFIT: { label: "Unfit", className: "badge--red" },
    INJURED: { label: "Injured", className: "badge--amber" },
    RESTING: { label: "Resting", className: "badge--gray" },
    RETIRED: { label: "Retired", className: "badge--gray" },
  };
  const { label, className } = config[status] || { label: status, className: "" };
  return <span className={`jock-badge ${className}`}>{label}</span>;
}

export function JockeyPriorityBadge({ priority }) {
  const config = {
    HIGH: { label: "High", className: "badge--red" },
    MEDIUM: { label: "Medium", className: "badge--amber" },
    LOW: { label: "Low", className: "badge--gray" },
  };
  const { label, className } = config[priority] || { label: priority, className: "" };
  return <span className={`jock-badge ${className}`}>{label}</span>;
}

export function JockeyPositionBadge({ position }) {
  if (position === 1) return <span className="jock-badge badge--gold">🥇 1st</span>;
  if (position === 2) return <span className="jock-badge badge--silver">🥈 2nd</span>;
  if (position === 3) return <span className="jock-badge badge--bronze">🥉 3rd</span>;
  return <span className="jock-badge badge--gray">{position}th</span>;
}

export function JockeyFormBadge({ form }) {
  const getColor = (f) => {
    if (f === "1") return "#10b981";
    if (f === "2") return "#3b82f6";
    if (f === "3") return "#f59e0b";
    if (f === "-") return "#6b7280";
    return "#6b7280";
  };

  return (
    <div className="jock-form-badge">
      {form.map((f, i) => (
        <span
          key={i}
          className="jock-form-item"
          style={{ backgroundColor: getColor(f) }}
        >
          {f}
        </span>
      ))}
    </div>
  );
}

// ============================================
// Error Alert
// ============================================

export function JockeyErrorAlert({ message, onRetry }) {
  return (
    <div className="jock-alert jock-alert--error">
      <AlertCircle size={20} />
      <div className="jock-alert-content">
        <span className="jock-alert-title">Error</span>
        <span className="jock-alert-message">{message}</span>
      </div>
      {onRetry && (
        <button className="jock-alert-action" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================
// Success Alert
// ============================================

export function JockeySuccessAlert({ message, onDismiss }) {
  return (
    <div className="jock-alert jock-alert--success">
      <CheckCircle size={20} />
      <div className="jock-alert-content">
        <span className="jock-alert-message">{message}</span>
      </div>
      {onDismiss && (
        <button className="jock-alert-action" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}

// ============================================
// Toolbar
// ============================================

export function JockeyToolbar({ children }) {
  return <div className="jock-toolbar">{children}</div>;
}

export function JockeySearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="jock-search-input">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="jock-input"
      />
    </div>
  );
}

export function JockeyFilterSelect({ value, onChange, options, label }) {
  return (
    <div className="jock-filter-select">
      {label && <label className="jock-filter-label">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="jock-select"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// Card Components
// ============================================

export function JockeyRaceCard({ race, onClick }) {
  return (
    <div className="jock-race-card" onClick={onClick}>
      <div className="jock-race-card-header">
        <JockeyRaceStatusBadge status={race.status} />
        <span className="jock-race-card-date">
          <Calendar size={14} />
          {new Date(race.raceDate).toLocaleDateString("vi-VN")}
        </span>
      </div>
      <h3 className="jock-race-card-title">{race.name}</h3>
      <p className="jock-race-card-tournament">{race.tournamentName}</p>
      <div className="jock-race-card-details">
        <span className="jock-race-detail">
          <Trophy size={14} />
          {race.distance}m
        </span>
        <span className="jock-race-detail">{race.surface}</span>
        <span className="jock-race-detail">Gate #{race.gateNumber}</span>
      </div>
      <div className="jock-race-card-horse">
        <span className="jock-horse-name">{race.myHorse?.horseName}</span>
        <span className="jock-horse-trainer">by {race.myHorse?.trainerName}</span>
      </div>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

export function JockeyEmptyState({
  icon: Icon = Trophy,
  title,
  description,
  action,
  actionLabel,
}) {
  return (
    <div className="jock-empty-state">
      <div className="jock-empty-icon">
        <Icon size={48} />
      </div>
      <h3 className="jock-empty-title">{title}</h3>
      {description && <p className="jock-empty-description">{description}</p>}
      {action && (
        <button className="jock-btn jock-btn--primary" onClick={action}>
          {actionLabel || "Take Action"}
        </button>
      )}
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

export function JockeySkeleton({ type = "card", count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === "card") {
    return (
      <>
        {items.map((i) => (
          <div key={i} className="jock-skeleton jock-skeleton--card">
            <div className="jock-skeleton-header"></div>
            <div className="jock-skeleton-title"></div>
            <div className="jock-skeleton-text"></div>
            <div className="jock-skeleton-footer"></div>
          </div>
        ))}
      </>
    );
  }

  if (type === "list") {
    return (
      <>
        {items.map((i) => (
          <div key={i} className="jock-skeleton jock-skeleton--list-item">
            <div className="jock-skeleton-avatar"></div>
            <div className="jock-skeleton-content">
              <div className="jock-skeleton-line"></div>
              <div className="jock-skeleton-line jock-skeleton-line--short"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === "stats") {
    return (
      <div className="jock-skeleton jock-skeleton--stats">
        {items.map((i) => (
          <div key={i} className="jock-skeleton-stat">
            <div className="jock-skeleton-stat-icon"></div>
            <div className="jock-skeleton-stat-content">
              <div className="jock-skeleton-line"></div>
              <div className="jock-skeleton-line jock-skeleton-line--short"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ============================================
// Modal Base
// ============================================

export function JockeyModal({ isOpen, onClose, title, children, size = "md" }) {
  if (!isOpen) return null;

  return (
    <div className="jock-modal-overlay" onClick={onClose}>
      <div
        className={`jock-modal jock-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jock-modal-header">
          <h2 className="jock-modal-title">{title}</h2>
          <button className="jock-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="jock-modal-content">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// Tabs
// ============================================

export function JockeyTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="jock-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`jock-tab ${activeTab === tab.id ? "jock-tab--active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <tab.icon size={16} />}
          {tab.label}
          {tab.count !== undefined && (
            <span className="jock-tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Notification Item
// ============================================

export function JockeyNotificationItem({ notification, onClick, onMarkRead }) {
  const isUnread = !notification.read;

  return (
    <div
      className={`jock-notification-item ${isUnread ? "jock-notification-item--unread" : ""}`}
      onClick={onClick}
    >
      <div className="jock-notification-indicator">
        {isUnread && <span className="jock-notification-dot"></span>}
      </div>
      <div className="jock-notification-content">
        <div className="jock-notification-header">
          <span className="jock-notification-title">{notification.title}</span>
          <JockeyPriorityBadge priority={notification.priority} />
        </div>
        <p className="jock-notification-message">{notification.message}</p>
        <span className="jock-notification-time">
          {new Date(notification.timestamp).toLocaleString("vi-VN")}
        </span>
      </div>
      {isUnread && onMarkRead && (
        <button
          className="jock-notification-action"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
        >
          Mark Read
        </button>
      )}
    </div>
  );
}

// ============================================
// Schedule Item
// ============================================

export function JockeyScheduleItem({ item, onClick }) {
  return (
    <div className="jock-schedule-item" onClick={onClick}>
      <div className="jock-schedule-time">
        <span className="jock-schedule-hour">{item.time}</span>
      </div>
      <div className="jock-schedule-content">
        <h4 className="jock-schedule-title">{item.name}</h4>
        <span className="jock-schedule-venue">{item.venue}</span>
        {item.horse && (
          <span className="jock-schedule-horse">Horse: {item.horse}</span>
        )}
      </div>
      <JockeyRaceStatusBadge status={item.status} />
    </div>
  );
}

// ============================================
// Profile Avatar
// ============================================

export function JockeyAvatar({ name, avatar, size = "md" }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "JD";

  const sizeClass = `jock-avatar--${size}`;

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`jock-avatar jock-avatar--img ${sizeClass}`}
      />
    );
  }

  return (
    <div className={`jock-avatar jock-avatar--initials ${sizeClass}`}>
      {initials}
    </div>
  );
}
