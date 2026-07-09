/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DeviationFilter Component
 *
 * Component chứa các bộ lọc: search, status, severity.
 */

import React from "react";
import { Search, RefreshCw } from "lucide-react";

export const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "REVIEWING", label: "Đang xem xét" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "REJECTED", label: "Bị bác bỏ" },
];

export const SEVERITY_OPTIONS = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "LOW", label: "Thấp" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HIGH", label: "Cao" },
  { value: "CRITICAL", label: "Nghiêm trọng" },
];

export function DeviationFilter({
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
    <div className="dev-filter">
      <div className="dev-filter__search-wrap">
        <Search className="dev-filter__search-icon" size={14} />
        <input
          className="dev-filter__search"
          type="search"
          placeholder="Tìm theo mã, loại, chặng, người báo cáo..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="dev-filter__select"
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
        className="dev-filter__select"
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
        className="dev-filter__btn dev-filter__btn--ghost"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw size={14} className={loading ? "dev-filter__spin" : ""} />
        Làm mới
      </button>
    </div>
  );
}

export default DeviationFilter;
