/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DeviationStatusBadge Component
 *
 * Hiển thị badge trạng thái cho deviation với màu sắc phù hợp.
 */

import React from "react";

const STATUS_CONFIG = {
  PENDING: {
    label: "Chờ xử lý",
    className: "dev-status-badge--pending",
  },
  REVIEWING: {
    label: "Đang xem xét",
    className: "dev-status-badge--reviewing",
  },
  RESOLVED: {
    label: "Đã xử lý",
    className: "dev-status-badge--resolved",
  },
  REJECTED: {
    label: "Bị bác bỏ",
    className: "dev-status-badge--rejected",
  },
};

export function DeviationStatusBadge({ status, className = "" }) {
  if (!status) return null;

  const key = String(status).toUpperCase();
  const config = STATUS_CONFIG[key] || {
    label: status,
    className: "dev-status-badge--default",
  };

  return (
    <span className={`dev-status-badge ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

export default DeviationStatusBadge;
