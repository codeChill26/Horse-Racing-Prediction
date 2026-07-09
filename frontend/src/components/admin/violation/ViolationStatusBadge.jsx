/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ViolationStatusBadge Component
 *
 * Hiển thị badge trạng thái cho violation với màu sắc phù hợp.
 */

import React from "react";

const STATUS_CONFIG = {
  OPEN: {
    label: "Mở",
    className: "vio-status-badge--open",
  },
  REVIEWING: {
    label: "Đang xem xét",
    className: "vio-status-badge--reviewing",
  },
  RESOLVED: {
    label: "Đã xử lý",
    className: "vio-status-badge--resolved",
  },
  DISMISSED: {
    label: "Bỏ qua",
    className: "vio-status-badge--dismissed",
  },
};

export function ViolationStatusBadge({ status, className = "" }) {
  if (!status) return null;

  const key = String(status).toUpperCase();
  const config = STATUS_CONFIG[key] || {
    label: status,
    className: "vio-status-badge--default",
  };

  return (
    <span className={`vio-status-badge ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

export default ViolationStatusBadge;
