/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdminRaceDetailModals — Tập hợp 3 modal dùng trong AdminRaceDetailPage:
 *   1. ConfirmModal      — xác nhận hành động nhanh (open/close registration, publish,…)
 *   2. CancelReasonModal — nhập lý do cancel race
 *   3. RollbackReasonModal — nhập lý do + acknowledge khi rollback settlement (Flow 8)
 *
 * Thiết kế:
 *   - Cả 3 modal hỗ trợ `busy` để disable khi async đang chạy.
 *   - ESC đóng modal khi không busy.
 *   - Click overlay đóng (trừ khi busy).
 *   - `role="dialog"` + `aria-modal` + `aria-labelledby` (a11y WAI-ARIA dialog pattern).
 *   - `ConfirmModal` chỉ gọi `onClose()` SAU KHI `onConfirm()` resolve — tránh nuốt lỗi.
 */

import { useEffect, useId, useState } from "react";
import { AlertTriangle } from "lucide-react";

const REASON_MIN = 10;

function useEscapeKey(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

export function ModalShell({ children, onClose, busy, labelId, descId, className = "ard-confirm-modal" }) {
  useEscapeKey(true, () => {
    if (!busy) onClose();
  });
  return (
    <div className="ard-modal-overlay" onClick={() => !busy && onClose()}>
      <div
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmText,
  onConfirm,
  onClose,
  variant = "primary",
  busy = false,
}) {
  const baseId = useId();
  const id = `confirm-${baseId.replace(/:/g, "")}`;
  const messageContent =
    typeof message === "string" || message == null ? (
      <p id={`${id}-desc`} className="ard-confirm-modal__message">{message}</p>
    ) : (
      <div id={`${id}-desc`} className="ard-confirm-modal__message">{message}</div>
    );
  return (
    <ModalShell onClose={onClose} busy={busy} labelId={`${id}-title`} descId={`${id}-desc`}>
      <div className={`ard-confirm-modal__bar ard-confirm-modal__bar--${variant}`} />
      <div className="ard-confirm-modal__header">
        <AlertTriangle
          size={24}
          className={`ard-confirm-modal__icon ard-confirm-modal__icon--${variant}`}
        />
        <div>
          <h2 id={`${id}-title`} className="ard-confirm-modal__title">{title}</h2>
        </div>
      </div>
      <div className="ard-confirm-modal__body">{messageContent}</div>
      <div className="ard-confirm-modal__footer">
        <button
          type="button"
          className="ard-btn ard-btn--ghost"
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className={`ard-btn ard-btn--${variant}`}
          onClick={() => onConfirm()}
          disabled={busy}
        >
          {busy ? "Đang xử lý…" : confirmText}
        </button>
      </div>
    </ModalShell>
  );
}

export function CancelReasonModal({ raceName, onConfirm, onClose, busy = false }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const baseId = useId();
  const id = `cancel-${baseId.replace(/:/g, "")}`;
  useEscapeKey(true, () => {
    if (!busy) onClose();
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hủy chặng đua.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <ModalShell
      className="ard-reason-modal"
      onClose={onClose}
      busy={busy}
      labelId={`${id}-title`}
      descId={`${id}-desc`}
    >
      <div className="ard-reason-modal__bar" />
      <div className="ard-reason-modal__header">
        <AlertTriangle size={24} className="ard-reason-modal__icon" />
        <div>
          <h2 id={`${id}-title`} className="ard-reason-modal__title">Hủy chặng đua</h2>
          <p className="ard-reason-modal__subtitle">{raceName}</p>
        </div>
      </div>
      <div id={`${id}-desc`} className="ard-reason-modal__body">
        {error && <div className="ard-alert ard-alert--error">{error}</div>}
        <p className="ard-reason-modal__label">Lý do hủy chặng đua:</p>
        <textarea
          className="ard-reason-modal__textarea"
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError("");
          }}
          placeholder="Nhập lý do hủy chặng đua..."
          disabled={busy}
          aria-label="Lý do hủy"
        />
      </div>
      <div className="ard-reason-modal__footer">
        <button
          type="button"
          className="ard-btn ard-btn--ghost"
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="ard-btn ard-btn--danger"
          onClick={handleSubmit}
          disabled={busy}
        >
          {busy ? "Đang hủy…" : "Xác nhận hủy"}
        </button>
      </div>
    </ModalShell>
  );
}

export function RollbackReasonModal({ raceName, onConfirm, onClose, busy = false }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const baseId = useId();
  const id = `rollback-${baseId.replace(/:/g, "")}`;
  useEscapeKey(true, () => {
    if (!busy) onClose();
  });

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do rollback (audit log).");
      return;
    }
    if (trimmed.length < REASON_MIN) {
      setError(`Lý do phải có ít nhất ${REASON_MIN} ký tự để đảm bảo traceability.`);
      return;
    }
    if (!acknowledge) {
      setError(
        "Vui lòng xác nhận bạn hiểu rủi ro rollback (có thể khiến spectator bị âm ví)."
      );
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <ModalShell
      className="ard-reason-modal"
      onClose={onClose}
      busy={busy}
      labelId={`${id}-title`}
      descId={`${id}-desc`}
    >
      <div className="ard-reason-modal__bar ard-reason-modal__bar--warn" />
      <div className="ard-reason-modal__header">
        <AlertTriangle
          size={24}
          className="ard-reason-modal__icon ard-reason-modal__icon--warn"
        />
        <div>
          <h2 id={`${id}-title`} className="ard-reason-modal__title">
            Rollback settlement
          </h2>
          <p className="ard-reason-modal__subtitle">{raceName}</p>
        </div>
      </div>
      <div id={`${id}-desc`} className="ard-reason-modal__body">
        <div className="ard-alert ard-alert--warn" role="alert" style={{ marginBottom: "1rem" }}>
          <strong>⚠ Cảnh báo:</strong> Rollback sẽ thu hồi tiền thưởng đã trả cho
          spectators, hoàn tác house margin &amp; treasure pool, và đưa tất cả bets
          về <code>PENDING</code>. Spectator đã tiêu xài có thể bị số dư ví{" "}
          <strong>âm</strong>. Hành động này không thể hoàn tác tự động.
        </div>
        {error && <div className="ard-alert ard-alert--error">{error}</div>}
        <p className="ard-reason-modal__label">Lý do rollback (lưu audit log):</p>
        <textarea
          className="ard-reason-modal__textarea"
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError("");
          }}
          placeholder="Ví dụ: Phát hiện sai lệch kết quả do nhầm lẫn referee..."
          disabled={busy}
          aria-label="Lý do rollback"
        />
        <label className="ard-reason-modal__check">
          <input
            type="checkbox"
            checked={acknowledge}
            onChange={(e) => {
              setAcknowledge(e.target.checked);
              if (error) setError("");
            }}
            disabled={busy}
          />
          Tôi hiểu rủi ro và xác nhận muốn rollback settlement cho race này.
        </label>
      </div>
      <div className="ard-reason-modal__footer">
        <button
          type="button"
          className="ard-btn ard-btn--ghost"
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="ard-btn ard-btn--warn"
          onClick={handleSubmit}
          disabled={busy}
        >
          {busy ? "Đang rollback…" : "Xác nhận Rollback"}
        </button>
      </div>
    </ModalShell>
  );
}
