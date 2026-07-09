/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DeviationFilter Component
 *
 * Component chứa các bộ lọc: search, status, severity.
 */

import { Search, RefreshCw } from "lucide-react";
import {
  DEVIATION_STATUS_OPTIONS,
  DEVIATION_SEVERITY_OPTIONS,
} from "./deviationFilter.constants";

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
        {DEVIATION_SEVERITY_OPTIONS.map((opt) => (
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
        {DEVIATION_STATUS_OPTIONS.map((opt) => (
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
