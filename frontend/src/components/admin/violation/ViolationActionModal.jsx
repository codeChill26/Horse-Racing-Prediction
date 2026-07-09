/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ViolationActionModal Component
 *
 * Modal cho actions: Resolve / Dismiss violation.
 */

import React, { useState } from "react";
import { X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function ViolationActionModal({
  violation,
  actionType, // "RESOLVED" | "DISMISSED"
  onSubmit,
  onClose,
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isResolve = actionType === "RESOLVED";
  const title = isResolve ? "Xác nhận xử lý vi phạm" : "Bỏ qua vi phạm";
  const icon = isResolve ? <CheckCircle2 size={20} /> : <XCircle size={20} />;
  const iconClass = isResolve ? "vio-action-icon--ok" : "vio-action-icon--err";
  const btnClass = isResolve ? "vio-action-btn--ok" : "vio-action-btn--err";
  const btnText = isResolve ? "Xác nhận xử lý" : "Bỏ qua";
  const requireNote = true;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!note.trim()) {
      setError(isResolve ? "Vui lòng nhập biên bản xử lý." : "Vui lòng nhập lý do bỏ qua.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSubmit(note.trim());
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
      setSubmitting(false);
    }
  };

  return (
    <div className="vio-modal-overlay" onClick={onClose}>
      <div className="vio-action-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vio-action-modal__header">
          <div className={`vio-action-icon ${iconClass}`}>{icon}</div>
          <div className="vio-action-modal__title-wrap">
            <h2 className="vio-action-modal__title">{title}</h2>
            <p className="vio-action-modal__subtitle">
              {violation.id} — {violation.subject}
            </p>
          </div>
          <button type="button" className="vio-action-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form id="vio-action-form" onSubmit={handleSubmit}>
          <div className="vio-action-modal__body">
            {error && (
              <div className="vio-action-alert vio-action-alert--error">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="vio-action-field">
              <label className="vio-action-field__label">
                {isResolve ? "Biên bản xử lý" : "Lý do bỏ qua"}
                <span className="vio-action-field__required">*</span>
              </label>
              <textarea
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
                required
              />
              <span className="vio-action-field__hint">
                {isResolve
                  ? "Mô tả chi tiết cách xử lý vi phạm này."
                  : "Giải thích lý do bỏ qua vi phạm này để lưu vết kiểm toán."}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="vio-action-modal__footer">
            <button
              type="button"
              className="vio-action-btn vio-action-btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="vio-action-form"
              className={`vio-action-btn ${btnClass}`}
              disabled={submitting}
            >
              {submitting ? (
                <span className="vio-action-spinner" />
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
