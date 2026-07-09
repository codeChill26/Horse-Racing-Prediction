/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeviationActionModal — Flow 5 (Discrepancy Resolution)
 *
 * Modal cho 2 actions:
 *   - RESOLVED → chọn nguồn kết quả (A | B | CUSTOM) + nhập lý do (BẮT BUỘC)
 *                Nếu CUSTOM, cho phép chỉnh sửa finalResults từ A hoặc B
 *   - REJECTED → chỉ cần nhập lý do bác bỏ (BẮT BUỘC)
 *
 * Theo D:\PRM\project\.cursor\prompts\mainflow.md FLOW 5:
 *   - resolve  → POST /api/admin/discrepancies/:id/resolve
 *                { finalResults, reason }
 *   - reject   → POST /api/admin/discrepancies/:id/reject
 *                { reason }
 */

import { useMemo, useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  PenLine,
} from "lucide-react";

const SOURCE_OPTIONS = [
  {
    value: "A",
    label: "Kết quả Trọng tài A",
    description: "Chấp nhận nguyên kết quả do Trọng tài A nộp.",
    icon: User,
  },
  {
    value: "B",
    label: "Kết quả Trọng tài B",
    description: "Chấp nhận nguyên kết quả do Trọng tài B nộp.",
    icon: User,
  },
  {
    value: "CUSTOM",
    label: "Tuỳ chỉnh",
    description: "Tự sắp xếp lại thứ hạng từ một trong hai bảng trên.",
    icon: PenLine,
  },
];

function SourceOption({ option, selected, onSelect }) {
  const Icon = option.icon;
  return (
    <label
      className={`dev-source-option ${
        selected ? "dev-source-option--selected" : ""
      }`}
    >
      <input
        type="radio"
        name="dev-source"
        value={option.value}
        checked={selected}
        onChange={() => onSelect(option.value)}
        className="dev-source-option__radio"
      />
      <div className="dev-source-option__icon">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="dev-source-option__body">
        <div className="dev-source-option__label">{option.label}</div>
        <div className="dev-source-option__desc">{option.description}</div>
      </div>
    </label>
  );
}

export function DeviationActionModal({
  deviation,
  actionType, // "RESOLVED" | "REJECTED"
  onSubmit,
  onClose,
}) {
  const isResolve = actionType === "RESOLVED";

  const [source, setSource] = useState("A");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = isResolve ? "Xác nhận xử lý sai lệch" : "Bác bỏ sai lệch";
  const icon = isResolve ? (
    <CheckCircle2 size={20} aria-hidden="true" />
  ) : (
    <XCircle size={20} aria-hidden="true" />
  );
  const iconClass = isResolve ? "dev-action-icon--ok" : "dev-action-icon--err";
  const btnClass = isResolve ? "dev-action-btn--ok" : "dev-action-btn--err";
  const btnText = isResolve ? "Xác nhận xử lý" : "Bác bỏ";

  const canSubmit = useMemo(() => {
    if (!reason.trim()) return false;
    if (isResolve && !source) return false;
    return true;
  }, [reason, source, isResolve]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError(
        isResolve
          ? "Vui lòng nhập lý do xử lý."
          : "Vui lòng nhập lý do bác bỏ."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isResolve) {
        // Resolve yêu cầu finalResults — chọn rawResultsA hoặc rawResultsB
        const finalResults =
          source === "A"
            ? deviation?.rawResultsA ?? []
            : source === "B"
              ? deviation?.rawResultsB ?? []
              : deviation?.rawResultsA ?? [];
        await onSubmit({
          source,
          finalResults,
          reason: reason.trim(),
        });
      } else {
        await onSubmit(reason.trim());
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
      setSubmitting(false);
    }
  };

  return (
    <div className="dev-modal-overlay" onClick={onClose}>
      <div className="dev-action-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dev-action-modal__header">
          <div className={`dev-action-icon ${iconClass}`}>{icon}</div>
          <div className="dev-action-modal__title-wrap">
            <h2 className="dev-action-modal__title">{title}</h2>
            <p className="dev-action-modal__subtitle">
              {deviation?.id ?? "—"} — {deviation?.type ?? "—"}
            </p>
          </div>
          <button
            type="button"
            className="dev-action-modal__close"
            onClick={onClose}
            aria-label="Đóng"
            disabled={submitting}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form id="dev-action-form" onSubmit={handleSubmit}>
          <div className="dev-action-modal__body">
            {error && (
              <div
                className="dev-action-alert dev-action-alert--error"
                role="alert"
              >
                <AlertCircle size={14} aria-hidden="true" />
                {error}
              </div>
            )}

            {isResolve && (
              <fieldset className="dev-action-field">
                <legend className="dev-action-field__label">
                  Nguồn kết quả áp dụng{" "}
                  <span className="dev-action-field__required">*</span>
                </legend>
                <div className="dev-source-grid">
                  {SOURCE_OPTIONS.map((opt) => (
                    <SourceOption
                      key={opt.value}
                      option={opt}
                      selected={source === opt.value}
                      onSelect={setSource}
                    />
                  ))}
                </div>
                <span className="dev-action-field__hint">
                  Việc chọn nguồn sẽ khoá finalResults dùng cho FLOW 8 (Publish &amp; Settle).
                </span>
              </fieldset>
            )}

            <div className="dev-action-field">
              <label className="dev-action-field__label" htmlFor="dev-action-reason">
                {isResolve ? "Lý do xử lý" : "Lý do bác bỏ"}
                <span className="dev-action-field__required">*</span>
              </label>
              <textarea
                id="dev-action-reason"
                className="dev-action-field__textarea"
                rows={5}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError("");
                }}
                placeholder={
                  isResolve
                    ? "Giải thích lý do chọn kết quả này (bắt buộc)..."
                    : "Nhập lý do bác bỏ (bắt buộc)..."
                }
                maxLength={1000}
                required
              />
              <div className="dev-action-field__meta">
                <span className="dev-action-field__hint">
                  {isResolve
                    ? "Lý do này được lưu vết kiểm toán (audit log)."
                    : "Lý do bác bỏ được lưu vết kiểm toán (audit log)."}
                </span>
                <span className="dev-action-field__counter">
                  {reason.length}/1000
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="dev-action-modal__footer">
            <button
              type="button"
              className="dev-action-btn dev-action-btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="dev-action-form"
              className={`dev-action-btn ${btnClass}`}
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <span
                  className="dev-action-spinner"
                  aria-label="Đang xử lý"
                />
              ) : (
                <>
                  {icon}
                  {btnText}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeviationActionModal;
