/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ViolationFilter Component
 *
 * Component chứa các bộ lọc: search, status, severity.
 */

import { Search, RefreshCw } from "lucide-react";
import {
  VIOLATION_STATUS_OPTIONS,
  VIOLATION_SEVERITY_OPTIONS,
} from "./violationFilter.constants";

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
        <label htmlFor="vio-search" className="sr-only">
          Tìm kiếm vi phạm
        </label>
        <Search
          className="vio-filter__search-icon"
          size={14}
          aria-hidden="true"
        />
        <input
          id="vio-search"
          className="vio-filter__search"
          type="search"
          placeholder="Tìm theo mã, đối tượng, loại vi phạm..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Tìm kiếm vi phạm"
        />
      </div>

      <label htmlFor="vio-severity" className="sr-only">
        Lọc theo mức độ
      </label>
      <select
        id="vio-severity"
        className="vio-filter__select"
        value={severityFilter}
        onChange={(e) => onSeverityChange(e.target.value)}
        aria-label="Lọc theo mức độ vi phạm"
      >
        {VIOLATION_SEVERITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label htmlFor="vio-status" className="sr-only">
        Lọc theo trạng thái
      </label>
      <select
        id="vio-status"
        className="vio-filter__select"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Lọc theo trạng thái vi phạm"
      >
        {VIOLATION_STATUS_OPTIONS.map((opt) => (
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
        aria-label="Làm mới danh sách vi phạm"
      >
        <RefreshCw size={14} className={loading ? "vio-filter__spin" : ""} aria-hidden="true" />
        Làm mới
      </button>
    </div>
  );
}

export default ViolationFilter;
