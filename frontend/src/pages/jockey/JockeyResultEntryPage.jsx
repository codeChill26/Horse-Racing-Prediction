/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Jockey Result Entry Page
 *
 * Trang xem kết quả race của Jockey.
 * Hiển thị races được assign và chi tiết entries.
 *
 * Route: /jockey/results
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Eye, Trophy, Search } from "lucide-react";
import { jockeyRaceRepository } from "../../repositories/jockeyRepository";
import { formatDate } from "../../utils/formatter";
import "./JockeyResultEntryPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "SCHEDULED", label: "Sắp tới" },
  { value: "IN_PROGRESS", label: "Đang diễn ra" },
  { value: "FINISHED", label: "Đã kết thúc" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "FINISHED":
      return "jre-badge jre-badge--finished";
    case "SCHEDULED":
      return "jre-badge jre-badge--scheduled";
    case "IN_PROGRESS":
      return "jre-badge jre-badge--inprogress";
    case "CANCELLED":
      return "jre-badge jre-badge--cancelled";
    case "PENDING_RESULT":
      return "jre-badge jre-badge--pending";
    default:
      return "jre-badge";
  }
}

export default function JockeyResultEntryPage() {
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
      const data = await jockeyRaceRepository.getMyRaces();
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
        const tournamentName = (r.tournamentName ?? "") .toLowerCase();
        const venue = (r.venue ?? "").toLowerCase();
        return raceName.includes(q) || tournamentName.includes(q) || venue.includes(q);
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
    <div className="jre-page">
      <header className="jre-page__header">
        <div>
          <h1 className="jre-page__title">Kết quả race</h1>
          <p className="jre-page__desc">
            Theo dõi races bạn được phân công và kết quả thi đấu
          </p>
        </div>
        <button
          type="button"
          className="jre-btn jre-btn--ghost"
          onClick={loadRaces}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </header>

      <div className="jre-stats">
        <div className="jre-stat">
          <div className="jre-stat__label">Tổng race</div>
          <div className="jre-stat__value">{stats.total}</div>
        </div>
        <div className="jre-stat">
          <div className="jre-stat__label">Sắp tới</div>
          <div className="jre-stat__value jre-stat__value--scheduled">{stats.scheduled}</div>
        </div>
        <div className="jre-stat">
          <div className="jre-stat__label">Đang diễn ra</div>
          <div className="jre-stat__value jre-stat__value--inprogress">{stats.inProgress}</div>
        </div>
        <div className="jre-stat">
          <div className="jre-stat__label">Đã kết thúc</div>
          <div className="jre-stat__value jre-stat__value--finished">{stats.finished}</div>
        </div>
      </div>

      <div className="jre-toolbar">
        <div className="jre-search-wrap">
          <Search size={14} className="jre-search-icon" />
          <input
            type="search"
            className="jre-search"
            placeholder="Tìm theo tên race, giải đấu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="jre-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && !loading && (
        <div className="jre-alert jre-alert--error">{error}</div>
      )}

      <div className="jre-panel">
        {loading ? (
          <div className="jre-loading">
            <div className="jre-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="jre-empty">Chưa có race nào được phân công.</div>
        ) : (
          <div className="jre-cards">
            {filtered.map((race) => (
              <div key={race.raceId ?? race.id} className="jre-card">
                <div className="jre-card__header">
                  <div>
                    <h3 className="jre-card__title">{race.name}</h3>
                    <p className="jre-card__subtitle">{race.tournamentName || race.tournament?.name || "—"}</p>
                  </div>
                  <span className={statusBadgeClass(race.status)}>
                    {race.status}
                  </span>
                </div>

                <div className="jre-card__info">
                  {race.scheduledAt && (
                    <div className="jre-card__info-item">
                      <span className="jre-card__info-label">Ngày</span>
                      <span className="jre-card__info-value">{formatDate(race.scheduledAt)}</span>
                    </div>
                  )}
                  {race.venue && (
                    <div className="jre-card__info-item">
                      <span className="jre-card__info-label">Địa điểm</span>
                      <span className="jre-card__info-value">{race.venue}</span>
                    </div>
                  )}
                  {race.entries?.length > 0 && (
                    <div className="jre-card__info-item">
                      <span className="jre-card__info-label">Ngựa</span>
                      <span className="jre-card__info-value">
                        {race.entries.map((e) => e.horse?.name || `Entry #${e.entryId ?? e.id}`).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {race.result && (
                  <div className="jre-card__result">
                    <Trophy size={16} />
                    <span>Kết quả: {race.result}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="jre-card__action"
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
        <JockeyRaceDetailModal
          race={detailRace}
          onClose={() => setDetailRace(null)}
        />
      )}
    </div>
  );
}

function JockeyRaceDetailModal({ race, onClose }) {
  return (
    <div className="jre-modal-backdrop" onClick={onClose}>
      <div className="jre-modal" onClick={(e) => e.stopPropagation()}>
        <div className="jre-modal__bar" />
        <header className="jre-modal__header">
          <div>
            <h2 className="jre-modal__title">{race.name}</h2>
            <p className="jre-modal__subtitle">{race.tournamentName || race.tournament?.name || "—"}</p>
          </div>
          <button type="button" className="jre-modal__close" onClick={onClose}>✕</button>
        </header>
        <div className="jre-modal__body">
          <div className="jre-detail-row">
            <span className="jre-detail-label">Trạng thái</span>
            <span className={statusBadgeClass(race.status)}>{race.status}</span>
          </div>
          {race.scheduledAt && (
            <div className="jre-detail-row">
              <span className="jre-detail-label">Ngày thi đấu</span>
              <span>{formatDate(race.scheduledAt)}</span>
            </div>
          )}
          {race.venue && (
            <div className="jre-detail-row">
              <span className="jre-detail-label">Địa điểm</span>
              <span>{race.venue}</span>
            </div>
          )}
          {race.entries?.length > 0 && (
            <>
              <div className="jre-detail-section-title">Ngựa tham gia</div>
              {race.entries.map((entry) => (
                <div key={entry.entryId ?? entry.id} className="jre-entry-item">
                  <div className="jre-entry-item__name">
                    {entry.horse?.name || "—"}
                    {entry.horse?.breed && (
                      <span className="jre-entry-item__breed"> ({entry.horse.breed})</span>
                    )}
                  </div>
                  {entry.gateNumber && (
                    <div className="jre-entry-item__gate">Gate #{entry.gateNumber}</div>
                  )}
                  {entry.status && (
                    <span className={statusBadgeClass(entry.status)}>{entry.status}</span>
                  )}
                </div>
              ))}
            </>
          )}
          {race.result && (
            <div className="jre-detail-row jre-detail-row--result">
              <span className="jre-detail-label">Kết quả</span>
              <span className="jre-result">{race.result}</span>
            </div>
          )}
        </div>
        <footer className="jre-modal__footer">
          <button type="button" className="jre-btn jre-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}
