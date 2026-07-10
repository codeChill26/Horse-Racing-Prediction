/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TournamentCancelModal — modal nhập lý do khi huỷ/xoá tournament.
 *
 * Mode:
 *  - 'status': huỷ giải đấu (chuyển status → CANCELLED, bắt buộc reason)
 *  - 'delete': xoá giải đấu — nếu có chặng đua thì server sẽ tự cancel
 *              và bắt buộc reason
 */

import { useEffect, useState } from "react";
import { X, XCircle, AlertTriangle } from "lucide-react";
import "./TournamentCancelModal.css";

export default function TournamentCancelModal({
  tournament,
  mode = "status",
  targetStatus = "CANCELLED",
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
  }, [tournament?.tournamentId, mode]);

  if (!tournament) return null;

  const hasRaces = (tournament._count?.races ?? 0) > 0;
  const requireReason = mode === "status" || (mode === "delete" && hasRaces);
  const title = mode === "delete"
    ? "Xoá/huỷ giải đấu"
    : `Đổi trạng thái → ${targetStatus}`;
  const description = mode === "status"
    ? `Bạn sắp chuyển giải "${tournament.name}" sang trạng thái CANCELLED. Vui lòng nhập lý do.`
    : (hasRaces
        ? `Giải "${tournament.name}" đã có chặng đua — hệ thống sẽ HỦY thay vì xoá. Lý do là bắt buộc.`
        : `Bạn sắp xoá giải "${tournament.name}". Có thể bỏ trống lý do nếu chưa có chặng đua.`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (requireReason && !trimmed) {
      setLocalError("Vui lòng nhập lý do");
      return;
    }
    setLocalError("");
    try {
      await onConfirm({ reason: trimmed });
    } catch (_err) {
      // parent xử lý
    }
  };

  return (
    <div
      className="tcm-backdrop"
      onClick={() => {
        if (!busy) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="tcm-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="tcm-modal__bar" />
        <header className="tcm-modal__header">
          <div className="tcm-modal__icon">
            <XCircle size={22} aria-hidden="true" />
          </div>
          <div className="tcm-modal__heading">
            <h2 className="tcm-modal__title">{title}</h2>
            <p className="tcm-modal__subtitle">{tournament.name}</p>
          </div>
          <button
            type="button"
            className="tcm-modal__close"
            onClick={() => onClose?.()}
            disabled={busy}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="tcm-modal__body">
          <p className="tcm-modal__desc">{description}</p>

          <label className="tcm-modal__field">
            <span className="tcm-modal__label">
              Lý do {requireReason ? "*" : "(không bắt buộc)"}
            </span>
            <textarea
              className="tcm-modal__textarea"
              rows={4}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
              required={requireReason}
              disabled={busy}
              placeholder="VD: Thời tiết xấu / Ít entry đăng ký / Tổ chức lại lịch…"
            />
            <span className="tcm-modal__counter">{reason.length}/500</span>
          </label>

          {requireReason && reason.trim() === "" ? null : (
            <p className="tcm-modal__helper">
              <AlertTriangle size={12} />
              Lý do sẽ được lưu vào hồ sơ giải đấu.
            </p>
          )}

          {localError ? (
            <p className="tcm-modal__alert" role="alert">{localError}</p>
          ) : null}
          {error ? (
            <p className="tcm-modal__alert" role="alert">{error}</p>
          ) : null}
        </div>

        <footer className="tcm-modal__footer">
          <button
            type="button"
            className="tcm-btn tcm-btn--ghost"
            onClick={() => onClose?.()}
            disabled={busy}
          >
            Huỷ bỏ
          </button>
          <button
            type="submit"
            className="tcm-btn tcm-btn--err"
            disabled={busy || (requireReason && !reason.trim())}
          >
            {busy ? "Đang xử lý…" : mode === "delete" ? "Xác nhận xoá" : "Xác nhận huỷ"}
          </button>
        </footer>
      </form>
    </div>
  );
}