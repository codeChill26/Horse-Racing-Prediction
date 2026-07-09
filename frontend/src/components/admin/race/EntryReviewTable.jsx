/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EntryReviewTable — Flow 2 (Admin review RaceEntry)
 *
 * Bảng entries kèm action Approve/Reject.
 * Status chỉ hiển thị PENDING/APPROVED/REJECTED.
 *
 * Props:
 *  - entries: array
 *  - loading: boolean
 *  - busyEntryId: entryId đang xử lý
 *  - statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
 *  - onApprove(entry)
 *  - onAskReject(entry)  — page sẽ mở modal nhập lý do
 */

import {
  Crown,
  User,
  Home,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import "./EntryReviewTable.css";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE = {
  PENDING: "ert-badge ert-badge--pending",
  APPROVED: "ert-badge ert-badge--approved",
  REJECTED: "ert-badge ert-badge--rejected",
};

const STATUS_LABEL = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

function SkeletonRow() {
  return (
    <tr className="ert-table__skeleton-row">
      <td><div className="ert-skeleton ert-skeleton--sm" /></td>
      <td>
        <div className="ert-skeleton ert-skeleton--md" />
        <div className="ert-skeleton ert-skeleton--xs" style={{ marginTop: "0.25rem" }} />
      </td>
      <td><div className="ert-skeleton ert-skeleton--md" /></td>
      <td><div className="ert-skeleton ert-skeleton--md" /></td>
      <td><div className="ert-skeleton ert-skeleton--sm" /></td>
      <td><div className="ert-skeleton ert-skeleton--md" /></td>
      <td><div className="ert-skeleton ert-skeleton--md" /></td>
    </tr>
  );
}

const getEntryId = (e) =>
    e?.entryId != null ? e.entryId : e?.id != null ? e.id : null;

function EntryReviewCard({ entry, busy, onApprove, onAskReject }) {
  const isPending = entry.status === "PENDING";
  return (
    <div className="ert-card">
      <div className="ert-card__head">
        <span className="ert-gate">Gate {entry.gate ?? "—"}</span>
        <span className={STATUS_BADGE[entry.status] || "ert-badge"}>
          {STATUS_LABEL[entry.status] || entry.status}
        </span>
      </div>
      <div className="ert-card__body">
        <div className="ert-card__row">
          <Crown size={12} /> <strong>{entry.horseName || "—"}</strong>
        </div>
        <div className="ert-card__row">
          <User size={12} /> {entry.jockeyName || "Chưa có"}
        </div>
        <div className="ert-card__row">
          <Home size={12} /> {entry.ownerName || "—"}
        </div>
        {entry.rejectionReason ? (
          <div className="ert-card__reason">
            <ShieldAlert size={12} /> {entry.rejectionReason}
          </div>
        ) : null}
      </div>
      {isPending ? (
        <div className="ert-card__actions">
          <button
            type="button"
            className="ert-btn ert-btn--ok"
            disabled={busy}
            onClick={() => onApprove(entry)}
          >
            <CheckCircle2 size={12} /> Duyệt
          </button>
          <button
            type="button"
            className="ert-btn ert-btn--err"
            disabled={busy}
            onClick={() => onAskReject(entry)}
          >
            <XCircle size={12} /> Từ chối
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function EntryReviewTable({
  entries = [],
  loading = false,
  busyEntryId = null,
  onApprove = () => {},
  onAskReject = () => {},
}) {
  if (loading) {
    return (
      <div className="ert-panel">
        <div className="ert-table-wrap">
          <table className="ert-table">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Ngựa</th>
                <th>Kỵ sĩ</th>
                <th>Chủ ngựa</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="ert-panel">
        <div className="ert-empty">
          <Crown size={36} />
          <p className="ert-empty__title">Chưa có entry nào</p>
          <p className="ert-empty__desc">
            Khi horse owner submit entry vào race này, danh sách sẽ xuất hiện ở đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ert-panel">
      {/* Desktop table */}
      <div className="ert-table-wrap">
        <table className="ert-table">
          <thead>
            <tr>
              <th>Gate</th>
              <th>Ngựa</th>
              <th>Kỵ sĩ</th>
              <th>Chủ ngựa</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isPending = entry.status === "PENDING";
              const entryId = getEntryId(entry);
              const isBusy = busyEntryId === entryId;
              return (
                <tr key={entryId}>
                  <td>
                    <span className="ert-gate">{entry.gate ?? "—"}</span>
                  </td>
                  <td>
                    <div className="ert-horse">
                      <Crown size={14} className="ert-horse__icon" />
                      <div>
                        <div className="ert-horse__name">
                          {entry.horseName || "—"}
                        </div>
                        <div className="ert-horse__meta">
                          #{entry.horseId || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{entry.jockeyName || "—"}</td>
                  <td>{entry.ownerName || "—"}</td>
                  <td>
                    <span className={STATUS_BADGE[entry.status] || "ert-badge"}>
                      {STATUS_LABEL[entry.status] || entry.status}
                    </span>
                  </td>
                  <td className="ert-time">
                    {formatDateTime(entry.updatedAt || entry.createdAt)}
                  </td>
                  <td>
                    {isPending ? (
                      <div className="ert-actions">
                        <button
                          type="button"
                          className="ert-btn ert-btn--ok"
                          title="Duyệt entry"
                          disabled={isBusy}
                          onClick={() => onApprove(entry)}
                        >
                          <CheckCircle2 size={12} /> Duyệt
                        </button>
                        <button
                          type="button"
                          className="ert-btn ert-btn--err"
                          title="Từ chối entry"
                          disabled={isBusy}
                          onClick={() => onAskReject(entry)}
                        >
                          <XCircle size={12} /> Từ chối
                        </button>
                      </div>
                    ) : entry.rejectionReason ? (
                      <span
                        className="ert-reject-reason"
                        title={entry.rejectionReason}
                      >
                        {entry.rejectionReason}
                      </span>
                    ) : (
                      <span className="ert-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="ert-cards">
        {entries.map((entry) => {
          const isBusy = busyEntryId === getEntryId(entry);
          return (
            <EntryReviewCard
              key={`card-${getEntryId(entry)}`}
              entry={entry}
              busy={isBusy}
              onApprove={onApprove}
              onAskReject={onAskReject}
            />
          );
        })}
      </div>
    </div>
  );
}

export default EntryReviewTable;