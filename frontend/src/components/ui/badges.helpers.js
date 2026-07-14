/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Variant tables & helpers for shared badges.
 * Tách riêng để Badges.jsx chỉ export components (cho react-refresh).
 */

export const ROLE_VARIANT = {
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

export const STATUS_VARIANT = {
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

export const SEVERITY_VARIANT = {
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

export function normalizeRoleCode(role) {
  if (!role) return "";
  if (typeof role === "object") {
    return String(role.code || role.name || "").toUpperCase().replace(/\s+/g, "_");
  }
  return String(role).toUpperCase().replace(/\s+/g, "_");
}

export function badgeRoleLabelVi(code) {
  if (!code) return "—";
  return ROLE_LABELS[normalizeRoleCode(code)] || String(code);
}
