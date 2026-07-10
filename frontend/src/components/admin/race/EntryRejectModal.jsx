/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EntryRejectModal — Flow 2 (Admin từ chối RaceEntry, lý do bắt buộc)
 */

import { useEffect, useState } from "react";
import { XCircle, AlertTriangle, X } from "lucide-react";
import "./EntryRejectModal.css";

export default function EntryRejectModal({
  entry,
  busy = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setReason("");
    setLocalError("");
  }, [entry?.entryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setLocalError("Vui lòng nhập lý do từ chối");
      return;
    }
    setLocalError("");
    try {
      await onConfirm({ reason: trimmed });
    } catch (_err) {
      // parent sẽ truyền error qua prop
    }
  };

  if (!entry) return null;

  return (
    <div
      className="erm-backdrop"
      onClick={() => {
        if (!busy) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="erm-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="erm-modal__bar" />
        <header className="erm-modal__header">
          <div className="erm-modal__icon">
            <XCircle size={22} aria-hidden="true" />
          </div>
          <div className="erm-modal__heading">
            <h2 className="erm-modal__title">Từ chối đơn đăng ký</h2>
            <p className="erm-modal__subtitle">
              {entry.horseName || "—"}
              {entry.horseId ? ` · #${entry.horseId}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="erm-modal__close"
            onClick={() => onClose?.()}
            disabled={busy}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="erm-modal__body">
          <p className="erm-modal__desc">
            Entry sẽ chuyển sang trạng thái REJECTED. Lý do sẽ được lưu vào hồ sơ và gửi về
            cho chủ ngựa.
          </p>

          <label className="erm-modal__field">
            <span className="erm-modal__label">Lý do từ chối *</span>
            <textarea
              className="erm-modal__textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              autoFocus
              required
              disabled={busy}
              placeholder="VD: Ngựa chưa hoàn tất kiểm tra y tế / Giấy tờ không hợp lệ / Jockey đã confirm cho horse khác trong cùng race…"
            />
            <span className="erm-modal__counter">{reason.length}/500</span>
          </label>

          <p className="erm-modal__helper">
            <AlertTriangle size={13} />
            Chủ ngựa có thể tạo entry mới cho race khác sau khi bị từ chối.
          </p>

          {localError ? (
            <p className="erm-modal__alert" role="alert">
              {localError}
            </p>
          ) : null}
          {error ? (
            <p className="erm-modal__alert" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="erm-modal__footer">
          <button
            type="button"
            className="erm-btn erm-btn--ghost"
            onClick={() => onClose?.()}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="erm-btn erm-btn--err"
            disabled={busy || !reason.trim()}
          >
            {busy ? "Đang xử lý…" : "Xác nhận từ chối"}
          </button>
        </footer>
      </form>
    </div>
  );
}