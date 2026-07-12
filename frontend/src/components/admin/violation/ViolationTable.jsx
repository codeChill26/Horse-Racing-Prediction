/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ViolationTable Component
 *
 * Component hiển thị danh sách violation dạng bảng (desktop) hoặc card (mobile).
 */

import { Eye, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { SeverityBadge, RoleBadge } from "../../ui/Badges";
import { ViolationStatusBadge } from "./ViolationStatusBadge";
import { ViolationTableSkeleton } from "./ViolationTableSkeleton";
import { formatPoints } from "../../../utils/formatter";

function truncate(value, max = 28) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

// Mobile Card Component
function ViolationCard({ violation, onView, onStartReview, onResolve, onDismiss, busyId }) {
  const isBusy = busyId === violation.id;

  return (
    <div className="vio-card">
      <div className="vio-card__header">
        <span className="vio-card__id">{violation.id}</span>
        <SeverityBadge severity={violation.severity} />
      </div>

      <div className="vio-card__body">
        <h3 className="vio-card__subject">{violation.subject}</h3>
        <div className="vio-card__role">
          <RoleBadge role={violation.subjectRole} />
        </div>
        <p className="vio-card__type">
          <span className="vio-card__label">Loại:</span> {truncate(violation.type, 35)}
        </p>
        <p className="vio-card__race">
          <span className="vio-card__label">Chặng:</span> {violation.raceName || "N/A"}
        </p>
        <p className="vio-card__penalty">
          <span className="vio-card__label">Phạt:</span>{" "}
          <span className={violation.penalty > 0 ? "vio-card__penalty-value" : ""}>
            {violation.penalty > 0 ? `-${formatPoints(violation.penalty)} điểm` : "Không phạt"}
          </span>
        </p>
        <div className="vio-card__status">
          <span className="vio-card__label">Trạng thái:</span>
          <ViolationStatusBadge status={violation.status} />
        </div>
      </div>

      <div className="vio-card__actions">
        <button
          type="button"
          className="vio-card__btn vio-card__btn--view"
          onClick={() => onView(violation)}
          aria-label="Xem chi tiết vi phạm"
        >
          <Eye size={14} aria-hidden="true" />
          Chi tiết
        </button>

        {violation.status === "OPEN" && (
          <button
            type="button"
            className="vio-card__btn vio-card__btn--info"
            onClick={() => onStartReview(violation)}
            disabled={isBusy}
            aria-label="Bắt đầu xem xét vi phạm"
          >
            <MessageSquare size={14} aria-hidden="true" />
            Xem xét
          </button>
        )}

        {(violation.status === "OPEN" || violation.status === "REVIEWING") && (
          <>
            <button
              type="button"
              className="vio-card__btn vio-card__btn--ok"
              onClick={() => onResolve(violation)}
              disabled={isBusy}
              aria-label="Xử lý vi phạm"
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Xử lý
            </button>
            <button
              type="button"
              className="vio-card__btn vio-card__btn--err"
              onClick={() => onDismiss(violation)}
              disabled={isBusy}
              aria-label="Bỏ qua vi phạm"
            >
              <XCircle size={14} aria-hidden="true" />
              Bỏ qua
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ViolationTable({
  violations,
  loading,
  busyId,
  onView,
  onStartReview,
  onResolve,
  onDismiss,
}) {
  if (loading) {
    return (
      <div className="vio-panel">
        <div className="vio-table-wrap">
          <table className="vio-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Đối tượng</th>
                <th scope="col">Loại vi phạm</th>
                <th scope="col">Chặng</th>
                <th scope="col">Mức độ</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Phạt</th>
                <th scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <ViolationTableSkeleton rows={5} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!loading && violations.length === 0) {
    return (
      <div className="vio-panel">
        <div className="vio-empty">
          <div className="vio-empty__icon">⚖️</div>
          <p className="vio-empty__title">Không có vi phạm</p>
          <p className="vio-empty__desc">Không có vi phạm nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vio-panel">
      {/* Desktop Table */}
      <div className="vio-table-wrap">
        <table className="vio-table">
          <caption className="sr-only">Danh sách các vi phạm kỷ luật</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Đối tượng</th>
              <th scope="col">Loại vi phạm</th>
              <th scope="col">Chặng</th>
              <th scope="col">Mức độ</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Phạt</th>
              <th scope="col">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => {
              const isBusy = busyId === v.id;
              return (
                <tr key={v.id}>
                  <td>
                    <span className="vio-code">{v.id}</span>
                  </td>
                  <td>
                    <div className="vio-subject">{v.subject}</div>
                    <div className="vio-meta">
                      <RoleBadge role={v.subjectRole} />
                    </div>
                  </td>
                  <td>
                    <div className="vio-type" title={v.type}>
                      {truncate(v.type, 28)}
                    </div>
                  </td>
                  <td>
                    <div className="vio-race" title={v.raceName || "N/A"}>
                      {truncate(v.raceName || "N/A", 20)}
                    </div>
                  </td>
                  <td>
                    <SeverityBadge severity={v.severity} />
                  </td>
                  <td>
                    <ViolationStatusBadge status={v.status} />
                  </td>
                  <td>
                    {v.penalty > 0 ? (
                      <span className="vio-penalty">-{formatPoints(v.penalty)}</span>
                    ) : (
                      <span className="vio-penalty vio-penalty--none">—</span>
                    )}
                  </td>
                  <td>
                    <div className="vio-actions">
                      <button
                        type="button"
                        className="vio-icon-btn"
                        title="Xem chi tiết"
                        aria-label="Xem chi tiết vi phạm"
                        onClick={() => onView(v)}
                      >
                        <Eye size={14} />
                      </button>

                      {v.status === "OPEN" && (
                        <button
                          type="button"
                          className="vio-icon-btn vio-icon-btn--info"
                          title="Bắt đầu xem xét"
                          aria-label="Bắt đầu xem xét vi phạm"
                          disabled={isBusy}
                          onClick={() => onStartReview(v)}
                        >
                          <MessageSquare size={14} />
                        </button>
                      )}

                      {(v.status === "OPEN" || v.status === "REVIEWING") && (
                        <>
                          <button
                            type="button"
                            className="vio-icon-btn vio-icon-btn--ok"
                            title="Xử lý xong"
                            aria-label="Xử lý vi phạm"
                            disabled={isBusy}
                            onClick={() => onResolve(v)}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="vio-icon-btn vio-icon-btn--err"
                            title="Bỏ qua"
                            aria-label="Bỏ qua vi phạm"
                            disabled={isBusy}
                            onClick={() => onDismiss(v)}
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
      <div className="vio-cards">
        {violations.map((v) => (
          <ViolationCard
            key={v.id}
            violation={v}
            onView={onView}
            onStartReview={onStartReview}
            onResolve={onResolve}
            onDismiss={onDismiss}
            busyId={busyId}
          />
        ))}
      </div>
    </div>
  );
}

export default ViolationTable;
