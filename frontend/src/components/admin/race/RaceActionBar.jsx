/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RaceActionBar Component
 *
 * Component chứa các actions cho race: edit, cancel, open/close registration.
 */

import { Edit, XCircle, Lock, Unlock, RefreshCw } from "lucide-react";

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
  onRefresh,
  loading = false,
  busy = false,
}) {
  if (loading) {
    return <RaceActionBarSkeleton />;
  }

  if (!race) return null;

  const isScheduled = race.status === "SCHEDULED";
  const isOngoing = race.status === "ONGOING";
  const isFinished = race.status === "FINISHED";
  const isCancelled = race.status === "CANCELLED";
  const canModify = isScheduled || isOngoing;
  const isRegOpen = race.registrationOpen || race.isRegistrationOpen;

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
