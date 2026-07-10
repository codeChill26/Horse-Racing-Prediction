/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal nhập lý do cho các action:
 *  - REJECT  (admin duyệt hồ sơ → từ chối) — mainflow.md FLOW 1
 *  - REVOKE  (admin thu hồi ngựa APPROVED → INACTIVE)
 *
 * Modal này dùng chung cho cả 2 action, phân biệt bằng prop `mode`.
 *
 * Props:
 *  - mode: 'reject' | 'revoke'
 *  - horse: object ngựa đang thao tác
 *  - busy: boolean
 *  - onClose()
 *  - onConfirm({ reason }) — promise-returning callback; resolve khi thành công
 */

import { useEffect, useState } from "react";
import { AlertTriangle, X, Ban, ShieldOff } from "lucide-react";
import "./HorseActionModal.css";

const COPY = {
  reject: {
    icon: Ban,
    title: "Từ chối hồ sơ ngựa",
    subtitle: "Ngựa sẽ không được phép tham gia giải đấu.",
    accent: "err",
    confirmText: "Xác nhận từ chối",
    reasonLabel: "Lý do từ chối",
    reasonPlaceholder:
      "VD: Giấy tờ không hợp lệ / Thiếu thông tin bắt buộc / Nghi ngờ giả mạo...",
    helper:
      "Lý do sẽ được lưu vào hồ sơ ngựa và gửi về cho chủ ngựa qua notification.",
  },
  revoke: {
    icon: ShieldOff,
    title: "Thu hồi ngựa",
    subtitle:
      "Ngựa sẽ chuyển sang trạng thái INACTIVE. Hệ thống sẽ tự động hủy các RaceEntry PENDING và JockeyInvitation liên quan.",
    accent: "warn",
    confirmText: "Xác nhận thu hồi",
    reasonLabel: "Lý do thu hồi",
    reasonPlaceholder:
      "VD: Phát hiện giấy tờ giả / Vi phạm quy chế / Chủ ngựa yêu cầu...",
    helper:
      "Hành động này không thể hoàn tác. Ngựa sẽ bị loại khỏi mọi giải đua đang tham gia.",
  },
};

export default function HorseActionModal({
  mode = "reject",
  horse,
  busy = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const copy = COPY[mode] || COPY.reject;
  const Icon = copy.icon;

  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setReason("");
    setLocalError("");
  }, [mode, horse?.horseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setLocalError("Vui lòng nhập lý do");
      return;
    }
    setLocalError("");
    try {
      await onConfirm({ reason: trimmed });
    } catch (_err) {
      // Page sẽ hiển thị error từ prop `error`
    }
  };

  return (
    <div
      className="ham-backdrop"
      onClick={() => {
        if (!busy) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="ham-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ham-title"
      >
        <div className={`ham-modal__bar ham-modal__bar--${copy.accent}`} />
        <header className="ham-modal__header">
          <div className={`ham-modal__icon ham-modal__icon--${copy.accent}`}>
            <Icon size={22} aria-hidden="true" />
          </div>
          <div className="ham-modal__heading">
            <h2 id="ham-title" className="ham-modal__title">
              {copy.title}
            </h2>
            <p className="ham-modal__subtitle">
              {horse?.name || "Ngựa"}
              {horse?.horseId ? ` · #${horse.horseId}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="ham-modal__close"
            onClick={() => onClose?.()}
            aria-label="Đóng"
            disabled={busy}
          >
            <X size={16} />
          </button>
        </header>

        <div className="ham-modal__body">
          <p className="ham-modal__desc">{copy.subtitle}</p>

          <label className="ham-modal__field">
            <span className="ham-modal__label">{copy.reasonLabel} *</span>
            <textarea
              className="ham-modal__textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={copy.reasonPlaceholder}
              rows={4}
              disabled={busy}
              maxLength={500}
              autoFocus
              required
            />
            <span className="ham-modal__counter">{reason.length}/500</span>
          </label>

          <p className="ham-modal__helper">
            <AlertTriangle size={13} aria-hidden="true" />
            {copy.helper}
          </p>

          {localError ? (
            <p className="ham-modal__alert ham-modal__alert--err" role="alert">
              {localError}
            </p>
          ) : null}
          {error ? (
            <p className="ham-modal__alert ham-modal__alert--err" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="ham-modal__footer">
          <button
            type="button"
            className="ham-btn ham-btn--ghost"
            onClick={() => onClose?.()}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={`ham-btn ham-btn--${copy.accent}`}
            disabled={busy || !reason.trim()}
          >
            {busy ? "Đang xử lý…" : copy.confirmText}
          </button>
        </footer>
      </form>
    </div>
  );
}