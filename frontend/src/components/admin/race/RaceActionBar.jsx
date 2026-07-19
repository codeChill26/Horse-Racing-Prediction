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
 *   - Phân công trọng tài (Flow 4) — chỉ khi SCHEDULED
 *   - Xử lý tranh chấp (Flow 4) — chỉ khi PAUSED
 *
 * Status guard cho Publish/Unpublish được nhận qua prop `canPublish` / `canUnpublish`
 * (client-side) — service sẽ double-check ở backend.
 */

import {
  Edit,
  XCircle,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  Undo2,
  ShieldCheck,
  Gavel,
  Send,
} from "lucide-react";

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
  onPublishAndNotify,
  onUnpublish,
  onAssignReferees,
  onResolveConflict,
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
  const isPaused = status === "PAUSED";
  const isFinished = status === "FINISHED";
  const isCancelled = status === "CANCELLED";
  const isAutoMatchedUnsettled = isFinished && !race.publishedAt;
  const canModify = isScheduled || isOngoing;
  const isRegOpen = race.registrationOpen || race.isRegistrationOpen;

  // Flow 8: status guard cho publish/unpublish.
  // Service sẽ validate lại — đây chỉ là UI affordance.
  // - PENDING_RESULT: race đã có OfficialRaceResult nhưng chưa FINISHED → dùng
  //   ConfirmModal cũ (Flow 8).
  // - FINISHED + !publishedAt: race Auto-Match đã hoàn tất nhưng admin chưa
  //   gửi kết quả cược cho spectators → dùng PublishNotifyModal (Option B)
  //   với breakdown per-spectator.
  const showPublish = isPendingResult;
  const showPublishAndNotify = isAutoMatchedUnsettled;
  const showUnpublish = isFinished && Boolean(race.publishedAt);

  // Flow 4 (mobile parity):
  // - Assign referees: chỉ khi SCHEDULED (BE throw 409 nếu khác).
  // - Resolve conflict: chỉ khi PAUSED (2 referee submit lệch).
  const showAssignReferees = Boolean(onAssignReferees) && isScheduled;
  const showResolveConflict = Boolean(onResolveConflict) && isPaused;

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

          {showAssignReferees && (
            <button
              type="button"
              className="rab-btn rab-btn--info"
              onClick={onAssignReferees}
              disabled={busy}
              title="Phân công 2 trọng tài (chỉ khi SCHEDULED)"
            >
              <ShieldCheck size={16} />
              Phân công TT
            </button>
          )}

          {showResolveConflict && (
            <button
              type="button"
              className="rab-btn rab-btn--danger"
              onClick={onResolveConflict}
              disabled={busy}
              title="Xử lý tranh chấp khi 2 trọng tài nộp lệch (chỉ khi PAUSED)"
            >
              <Gavel size={16} />
              Xử lý tranh chấp
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

          {/* Option B: Race Auto-Match FINISHED nhưng chưa settle
              → mở PublishNotifyModal xem breakdown trước khi gửi. */}
          {showPublishAndNotify && (
            <button
              type="button"
              className="rab-btn rab-btn--primary"
              onClick={onPublishAndNotify}
              disabled={busy}
              title="Xem trước breakdown rồi gửi kết quả cược cho spectators"
            >
              <Send size={16} />
              Gửi kết quả cược
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
