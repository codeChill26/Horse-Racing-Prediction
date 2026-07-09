/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DeviationActionModal Component
 *
 * Modal cho actions: Resolve / Reject deviation.
 */

import React, { useState } from "react";
import { X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function DeviationActionModal({
  deviation,
  actionType, // "RESOLVED" | "REJECTED"
  onSubmit,
  onClose,
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isResolve = actionType === "RESOLVED";
  const title = isResolve ? "Xác nhận xử lý sai lệch" : "Bác bỏ sai lệch";
  const icon = isResolve ? <CheckCircle2 size={20} /> : <XCircle size={20} />;
  const iconClass = isResolve ? "dev-action-icon--ok" : "dev-action-icon--err";
  const btnClass = isResolve ? "dev-action-btn--ok" : "dev-action-btn--err";
  const btnText = isResolve ? "Xác nhận xử lý" : "Bác bỏ";
  const requireNote = isResolve ? false : true;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (requireNote && !note.trim()) {
      setError("Cần nhập lý do bác bỏ.");
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
    <div className="dev-modal-overlay" onClick={onClose}>
      <div className="dev-action-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dev-action-modal__header">
          <div className={`dev-action-icon ${iconClass}`}>{icon}</div>
          <div className="dev-action-modal__title-wrap">
            <h2 className="dev-action-modal__title">{title}</h2>
            <p className="dev-action-modal__subtitle">
              {deviation.id} — {deviation.type}
            </p>
          </div>
          <button type="button" className="dev-action-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form id="dev-action-form" onSubmit={handleSubmit}>
          <div className="dev-action-modal__body">
            {error && (
              <div className="dev-action-alert dev-action-alert--error">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="dev-action-field">
              <label className="dev-action-field__label">
                Ghi chú xử lý
                {requireNote && <span className="dev-action-field__required">*</span>}
              </label>
              <textarea
                className="dev-action-field__textarea"
                rows={4}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError("");
                }}
                placeholder={
                  isResolve
                    ? "Nhập ghi chú xử lý (không bắt buộc)..."
                    : "Nhập lý do bác bỏ (bắt buộc)..."
                }
                required={requireNote}
              />
              <span className="dev-action-field__hint">
                {isResolve
                  ? "Có thể nhập ghi chú để ghi lại cách xử lý."
                  : "Cần nhập lý do bác bỏ để lưu vết kiểm toán."}
              </span>
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
              disabled={submitting}
            >
              {submitting ? (
                <span className="dev-action-spinner" />
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
