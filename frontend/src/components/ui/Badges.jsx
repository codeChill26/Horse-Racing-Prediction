/**
 * Shared badge components for status, severity, and roles.
 * Dark-theme friendly. Use RoleBadge in tables, cards, and profile pages.
 */

const ROLE_VARIANT = {
  ADMIN: "role--admin",
  RACE_REFEREE: "role--referee",
  STAFF: "role--referee",
  MANAGER: "role--referee",
  HORSE_OWNER: "role--owner",
  OWNER: "role--owner",
  JOCKEY: "role--jockey",
  SPECTATOR: "role--spectator",
  USER: "role--spectator",
};

// Normalize role from various backend representations to canonical token
export function normalizeRoleCode(role) {
  if (!role) return "";
  if (typeof role === "object") {
    return String(role.code || role.name || "").toUpperCase().replace(/\s+/g, "_");
  }
  return String(role).toUpperCase().replace(/\s+/g, "_");
}

const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  RACE_REFEREE: "Trọng tài",
  STAFF: "Nhân viên",
  MANAGER: "Quản lý",
  HORSE_OWNER: "Chủ ngựa",
  OWNER: "Chủ ngựa",
  JOCKEY: "Kỵ sĩ",
  SPECTATOR: "Khán giả",
  USER: "Khán giả",
};

export function roleLabelVi(code) {
  if (!code) return "—";
  return ROLE_LABELS[normalizeRoleCode(code)] || String(code);
}

/**
 * Per-role colored badge.
 * Variants:
 *   admin: regal gold/red
 *   referee: indigo/violet
 *   owner: emerald green
 *   jockey: warm orange
 *   spectator: muted blue/gray
 */
export function RoleBadge({ role, label, className = "" }) {
  const code = normalizeRoleCode(role);
  const variantClass = ROLE_VARIANT[code] || "role--default";
  const text = label || roleLabelVi(code);
  if (!text) return null;
  return (
    <span className={`gs-role-badge ${variantClass} ${className}`}>
      {text}
    </span>
  );
}

/**
 * Generic status badge. Color by status string.
 */
const STATUS_VARIANT = {
  ACTIVE: "st--ok",
  APPROVED: "st--ok",
  OPEN: "st--ok",
  REGISTRATION_OPEN: "st--ok",
  BETTING_OPEN: "st--ok",
  ONGOING: "st--live",
  LIVE: "st--live",
  SCHEDULED: "st--info",
  UPCOMING: "st--info",
  REVIEWING: "st--info",
  PAYOUT_COMPLETED: "st--ok",
  WIN: "st--ok",
  WON: "st--ok",
  PARTIAL_WON: "st--info",
  PENDING: "st--warn",
  PENDING_REVIEW: "st--warn",
  DRAFT: "st--muted",
  FINISHED: "st--muted",
  COMPLETED: "st--muted",
  RESOLVED: "st--ok",
  CANCELLED: "st--danger",
  REJECTED: "st--danger",
  EXPIRED: "st--danger",
  DECLINED: "st--danger",
  BETTING_CLOSED: "st--muted",
  RACE_FINISHED: "st--muted",
  INACTIVE: "st--muted",
  SUSPENDED: "st--warn",
  LOCKED: "st--danger",
  RETIRED: "st--muted",
  LOST: "st--danger",
  REFUNDED: "st--info",
  DISMISSED: "st--muted",
};

export function StatusBadge({ status, label, className = "" }) {
  if (!status && !label) return null;
  const key = String(status || "").toUpperCase().replace(/\s+/g, "_");
  const variantClass = STATUS_VARIANT[key] || "st--default";
  const text = label || status;
  return (
    <span className={`gs-status-badge ${variantClass} ${className}`}>
      {text}
    </span>
  );
}

/**
 * Severity badge. Used for deviation, violation, alerts.
 */
const SEVERITY_VARIANT = {
  CRITICAL: "sev--critical",
  SEVERE: "sev--critical",
  HIGH: "sev--high",
  MAJOR: "sev--high",
  MEDIUM: "sev--medium",
  MINOR: "sev--medium",
  WARNING: "sev--warning",
  LOW: "sev--warning",
  INFO: "sev--info",
};

export function SeverityBadge({ severity, label, className = "" }) {
  if (!severity && !label) return null;
  const key = String(severity || "").toUpperCase();
  const variantClass = SEVERITY_VARIANT[key] || "sev--default";
  const text = label || severity;
  return (
    <span className={`gs-severity-badge ${variantClass} ${className}`}>
      {text}
    </span>
  );
}
