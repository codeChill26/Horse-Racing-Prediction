/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DeviationTable Component
 *
 * Component hiển thị danh sách deviation dạng bảng (desktop) hoặc card (mobile).
 */

import React from "react";
import { Eye, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { SeverityBadge } from "../../ui/Badges";
import { DeviationStatusBadge } from "./DeviationStatusBadge";
import { DeviationTableSkeleton } from "./DeviationTableSkeleton";
import { formatDate } from "../../../utils/formatter";

function truncate(value, max = 28) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

// Mobile Card Component
function DeviationCard({ deviation, onView, onStartReview, onResolve, onReject, busyId }) {
  const isBusy = busyId === deviation.id;

  return (
    <div className="dev-card">
      <div className="dev-card__header">
        <span className="dev-card__id">{deviation.id}</span>
        <SeverityBadge severity={deviation.severity} />
      </div>

      <div className="dev-card__body">
        <h3 className="dev-card__type">{deviation.type}</h3>
        <p className="dev-card__race">
          <span className="dev-card__label">Chặng:</span> {truncate(deviation.raceName, 30)}
        </p>
        <p className="dev-card__reporter">
          <span className="dev-card__label">Người báo cáo:</span> {deviation.reporter}
        </p>
        <p className="dev-card__date">
          <span className="dev-card__label">Ngày tạo:</span> {formatDate(deviation.createdAt)}
        </p>
        <div className="dev-card__status">
          <span className="dev-card__label">Trạng thái:</span>
          <DeviationStatusBadge status={deviation.status} />
        </div>
      </div>

      <div className="dev-card__actions">
        <button
          type="button"
          className="dev-card__btn dev-card__btn--view"
          onClick={() => onView(deviation)}
        >
          <Eye size={14} />
          Chi tiết
        </button>

        {deviation.status === "PENDING" && (
          <button
            type="button"
            className="dev-card__btn dev-card__btn--info"
            onClick={() => onStartReview(deviation)}
            disabled={isBusy}
          >
            <MessageSquare size={14} />
            Xem xét
          </button>
        )}

        {(deviation.status === "PENDING" || deviation.status === "REVIEWING") && (
          <>
            <button
              type="button"
              className="dev-card__btn dev-card__btn--ok"
              onClick={() => onResolve(deviation)}
              disabled={isBusy}
            >
              <CheckCircle2 size={14} />
              Xử lý
            </button>
            <button
              type="button"
              className="dev-card__btn dev-card__btn--err"
              onClick={() => onReject(deviation)}
              disabled={isBusy}
            >
              <XCircle size={14} />
              Bác bỏ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function DeviationTable({
  deviations,
  loading,
  busyId,
  onView,
  onStartReview,
  onResolve,
  onReject,
}) {
  if (loading) {
    return (
      <div className="dev-panel">
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Loại</th>
                <th>Chặng</th>
                <th>Người báo cáo</th>
                <th>Mức độ</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              <DeviationTableSkeleton rows={5} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!loading && deviations.length === 0) {
    return (
      <div className="dev-panel">
        <div className="dev-empty">
          <div className="dev-empty__icon">📋</div>
          <p className="dev-empty__title">Không có discrepancy</p>
          <p className="dev-empty__desc">Không có sai lệch nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-panel">
      {/* Desktop Table */}
      <div className="dev-table-wrap">
        <table className="dev-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Loại</th>
              <th>Chặng</th>
              <th>Người báo cáo</th>
              <th>Mức độ</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {deviations.map((d) => {
              const isBusy = busyId === d.id;
              return (
                <tr key={d.id}>
                  <td>
                    <span className="dev-code">{d.id}</span>
                  </td>
                  <td>
                    <div className="dev-type" title={d.type}>
                      {truncate(d.type, 26)}
                    </div>
                  </td>
                  <td>
                    <div className="dev-race" title={d.raceName}>
                      {truncate(d.raceName, 22)}
                    </div>
                    <div className="dev-meta">Chặng #{d.raceId}</div>
                  </td>
                  <td>
                    <div className="dev-reporter">{d.reporter}</div>
                  </td>
                  <td>
                    <SeverityBadge severity={d.severity} />
                  </td>
                  <td>
                    <DeviationStatusBadge status={d.status} />
                  </td>
                  <td className="dev-date">{formatDate(d.createdAt)}</td>
                  <td>
                    <div className="dev-actions">
                      <button
                        type="button"
                        className="dev-icon-btn"
                        title="Xem chi tiết"
                        onClick={() => onView(d)}
                      >
                        <Eye size={14} />
                      </button>

                      {d.status === "PENDING" && (
                        <button
                          type="button"
                          className="dev-icon-btn dev-icon-btn--info"
                          title="Bắt đầu xem xét"
                          disabled={isBusy}
                          onClick={() => onStartReview(d)}
                        >
                          <MessageSquare size={14} />
                        </button>
                      )}

                      {(d.status === "PENDING" || d.status === "REVIEWING") && (
                        <>
                          <button
                            type="button"
                            className="dev-icon-btn dev-icon-btn--ok"
                            title="Xử lý xong"
                            disabled={isBusy}
                            onClick={() => onResolve(d)}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="dev-icon-btn dev-icon-btn--err"
                            title="Bác bỏ"
                            disabled={isBusy}
                            onClick={() => onReject(d)}
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="dev-cards">
        {deviations.map((d) => (
          <DeviationCard
            key={d.id}
            deviation={d}
            onView={onView}
            onStartReview={onStartReview}
            onResolve={onResolve}
            onReject={onReject}
            busyId={busyId}
          />
        ))}
      </div>
    </div>
  );
}

export default DeviationTable;
