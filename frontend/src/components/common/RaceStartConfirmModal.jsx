/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RaceStartConfirmModal — FLOW 4 Step 1.
 *
 * Modal xác nhận khi referee A hoặc B bấm "Bắt đầu" race.
 * Sau khi start, race sẽ chuyển SCHEDULED → IN_PROGRESS và block cược mới.
 *
 * Có thể dùng cho 2 context:
 *  - Referee: từ RefereeRaceControlPage
 *  - Admin  : từ AdminRaceDetailPage (optional)
 */

import { useEffect, useState } from "react";
import { X, PlayCircle, AlertTriangle, Lock, Eye } from "lucide-react";
import "./RaceStartConfirmModal.css";

export default function RaceStartConfirmModal({
  race,
  refereeRole = "Referee",
  busy = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setLocalError("");
  }, [race?.raceId]);

  if (!race) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (race.status && race.status !== "Scheduled" && race.status !== "SCHEDULED") {
      setLocalError("Race đã được kích hoạt hoặc không ở trạng thái SCHEDULED");
      return;
    }
    try {
      await onConfirm?.();
  } catch (_err) {
    // parent handles
  }
  };

  return (
    <div
      className="rscm-backdrop"
      onClick={() => {
        if (!busy) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="rscm-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="rscm-modal__bar" />
        <header className="rscm-modal__header">
          <div className="rscm-modal__icon rscm-modal__icon--start">
            <PlayCircle size={22} />
          </div>
          <div className="rscm-modal__heading">
            <h2 className="rscm-modal__title">Bắt đầu chặng đua</h2>
            <p className="rscm-modal__subtitle">
              FLOW 4 · Step 1 — {race.name}
            </p>
          </div>
          <button
            type="button"
            className="rscm-modal__close"
            onClick={() => onClose?.()}
            disabled={busy}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="rscm-modal__body">
          <p className="rscm-modal__desc">
            Bạn sắp kích hoạt chặng đua <strong>{race.name}</strong> với vai trò{" "}
            <strong>{refereeRole}</strong>. Hành động này sẽ:
          </p>

          <ul className="rscm-modal__effects">
            <li>
              <Lock size={14} />
              <span>
                Khoá toàn bộ cược mới từ Spectator (race chuyển sang IN_PROGRESS).
              </span>
            </li>
            <li>
              <Eye size={14} />
              <span>
                Cả 2 trọng tài (A &amp; B) sẽ nộp kết quả độc lập, không thấy kết quả của nhau
                (Blind Double Entry).
              </span>
            </li>
            <li>
              <AlertTriangle size={14} />
              <span>
                Khi cả 2 nộp, hệ thống sẽ tự so sánh — khớp thì race sang PENDING_RESULT, lệch
                thì race PAUSED chờ Admin xử lý.
              </span>
            </li>
          </ul>

          <div className="rscm-modal__warning">
            <AlertTriangle size={14} />
            <span>
              Hành động này không thể huỷ. Hãy chắc chắn mọi ngựa đã vào vị trí xuất phát.
            </span>
          </div>

          {localError ? (
            <div className="rscm-modal__alert" role="alert">
              <AlertTriangle size={14} />
              <span>{localError}</span>
            </div>
          ) : null}
          {error ? (
            <div className="rscm-modal__alert" role="alert">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <footer className="rscm-modal__footer">
          <button
            type="button"
            className="rscm-btn rscm-btn--ghost"
            onClick={() => onClose?.()}
            disabled={busy}
          >
            Huỷ
          </button>
          <button type="submit" className="rscm-btn rscm-btn--start" disabled={busy}>
            <PlayCircle size={14} />
            {busy ? "Đang khởi động…" : "Bắt đầu ngay"}
          </button>
        </footer>
      </form>
    </div>
  );
}