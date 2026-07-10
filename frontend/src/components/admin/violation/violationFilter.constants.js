/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Constants for ViolationFilter — tách riêng để file .jsx chỉ export component.
 */

export const VIOLATION_STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "OPEN", label: "Mở" },
  { value: "REVIEWING", label: "Đang xem xét" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "DISMISSED", label: "Bỏ qua" },
];

export const VIOLATION_SEVERITY_OPTIONS = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "WARNING", label: "Cảnh báo" },
  { value: "MINOR", label: "Nhẹ" },
  { value: "MAJOR", label: "Nặng" },
  { value: "SEVERE", label: "Nghiêm trọng" },
  { value: "CRITICAL", label: "Cực kỳ nghiêm trọng" },
];
