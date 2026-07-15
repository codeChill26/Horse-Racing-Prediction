/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner Result Entry Page
 *
 * Trang xem kết quả đăng ký của Horse Owner.
 * Hiển thị các entries của ngựa thuộc sở hữu của user đang đăng nhập.
 *
 * Route: /horse-owner/results
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Eye, Search } from "lucide-react";
import { raceEntryService } from "../../services/raceEntryService";
import { formatDate } from "../../utils/formatter";
import "./HorseOwnerResultEntryPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "SCRATCHED", label: "Rút lui" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "APPROVED":
      return "hoe-rep-badge hoe-rep-badge--approved";
    case "PENDING":
      return "hoe-rep-badge hoe-rep-badge--pending";
    case "REJECTED":
      return "hoe-rep-badge hoe-rep-badge--rejected";
    case "SCRATCHED":
      return "hoe-rep-badge hoe-rep-badge--scratched";
    default:
      return "hoe-rep-badge";
  }
}

export default function HorseOwnerResultEntryPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [detailEntry, setDetailEntry] = useState(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await raceEntryService.getMyEntries();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Không tải được dữ liệu");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filtered = useMemo(() => {
    let list = entries;

    if (statusFilter !== "ALL") {
      list = list.filter((e) => e.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const horseName = (e.horse?.name ?? "").toLowerCase();
        const jockeyName = (e.jockey?.fullName ?? "").toLowerCase();
        const raceName = (e.race?.name ?? "").toLowerCase();
        return horseName.includes(q) || jockeyName.includes(q) || raceName.includes(q);
      });
    }

    return list;
  }, [entries, statusFilter, search]);

  const stats = useMemo(() => ({
    total: entries.length,
    pending: entries.filter((e) => e.status === "PENDING").length,
    approved: entries.filter((e) => e.status === "APPROVED").length,
    rejected: entries.filter((e) => e.status === "REJECTED").length,
  }), [entries]);

  return (
    <div className="hoe-rep-page">
      <header className="hoe-rep-page__header">
        <div>
          <h1 className="hoe-rep-page__title">Kết quả đăng ký</h1>
          <p className="hoe-rep-page__desc">
            Theo dõi trạng thái đăng ký ngựa của bạn vào các chặng đua
          </p>
        </div>
        <button
          type="button"
          className="hoe-rep-btn hoe-rep-btn--ghost"
          onClick={loadEntries}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </header>

      <div className="hoe-rep-stats">
        <div className="hoe-rep-stat">
          <div className="hoe-rep-stat__label">Tổng đơn</div>
          <div className="hoe-rep-stat__value">{stats.total}</div>
        </div>
        <div className="hoe-rep-stat">
          <div className="hoe-rep-stat__label">Chờ duyệt</div>
          <div className="hoe-rep-stat__value hoe-rep-stat__value--warn">{stats.pending}</div>
        </div>
        <div className="hoe-rep-stat">
          <div className="hoe-rep-stat__label">Đã duyệt</div>
          <div className="hoe-rep-stat__value hoe-rep-stat__value--ok">{stats.approved}</div>
        </div>
        <div className="hoe-rep-stat">
          <div className="hoe-rep-stat__label">Bị từ chối</div>
          <div className="hoe-rep-stat__value hoe-rep-stat__value--err">{stats.rejected}</div>
        </div>
      </div>

      <div className="hoe-rep-toolbar">
        <div className="hoe-rep-search-wrap">
          <Search size={14} className="hoe-rep-search-icon" />
          <input
            type="search"
            className="hoe-rep-search"
            placeholder="Tìm theo tên ngựa, kỵ sĩ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="hoe-rep-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && !loading && (
        <div className="hoe-rep-alert hoe-rep-alert--error">{error}</div>
      )}

      <div className="hoe-rep-panel">
        {loading ? (
          <div className="hoe-rep-loading">
            <div className="hoe-rep-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="hoe-rep-empty">Chưa có đơn đăng ký nào.</div>
        ) : (
          <div className="hoe-rep-table-wrap">
            <table className="hoe-rep-table">
              <thead>
                <tr>
                  <th>Ngựa</th>
                  <th>Kỵ sĩ</th>
                  <th>Chặng đua</th>
                  <th>Trạng thái</th>
                  <th>Ngày đăng ký</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const entryId = entry.entryId ?? entry.id;
                  return (
                    <tr key={entryId}>
                      <td>
                        <div className="hoe-rep-name">{entry.horse?.name || "—"}</div>
                        {entry.horse?.breed && (
                          <div className="hoe-rep-meta">{entry.horse.breed}</div>
                        )}
                      </td>
                      <td>{entry.jockey?.fullName || "—"}</td>
                      <td>
                        <div>{entry.race?.name || "—"}</div>
                        <div className="hoe-rep-meta">
                          {entry.race?.tournamentName || entry.tournament?.name || ""}
                        </div>
                      </td>
                      <td>
                        <span className={statusBadgeClass(entry.status)}>
                          {entry.status}
                        </span>
                        {entry.rejectionReason && (
                          <div className="hoe-rep-reason" title={entry.rejectionReason}>
                            Lý do: {entry.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="hoe-rep-icon-btn"
                          title="Xem chi tiết"
                          onClick={() => setDetailEntry(entry)}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailEntry && (
        <HorseOwnerEntryDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}

function HorseOwnerEntryDetailModal({ entry, onClose }) {
  const entryId = entry.entryId ?? entry.id;

  return (
    <div className="hoe-rep-modal-backdrop" onClick={onClose}>
      <div className="hoe-rep-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hoe-rep-modal__bar" />
        <header className="hoe-rep-modal__header">
          <div>
            <h2 className="hoe-rep-modal__title">Chi tiết đăng ký</h2>
            <p className="hoe-rep-modal__subtitle">#{entryId}</p>
          </div>
          <button type="button" className="hoe-rep-modal__close" onClick={onClose}>✕</button>
        </header>
        <div className="hoe-rep-modal__body">
          <div className="hoe-rep-detail-row">
            <span className="hoe-rep-detail-label">Trạng thái</span>
            <span className={statusBadgeClass(entry.status)}>{entry.status}</span>
          </div>
          <div className="hoe-rep-detail-row">
            <span className="hoe-rep-detail-label">Ngựa</span>
            <span>{entry.horse?.name || "—"}</span>
          </div>
          <div className="hoe-rep-detail-row">
            <span className="hoe-rep-detail-label">Kỵ sĩ</span>
            <span>{entry.jockey?.fullName || "—"}</span>
          </div>
          <div className="hoe-rep-detail-row">
            <span className="hoe-rep-detail-label">Chặng đua</span>
            <span>{entry.race?.name || "—"}</span>
          </div>
          <div className="hoe-rep-detail-row">
            <span className="hoe-rep-detail-label">Giải đấu</span>
            <span>{entry.race?.tournamentName || entry.tournament?.name || "—"}</span>
          </div>
          <div className="hoe-rep-detail-row">
            <span className="hoe-rep-detail-label">Ngày đăng ký</span>
            <span>{formatDate(entry.createdAt)}</span>
          </div>
          {entry.gateNumber && (
            <div className="hoe-rep-detail-row">
              <span className="hoe-rep-detail-label">Gate số</span>
              <span>{entry.gateNumber}</span>
            </div>
          )}
          {entry.odds && (
            <div className="hoe-rep-detail-row">
              <span className="hoe-rep-detail-label">Odds</span>
              <span>{entry.odds}</span>
            </div>
          )}
          {entry.rejectionReason && (
            <div className="hoe-rep-detail-row">
              <span className="hoe-rep-detail-label">Lý do từ chối</span>
              <span style={{ color: "#ff7b72" }}>{entry.rejectionReason}</span>
            </div>
          )}
        </div>
        <footer className="hoe-rep-modal__footer">
          <button type="button" className="hoe-rep-btn hoe-rep-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}
