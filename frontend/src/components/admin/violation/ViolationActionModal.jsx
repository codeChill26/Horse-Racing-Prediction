/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ViolationActionModal Component
 *
 * Modal cho 2 actions:
 *   - RESOLVED  → form có thêm chọn penalty (DQ / DEDUCT_POINTS / WARNING)
 *                 + nhập biên bản xử lý (note)
 *   - DISMISSED → form chỉ cần nhập lý do bỏ qua (reason)
 *
 * Theo D:\PRM\project\.cursor\prompts\mainflow.md FLOW 6:
 *   - resolve  → POST /api/admin/violations/:id/resolve  { penalty, note }
 *   - dismiss  → POST /api/admin/violations/:id/dismiss  { reason }
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Gavel,
  Coins,
  AlertTriangle,
} from "lucide-react";
import "./ViolationActionModal.css";

const PENALTY_OPTIONS = [
  {
    value: "WARNING",
    label: "Cảnh báo",
    description: "Chỉ ghi nhận, không áp dụng hình phạt.",
    icon: AlertTriangle,
  },
  {
    value: "DEDUCT_POINTS",
    label: "Trừ điểm",
    description:
      "Trừ điểm ví của jockey/owner theo mức độ vi phạm (BE tính tự động).",
    icon: Coins,
  },
  {
    value: "DQ",
    label: "Loại khỏi chặng (DQ)",
    description: "Entry bị loại, không thể thắng trong chặng đua này.",
    icon: Gavel,
  },
];

function PenaltyOption({ option, selected, onSelect }) {
  const Icon = option.icon;
  return (
    <label
      className={`vio-penalty-option ${
        selected ? "vio-penalty-option--selected" : ""
      }`}
    >
      <input
        type="radio"
        name="vio-penalty"
        value={option.value}
        checked={selected}
        onChange={() => onSelect(option.value)}
        className="vio-penalty-option__radio"
      />
      <div className="vio-penalty-option__icon">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="vio-penalty-option__body">
        <div className="vio-penalty-option__label">{option.label}</div>
        <div className="vio-penalty-option__desc">{option.description}</div>
      </div>
    </label>
  );
}

export function ViolationActionModal({
  violation,
  actionType, // "RESOLVED" | "DISMISSED"
  busy = false,
  onSubmit,
  onClose,
}) {
  const isResolve = actionType === "RESOLVED";
  const cancelRef = useRef(null);
  const dialogId = useMemo(
    () => `vio-action-${actionType?.toLowerCase() ?? "default"}`,
    [actionType]
  );
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;

  const [note, setNote] = useState("");
  const [penalty, setPenalty] = useState("WARNING");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A11y: focus close button khi modal mở; ESC để đóng
  useEffect(() => {
    if (cancelRef.current) cancelRef.current.focus();
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && !submitting && !busy) onClose?.();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [submitting, busy, onClose]);

  const title = isResolve ? "Xác nhận xử lý vi phạm" : "Bỏ qua vi phạm";
  const icon = isResolve ? (
    <CheckCircle2 size={20} aria-hidden="true" />
  ) : (
    <XCircle size={20} aria-hidden="true" />
  );
  const iconClass = isResolve ? "vio-action-icon--ok" : "vio-action-icon--err";
  const btnClass = isResolve ? "vio-action-btn--ok" : "vio-action-btn--err";
  const btnText = isResolve ? "Xác nhận xử lý" : "Bỏ qua";

  const canSubmit = useMemo(() => {
    if (!note.trim()) return false;
    if (isResolve && !penalty) return false;
    return true;
  }, [note, penalty, isResolve]);

  const effectiveBusy = submitting || busy;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!note.trim()) {
      setError(
        isResolve
          ? "Vui lòng nhập biên bản xử lý."
          : "Vui lòng nhập lý do bỏ qua."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isResolve) {
        await onSubmit({
          penalty,
          note: note.trim(),
        });
      } else {
        await onSubmit(note.trim());
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="vio-modal-overlay"
      onClick={() => {
        if (!effectiveBusy) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="vio-action-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Header */}
        <div className="vio-action-modal__header">
          <div className={`vio-action-icon ${iconClass}`}>{icon}</div>
          <div className="vio-action-modal__title-wrap">
            <h2 id={titleId} className="vio-action-modal__title">
              {title}
            </h2>
            <p id={descId} className="vio-action-modal__subtitle">
              {violation?.id ?? "—"} — {violation?.subject ?? "—"}
            </p>
          </div>
          <button
            ref={cancelRef}
            type="button"
            className="vio-action-modal__close"
            onClick={onClose}
            aria-label="Đóng"
            disabled={effectiveBusy}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form id={`${dialogId}-form`} onSubmit={handleSubmit}>
          <div className="vio-action-modal__body">
            {error && (
              <div className="vio-action-alert vio-action-alert--error" role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                {error}
              </div>
            )}

            {isResolve && (
              <fieldset className="vio-action-field">
                <legend className="vio-action-field__label">
                  Loại hình phạt <span className="vio-action-field__required">*</span>
                </legend>
                <div className="vio-penalty-grid">
                  {PENALTY_OPTIONS.map((opt) => (
                    <PenaltyOption
                      key={opt.value}
                      option={opt}
                      selected={penalty === opt.value}
                      onSelect={setPenalty}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            <div className="vio-action-field">
              <label className="vio-action-field__label" htmlFor="vio-action-note">
                {isResolve ? "Biên bản xử lý" : "Lý do bỏ qua"}
                <span className="vio-action-field__required">*</span>
              </label>
              <textarea
                id="vio-action-note"
                className="vio-action-field__textarea"
                rows={5}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError("");
                }}
                placeholder={
                  isResolve
                    ? "Nhập biên bản xử lý vi phạm (bắt buộc)..."
                    : "Nhập lý do bỏ qua vi phạm (bắt buộc)..."
                }
                maxLength={1000}
                required
              />
              <div className="vio-action-field__meta">
                <span className="vio-action-field__hint">
                  {isResolve
                    ? "Mô tả chi tiết cách xử lý vi phạm này."
                    : "Giải thích lý do bỏ qua vi phạm này để lưu vết kiểm toán."}
                </span>
                <span className="vio-action-field__counter">{note.length}/1000</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="vio-action-modal__footer">
            <button
              type="button"
              className="vio-action-btn vio-action-btn--ghost"
              onClick={onClose}
              disabled={effectiveBusy}
            >
              Hủy
            </button>
            <button
              type="submit"
              form={`${dialogId}-form`}
              className={`vio-action-btn ${btnClass}`}
              disabled={effectiveBusy || !canSubmit}
            >
              {submitting ? (
                <span className="vio-action-spinner" aria-label="Đang xử lý" />
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

export default ViolationActionModal;
