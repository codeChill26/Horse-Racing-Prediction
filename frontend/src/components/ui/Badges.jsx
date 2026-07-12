/**
 * Shared badge components for status, severity, and roles.
 * Dark-theme friendly. Use RoleBadge in tables, cards, and profile pages.
 */

import {
  ROLE_VARIANT,
  STATUS_VARIANT,
  SEVERITY_VARIANT,
  normalizeRoleCode,
  badgeRoleLabelVi,
} from "./badges.helpers";

export function RoleBadge({ role, label, className = "" }) {
  const code = normalizeRoleCode(role);
  const variantClass = ROLE_VARIANT[code] || "role--default";
  const text = label || badgeRoleLabelVi(code);
  if (!text) return null;
  return (
    <span className={`gs-role-badge ${variantClass} ${className}`}>
      {text}
    </span>
  );
}

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
