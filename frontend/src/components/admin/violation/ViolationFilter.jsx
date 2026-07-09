/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ViolationFilter Component
 *
 * Component chứa các bộ lọc: search, status, severity.
 */

import React from "react";
import { Search, RefreshCw } from "lucide-react";

export const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "OPEN", label: "Mở" },
  { value: "REVIEWING", label: "Đang xem xét" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "DISMISSED", label: "Bỏ qua" },
];

export const SEVERITY_OPTIONS = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "WARNING", label: "Cảnh báo" },
  { value: "MINOR", label: "Nhẹ" },
  { value: "MAJOR", label: "Nặng" },
  { value: "SEVERE", label: "Nghiêm trọng" },
];

export function ViolationFilter({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  severityFilter,
  onSeverityChange,
  onRefresh,
  loading = false,
}) {
  return (
    <div className="vio-filter">
      <div className="vio-filter__search-wrap">
        <Search className="vio-filter__search-icon" size={14} />
        <input
          className="vio-filter__search"
          type="search"
          placeholder="Tìm theo mã, đối tượng, loại vi phạm..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="vio-filter__select"
        value={severityFilter}
        onChange={(e) => onSeverityChange(e.target.value)}
      >
        {SEVERITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className="vio-filter__select"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="vio-filter__btn vio-filter__btn--ghost"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw size={14} className={loading ? "vio-filter__spin" : ""} />
        Làm mới
      </button>
    </div>
  );
}

export default ViolationFilter;
