/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Constants for DeviationFilter — tách riêng để file .jsx chỉ export component.
 */

export const DEVIATION_STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "REVIEWING", label: "Đang xem xét" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "REJECTED", label: "Bị bác bỏ" },
];

export const DEVIATION_SEVERITY_OPTIONS = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "LOW", label: "Thấp" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HIGH", label: "Cao" },
  { value: "CRITICAL", label: "Nghiêm trọng" },
];
