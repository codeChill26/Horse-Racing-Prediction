/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RaceActionBar Component
 *
 * Component chứa các actions cho race:
 *   - Edit / Cancel (Flow 3, 4)
 *   - Open / Close registration gate (Flow 2)
 *   - Refresh
 *   - Publish / Unpublish (Flow 8) — Result Publication
 *
 * Status guard cho Publish/Unpublish được nhận qua prop `canPublish` / `canUnpublish`
 * (client-side) — service sẽ double-check ở backend.
 */

import { Edit, XCircle, Lock, Unlock, RefreshCw, CheckCircle2, Undo2 } from "lucide-react";

function RaceActionBarSkeleton() {
  return (
    <div className="rab-bar rab-bar--skeleton">
      <div className="rab-section">
        <span className="rab-section__title rab-skeleton-title" />
        <div className="rab-actions">
          <div className="rab-btn rab-btn--skeleton" />
          <div className="rab-btn rab-btn--skeleton" />
        </div>
      </div>
      <div className="rab-section rab-section--right">
        <div className="rab-btn rab-btn--skeleton" />
      </div>
    </div>
  );
}

export function RaceActionBar({
  race,
  onEdit,
  onCancel,
  onOpenRegistration,
  onCloseRegistration,
  onPublish,
  onUnpublish,
  onRefresh,
  loading = false,
  busy = false,
}) {
  if (loading) {
    return <RaceActionBarSkeleton />;
  }

  if (!race) return null;

  const status = String(race.status || "").toUpperCase();
  const isScheduled = status === "SCHEDULED";
  const isOngoing = status === "ONGOING";
  const isPendingResult = status === "PENDING_RESULT";
  const isFinished = status === "FINISHED";
  const isCancelled = status === "CANCELLED";
  const canModify = isScheduled || isOngoing;
  const isRegOpen = race.registrationOpen || race.isRegistrationOpen;

  // Flow 8: status guard cho publish/unpublish.
  // Service sẽ validate lại — đây chỉ là UI affordance.
  const showPublish   = isPendingResult; // PENDING_RESULT → FINISHED
  const showUnpublish = isFinished;      // FINISHED     → PENDING_RESULT

  return (
    <div className="rab-bar">
      {/* Registration Controls */}
      <div className="rab-section">
        <span className="rab-section__title">Đăng ký</span>
        <div className="rab-actions">
          {isRegOpen ? (
            <button
              type="button"
              className="rab-btn rab-btn--warn"
              onClick={onCloseRegistration}
              disabled={busy || !canModify}
              title="Đóng cổng đăng ký"
            >
              <Lock size={16} />
              Đóng ĐK
            </button>
          ) : (
            <button
              type="button"
              className="rab-btn rab-btn--ok"
              onClick={onOpenRegistration}
              disabled={busy || !canModify}
              title="Mở cổng đăng ký"
            >
              <Unlock size={16} />
              Mở ĐK
            </button>
          )}
        </div>
      </div>

      {/* Edit & Cancel Controls */}
      <div className="rab-section">
        <span className="rab-section__title">Thao tác</span>
        <div className="rab-actions">
          <button
            type="button"
            className="rab-btn rab-btn--ghost"
            onClick={onEdit}
            disabled={busy || !canModify}
            title="Chỉnh sửa chặng đua"
          >
            <Edit size={16} />
            Sửa
          </button>

          {!isCancelled && !isFinished && (
            <button
              type="button"
              className="rab-btn rab-btn--danger"
              onClick={onCancel}
              disabled={busy || !canModify}
              title="Hủy chặng đua"
            >
              <XCircle size={16} />
              Hủy
            </button>
          )}

          {/* Flow 8: Publish race → settle bets */}
          {showPublish && (
            <button
              type="button"
              className="rab-btn rab-btn--primary"
              onClick={onPublish}
              disabled={busy}
              title="Settle bets + xuất bản kết quả"
            >
              <CheckCircle2 size={16} />
              Publish kết quả
            </button>
          )}

          {/* Flow 8: Unpublish / Rollback settlement */}
          {showUnpublish && (
            <button
              type="button"
              className="rab-btn rab-btn--warn"
              onClick={onUnpublish}
              disabled={busy}
              title="Rollback settlement (race quay lại PENDING_RESULT)"
            >
              <Undo2 size={16} />
              Rollback
            </button>
          )}
        </div>
      </div>

      {/* Refresh */}
      <div className="rab-section rab-section--right">
        <button
          type="button"
          className="rab-btn rab-btn--ghost"
          onClick={onRefresh}
          disabled={loading || busy}
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={16} className={loading ? "rab-spin" : ""} />
        </button>
      </div>
    </div>
  );
}

export default RaceActionBar;
