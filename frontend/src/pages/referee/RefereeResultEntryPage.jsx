/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Result Entry Page
 *
 * Trang xem entries và kết quả race của Referee.
 * Hiển thị races được phân công và chi tiết entries.
 *
 * Route: /referee/results
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Eye, Flag, Search } from "lucide-react";
import { refereeRaceRepository } from "../../repositories/refereeRepository";
import { formatDate } from "../../utils/formatter";
import "./RefereeResultEntryPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "IN_PROGRESS", label: "Đang diễn ra" },
  { value: "PENDING_RESULT", label: "Chờ kết quả" },
  { value: "FINISHED", label: "Đã kết thúc" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "FINISHED":
      return "rre-badge rre-badge--finished";
    case "SCHEDULED":
      return "rre-badge rre-badge--scheduled";
    case "IN_PROGRESS":
      return "rre-badge rre-badge--inprogress";
    case "PENDING_RESULT":
      return "rre-badge rre-badge--pending";
    case "CANCELLED":
      return "rre-badge rre-badge--cancelled";
    default:
      return "rre-badge";
  }
}

export default function RefereeResultEntryPage() {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [detailRace, setDetailRace] = useState(null);

  const loadRaces = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refereeRaceRepository.getAssignedRaces();
      setRaces(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Không tải được dữ liệu");
      setRaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRaces();
  }, [loadRaces]);

  const filtered = useMemo(() => {
    let list = races;

    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const raceName = (r.name ?? "").toLowerCase();
        const tournamentName = (r.tournament?.name ?? "") .toLowerCase();
        return raceName.includes(q) || tournamentName.includes(q);
      });
    }

    return list;
  }, [races, statusFilter, search]);

  const stats = useMemo(() => ({
    total: races.length,
    scheduled: races.filter((r) => r.status === "SCHEDULED").length,
    inProgress: races.filter((r) => r.status === "IN_PROGRESS").length,
    finished: races.filter((r) => r.status === "FINISHED").length,
  }), [races]);

  return (
    <div className="rre-page">
      <header className="rre-page__header">
        <div>
          <h1 className="rre-page__title">Kết quả race</h1>
          <p className="rre-page__desc">
            Theo dõi races được phân công và kết quả đã submit
          </p>
        </div>
        <button
          type="button"
          className="rre-btn rre-btn--ghost"
          onClick={loadRaces}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </header>

      <div className="rre-stats">
        <div className="rre-stat">
          <div className="rre-stat__label">Tổng race</div>
          <div className="rre-stat__value">{stats.total}</div>
        </div>
        <div className="rre-stat">
          <div className="rre-stat__label">Đã lên lịch</div>
          <div className="rre-stat__value rre-stat__value--scheduled">{stats.scheduled}</div>
        </div>
        <div className="rre-stat">
          <div className="rre-stat__label">Đang diễn ra</div>
          <div className="rre-stat__value rre-stat__value--inprogress">{stats.inProgress}</div>
        </div>
        <div className="rre-stat">
          <div className="rre-stat__label">Đã kết thúc</div>
          <div className="rre-stat__value rre-stat__value--finished">{stats.finished}</div>
        </div>
      </div>

      <div className="rre-toolbar">
        <div className="rre-search-wrap">
          <Search size={14} className="rre-search-icon" />
          <input
            type="search"
            className="rre-search"
            placeholder="Tìm theo tên race, giải đấu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rre-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && !loading && (
        <div className="rre-alert rre-alert--error">{error}</div>
      )}

      <div className="rre-panel">
        {loading ? (
          <div className="rre-loading">
            <div className="rre-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rre-empty">Chưa có race nào được phân công.</div>
        ) : (
          <div className="rre-cards">
            {filtered.map((race) => (
              <div key={race.raceId ?? race.id} className="rre-card">
                <div className="rre-card__header">
                  <div className="rre-card__icon">
                    <Flag size={18} />
                  </div>
                  <div className="rre-card__header-info">
                    <h3 className="rre-card__title">{race.name}</h3>
                    <p className="rre-card__subtitle">{race.tournament?.name || "—"}</p>
                  </div>
                  <span className={statusBadgeClass(race.status)}>
                    {race.status}
                  </span>
                </div>

                <div className="rre-card__info">
                  {race.scheduledAt && (
                    <div className="rre-card__info-item">
                      <span className="rre-card__info-label">Ngày</span>
                      <span className="rre-card__info-value">{formatDate(race.scheduledAt)}</span>
                    </div>
                  )}
                  {race.entries?.length > 0 && (
                    <div className="rre-card__info-item">
                      <span className="rre-card__info-label">Số ngựa</span>
                      <span className="rre-card__info-value">{race.entries.length}</span>
                    </div>
                  )}
                  {race.mySubmissionStatus && (
                    <div className="rre-card__info-item">
                      <span className="rre-card__info-label">Trạng thái submit</span>
                      <span className={`rre-submission-status rre-submission-status--${race.mySubmissionStatus.toLowerCase()}`}>
                        {race.mySubmissionStatus}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="rre-card__action"
                  onClick={() => setDetailRace(race)}
                >
                  <Eye size={14} />
                  Xem chi tiết
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailRace && (
        <RefereeRaceDetailModal
          race={detailRace}
          onClose={() => setDetailRace(null)}
        />
      )}
    </div>
  );
}

function RefereeRaceDetailModal({ race, onClose }) {
  return (
    <div className="rre-modal-backdrop" onClick={onClose}>
      <div className="rre-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rre-modal__bar" />
        <header className="rre-modal__header">
          <div>
            <h2 className="rre-modal__title">{race.name}</h2>
            <p className="rre-modal__subtitle">{race.tournament?.name || "—"}</p>
          </div>
          <button type="button" className="rre-modal__close" onClick={onClose}>✕</button>
        </header>
        <div className="rre-modal__body">
          <div className="rre-detail-row">
            <span className="rre-detail-label">Trạng thái</span>
            <span className={statusBadgeClass(race.status)}>{race.status}</span>
          </div>
          {race.scheduledAt && (
            <div className="rre-detail-row">
              <span className="rre-detail-label">Ngày thi đấu</span>
              <span>{formatDate(race.scheduledAt)}</span>
            </div>
          )}
          {race.venue && (
            <div className="rre-detail-row">
              <span className="rre-detail-label">Địa điểm</span>
              <span>{race.venue}</span>
            </div>
          )}
          {race.mySubmissionStatus && (
            <div className="rre-detail-row">
              <span className="rre-detail-label">Trạng thái submit</span>
              <span className={`rre-submission-status rre-submission-status--${race.mySubmissionStatus.toLowerCase()}`}>
                {race.mySubmissionStatus}
              </span>
            </div>
          )}
          {race.entries?.length > 0 && (
            <>
              <div className="rre-detail-section-title">Danh sách ngựa</div>
              {race.entries.map((entry) => (
                <div key={entry.entryId ?? entry.id} className="rre-entry-item">
                  <div className="rre-entry-item__name">
                    {entry.horse?.name || `Entry #${entry.entryId ?? entry.id}`}
                  </div>
                  {entry.gateNumber && (
                    <div className="rre-entry-item__gate">Gate #{entry.gateNumber}</div>
                  )}
                  {entry.jockey && (
                    <div className="rre-entry-item__jockey">{entry.jockey.fullName || "—"}</div>
                  )}
                  {entry.finishPosition && (
                    <div className="rre-entry-item__position">Vị trí: #{entry.finishPosition}</div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <footer className="rre-modal__footer">
          <button type="button" className="rre-btn rre-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}
