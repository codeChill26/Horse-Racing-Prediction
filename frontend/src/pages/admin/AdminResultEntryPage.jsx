/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin Result Entry Page
 *
 * Trang quản lý tất cả entries (kết quả đăng ký) cho Admin.
 * Xem, duyệt, từ chối entries từ tất cả giải đấu và chặng đua.
 *
 * Route: /admin/entries hoặc /admin/results
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Eye, Search } from "lucide-react";
import { raceEntryRepository } from "../../repositories/raceEntryRepository";
import { tournamentRepository } from "../../repositories/tournamentRepository";
import { formatDate } from "../../utils/formatter";
import "./AdminResultEntryPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ ch�ơi" },
  { value: "SCRATCHED", label: "Rút lui" },
  { value: "DQ", label: "Disqualified" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "APPROVED":
      return "rep-badge rep-badge--approved";
    case "PENDING":
      return "rep-badge rep-badge--pending";
    case "REJECTED":
      return "rep-badge rep-badge--rejected";
    case "SCRATCHED":
      return "rep-badge rep-badge--scratched";
    case "DQ":
      return "rep-badge rep-badge--dq";
    default:
      return "rep-badge";
  }
}

export default function AdminResultEntryPage() {
  const [entries, setEntries] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tournamentFilter, setTournamentFilter] = useState("ALL");
  const [detailEntry, setDetailEntry] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Load entries and tournaments in parallel
      const [entriesData, tournamentsData] = await Promise.all([
        raceEntryRepository.getEntries(),
        tournamentRepository.getAll(),
      ]);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
    } catch (e) {
      setError(e.message || "Không tải được dữ liệu");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let list = entries;

    // Filter by status
    if (statusFilter !== "ALL") {
      list = list.filter((e) => e.status === statusFilter);
    }

    // Filter by tournament
    if (tournamentFilter !== "ALL") {
      list = list.filter((e) => String(e.tournamentId) === String(tournamentFilter));
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const horseName = (e.horse?.name ?? "").toLowerCase();
        const jockeyName = (e.jockey?.fullName ?? "").toLowerCase();
        const ownerName = (e.owner?.fullName ?? "").toLowerCase();
        const raceName = (e.race?.name ?? "").toLowerCase();
        const entryId = String(e.entryId ?? e.id ?? "").includes(q);
        return (
          entryId ||
          horseName.includes(q) ||
          jockeyName.includes(q) ||
          ownerName.includes(q) ||
          raceName.includes(q)
        );
      });
    }

    return list;
  }, [entries, statusFilter, tournamentFilter, search]);

  const stats = useMemo(() => ({
    total: entries.length,
    pending: entries.filter((e) => e.status === "PENDING").length,
    approved: entries.filter((e) => e.status === "APPROVED").length,
    rejected: entries.filter((e) => e.status === "REJECTED").length,
  }), [entries]);

  return (
    <div className="rep-page">
      <header className="rep-page__header">
        <div>
          <h1 className="rep-page__title">Kết quả đăng ký</h1>
          <p className="rep-page__desc">
            Quản lý và xem kết quả đăng ký từ tất cả giải đấu
          </p>
        </div>
        <button
          type="button"
          className="rep-btn rep-btn--ghost"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </header>

      <div className="rep-stats">
        <div className="rep-stat">
          <div className="rep-stat__label">Tổng đơn</div>
          <div className="rep-stat__value">{stats.total}</div>
        </div>
        <div className="rep-stat">
          <div className="rep-stat__label">Chờ duyệt</div>
          <div className="rep-stat__value rep-stat__value--warn">{stats.pending}</div>
        </div>
        <div className="rep-stat">
          <div className="rep-stat__label">Đã duyệt</div>
          <div className="rep-stat__value rep-stat__value--ok">{stats.approved}</div>
        </div>
        <div className="rep-stat">
          <div className="rep-stat__label">Bị từ chối</div>
          <div className="rep-stat__value rep-stat__value--err">{stats.rejected}</div>
        </div>
      </div>

      <div className="rep-toolbar">
        <div className="rep-search-wrap">
          <Search size={14} className="rep-search-icon" />
          <input
            type="search"
            className="rep-search"
            placeholder="Tìm theo tên ngựa, kỵ sĩ, chủ sở hữu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rep-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          className="rep-select"
          value={tournamentFilter}
          onChange={(e) => setTournamentFilter(e.target.value)}
        >
          <option value="ALL">Tất cả giải đấu</option>
          {tournaments.map((t) => (
            <option key={t.tournamentId} value={String(t.tournamentId)}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {error && !loading && (
        <div className="rep-alert rep-alert--error">{error}</div>
      )}

      <div className="rep-panel">
        {loading ? (
          <div className="rep-loading">
            <div className="rep-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rep-empty">Không có đơn đăng ký nào phù hợp.</div>
        ) : (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ngựa</th>
                  <th>Kỵ sĩ</th>
                  <th>Chủ sở hữu</th>
                  <th>Giải đấu</th>
                  <th>Chặng</th>
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
                      <td>#{entryId}</td>
                      <td>
                        <div className="rep-name">{entry.horse?.name || "—"}</div>
                        {entry.horse?.breed && (
                          <div className="rep-meta">{entry.horse.breed}</div>
                        )}
                      </td>
                      <td>
                        <div>{entry.jockey?.fullName || "—"}</div>
                        {entry.jockey?.email && (
                          <div className="rep-meta">{entry.jockey.email}</div>
                        )}
                      </td>
                      <td>
                        <div>{entry.owner?.fullName || "—"}</div>
                        {entry.owner?.email && (
                          <div className="rep-meta">{entry.owner.email}</div>
                        )}
                      </td>
                      <td>
                        <div className="rep-name">{entry.tournament?.name || entry.race?.tournamentName || "—"}</div>
                      </td>
                      <td>{entry.race?.name || "—"}</td>
                      <td>
                        <span className={statusBadgeClass(entry.status)}>
                          {entry.status}
                        </span>
                        {entry.rejectionReason && (
                          <div className="rep-reason" title={entry.rejectionReason}>
                            Lý do: {entry.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="rep-icon-btn"
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
        <EntryDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}

function EntryDetailModal({ entry, onClose }) {
  const entryId = entry.entryId ?? entry.id;

  return (
    <div className="rep-modal-backdrop" onClick={onClose}>
      <div className="rep-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rep-modal__bar" />
        <header className="rep-modal__header">
          <div>
            <h2 className="rep-modal__title">Chi tiết đăng ký #{entryId}</h2>
            <p className="rep-modal__subtitle">
              Giải đấu: {entry.tournament?.name || entry.race?.tournamentName || "—"}
            </p>
          </div>
          <button type="button" className="rep-modal__close" onClick={onClose}>✕</button>
        </header>
        <div className="rep-modal__body">
          <div className="rep-detail-row">
            <span className="rep-detail-label">Trạng thái</span>
            <span className={statusBadgeClass(entry.status)}>{entry.status}</span>
          </div>
          <div className="rep-detail-row">
            <span className="rep-detail-label">Ngựa</span>
            <span>{entry.horse?.name || "—"}</span>
          </div>
          {entry.horse && (
            <>
              <div className="rep-detail-row">
                <span className="rep-detail-label">Giống</span>
                <span>{entry.horse.breed || "—"}</span>
              </div>
              <div className="rep-detail-row">
                <span className="rep-detail-label">Màu lông</span>
                <span>{entry.horse.color || "—"}</span>
              </div>
            </>
          )}
          <div className="rep-detail-row">
            <span className="rep-detail-label">Kỵ sĩ</span>
            <span>{entry.jockey?.fullName || "—"}</span>
          </div>
          <div className="rep-detail-row">
            <span className="rep-detail-label">Chủ sở hữu</span>
            <span>{entry.owner?.fullName || "—"}</span>
          </div>
          <div className="rep-detail-row">
            <span className="rep-detail-label">Chặng đua</span>
            <span>{entry.race?.name || "—"}</span>
          </div>
          <div className="rep-detail-row">
            <span className="rep-detail-label">Ngày đăng ký</span>
            <span>{formatDate(entry.createdAt)}</span>
          </div>
          {entry.gateNumber && (
            <div className="rep-detail-row">
              <span className="rep-detail-label">Gate số</span>
              <span>{entry.gateNumber}</span>
            </div>
          )}
          {entry.odds && (
            <div className="rep-detail-row">
              <span className="rep-detail-label">Odds</span>
              <span>{entry.odds}</span>
            </div>
          )}
          {entry.rejectionReason && (
            <div className="rep-detail-row">
              <span className="rep-detail-label">Lý do từ chối</span>
              <span style={{ color: "#ff7b72" }}>{entry.rejectionReason}</span>
            </div>
          )}
        </div>
        <footer className="rep-modal__footer">
          <button type="button" className="rep-btn rep-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}
