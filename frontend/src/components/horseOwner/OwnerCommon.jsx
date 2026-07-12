/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reusable UI components cho các trang Horse Owner.
 */

import { Plus, RefreshCcw } from "lucide-react";
import "./OwnerCommon.css";

/* ====================== PAGE HEADER ====================== */
export function OwnerPageHeader({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  onRefresh,
  refreshing,
}) {
  return (
    <header className="oh-page-header">
      <div className="oh-page-header__main">
        {eyebrow ? <p className="oh-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="oh-page-header__title">{title}</h1>
        {subtitle ? <p className="oh-page-header__subtitle">{subtitle}</p> : null}
      </div>
      <div className="oh-page-header__actions">
        {primaryAction}
        {secondaryAction}
        {onRefresh ? (
          <button
            type="button"
            className="oh-btn oh-btn--ghost"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCcw size={14} /> {refreshing ? "Đang tải…" : "Làm mới"}
          </button>
        ) : null}
      </div>
    </header>
  )
}

/* ====================== TOOLBAR (search + filter) ====================== */
export function OwnerToolbar({ children }) {
  return <div className="oh-toolbar">{children}</div>
}

export function OwnerSearchInput({ value, onChange, placeholder = "Tìm kiếm…" }) {
  return (
    <input
      type="search"
      className="oh-search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

export function OwnerFilterSelect({ value, onChange, options, label = "Lọc" }) {
  return (
    <label className="oh-filter">
      <span className="oh-filter__label">{label}</span>
      <select
        className="oh-filter__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/* ====================== PRIMARY BUTTON ====================== */
export function OwnerPrimaryButton({ icon: Icon = Plus, children, ...rest }) {
  return (
    <button type="button" className="oh-btn oh-btn--primary" {...rest}>
      <Icon size={14} />
      {children}
    </button>
  )
}

/* ====================== GHOST BUTTON ====================== */
export function OwnerGhostButton({ icon: Icon, children, ...rest }) {
  return (
    <button type="button" className="oh-btn oh-btn--ghost" {...rest}>
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  )
}

/* ====================== ALERT (error) ====================== */
export function OwnerErrorAlert({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="oh-alert oh-alert--error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="oh-btn oh-btn--ghost oh-btn--sm" onClick={onRetry}>
          <RefreshCcw size={12} /> Thử lại
        </button>
      ) : null}
    </div>
  )
}
