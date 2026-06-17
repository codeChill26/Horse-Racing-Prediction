/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Lock, Unlock, Eye, Flag } from "lucide-react";
import { raceService } from "../../services/raceService";
import { tournamentService } from "../../services/tournamentService";
import { formatDate, mapStatusToVietnamese } from "../../utils/formatter";
import "./AdminRaceStagePage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "ONGOING", label: "Đang diễn ra" },
  { value: "FINISHED", label: "Đã kết thúc" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "SCHEDULED":
      return "ars-badge ars-badge--scheduled";
    case "ONGOING":
      return "ars-badge ars-badge--ongoing";
    case "FINISHED":
      return "ars-badge ars-badge--finished";
    case "CANCELLED":
      return "ars-badge ars-badge--cancelled";
    default:
      return "ars-badge";
  }
}

export default function AdminRaceStagePage() {
  const [races, setRaces] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tournamentFilter, setTournamentFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [raceList, tourList] = await Promise.all([
        raceService.getRacesList(),
        tournamentService.getTournamentsList("ALL").catch(() => []),
      ]);
      setRaces(Array.isArray(raceList) ? raceList : []);
      setTournaments(Array.isArray(tourList) ? tourList : []);
    } catch (e) {
      setError(e.message || "Không tải được danh sách chặng đua");
      setRaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === SOCKET / REALTIME NOTE (tiếng Việt) ===
  // Khu vực dành cho realtime: poll 10s để cập nhật trạng thái
  // SCHEDULED -> ONGOING -> FINISHED. Khi backend tích hợp
  // socket.io, có thể subscribe:
  //   socket.on('race:statusChanged', (race) => replaceRace(race));
  //   socket.on('race:registrationGateChanged', (race) => replaceRace(race));
  useEffect(() => {
    const interval = setInterval(() => {
      raceService
        .getRacesList()
        .then((list) => setRaces(Array.isArray(list) ? list : []))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let list = races;
    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (tournamentFilter !== "ALL") {
      list = list.filter((r) => String(r.tournamentId) === String(tournamentFilter));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          String(r.raceId ?? "").includes(q) ||
          (r.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [races, statusFilter, tournamentFilter, search]);

  const stats = useMemo(() => {
    return {
      total: races.length,
      scheduled: races.filter((r) => r.status === "SCHEDULED").length,
      ongoing: races.filter((r) => r.status === "ONGOING").length,
      finished: races.filter((r) => r.status === "FINISHED").length,
    };
  }, [races]);

  const replaceRace = (updated) => {
    setRaces((prev) =>
      prev.map((r) => (r.raceId === updated.raceId ? updated : r))
    );
  };

  const handleToggleRegistration = async (race) => {
    setBusyId(race.raceId);
    try {
      // Hiện chỉ có API close registration từ raceRepository
      // (PUT /api/admin/races/:id/registration-gate với isOpen: false)
      // Khi muốn mở lại, backend cần hỗ trợ isOpen: true.
      if (race.registrationOpen) {
        const updated = await raceService.executeCloseRegistration(race.raceId);
        if (updated?.race) replaceRace(updated.race);
        else {
          // fallback: tự cập nhật state local
          replaceRace({ ...race, registrationOpen: false });
        }
      } else {
        // Chưa có API mở lại — đánh dấu TODO
        window.alert(
          "Backend chưa hỗ trợ mở lại cổng đăng ký qua API. Vui lòng liên hệ dev backend."
        );
      }
    } catch (e) {
      window.alert(e.message || "Không đổi được trạng thái cổng");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ars-page">
      <header className="ars-page__header">
        <div>
          <h1 className="ars-page__title">Quản lý chặng đua</h1>
          <p className="ars-page__desc">
            Theo dõi các chặng đua, trạng thái cổng đăng ký và kết quả.
          </p>
        </div>
      </header>

      <div className="ars-stats">
        <div className="ars-stat">
          <div className="ars-stat__label">Tổng chặng</div>
          <div className="ars-stat__value">{stats.total}</div>
        </div>
        <div className="ars-stat">
          <div className="ars-stat__label">Đã lên lịch</div>
          <div className="ars-stat__value">{stats.scheduled}</div>
        </div>
        <div className="ars-stat">
          <div className="ars-stat__label">Đang diễn ra</div>
          <div className="ars-stat__value ars-stat__value--ok">
            {stats.ongoing}
          </div>
        </div>
        <div className="ars-stat">
          <div className="ars-stat__label">Đã kết thúc</div>
          <div className="ars-stat__value">{stats.finished}</div>
        </div>
      </div>

      <div className="ars-toolbar">
        <div className="ars-search-wrap">
          <Search className="ars-search-icon" size={14} />
          <input
            className="ars-search"
            type="search"
            placeholder="Tìm theo tên chặng, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="ars-select"
          value={tournamentFilter}
          onChange={(e) => setTournamentFilter(e.target.value)}
        >
          <option value="ALL">Tất cả giải đấu</option>
          {tournaments.map((t) => (
            <option key={t.tournamentId} value={t.tournamentId}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="ars-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ars-btn ars-btn--ghost"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && !loading && <div className="ars-alert--error">{error}</div>}

      <div className="ars-panel">
        {loading ? (
          <div className="ars-loading">
            <div className="ars-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="ars-empty">Chưa có chặng đua nào phù hợp bộ lọc.</div>
        ) : (
          <div className="ars-table-wrap">
            <table className="ars-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Chặng đua</th>
                  <th>Giải đấu</th>
                  <th>Thời gian</th>
                  <th>Cổng ĐK</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isBusy = busyId === r.raceId;
                  const tournament = tournaments.find(
                    (t) => t.tournamentId === r.tournamentId
                  );
                  return (
                    <tr key={r.raceId}>
                      <td>#{r.raceId}</td>
                      <td>
                        <div className="ars-name">
                          <Flag size={12} className="ars-name__icon" />
                          {r.name}
                        </div>
                      </td>
                      <td>{tournament?.name || `#${r.tournamentId}`}</td>
                      <td>
                        <div>{formatDate(r.scheduledAt)}</div>
                        {r.registrationDeadline && (
                          <div className="ars-meta">
                            Hạn ĐK: {formatDate(r.registrationDeadline)}
                          </div>
                        )}
                      </td>
                      <td>
                        {r.registrationOpen ? (
                          <span className="ars-badge ars-badge--open">
                            Mở
                          </span>
                        ) : (
                          <span className="ars-badge ars-badge--closed">
                            Đóng
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={statusBadgeClass(r.status)}>
                          {mapStatusToVietnamese(r.status) || r.status}
                        </span>
                      </td>
                      <td>
                        <div className="ars-actions">
                          <button
                            type="button"
                            className="ars-icon-btn"
                            title="Xem chi tiết"
                            onClick={() => setDetail(r)}
                          >
                            <Eye size={14} />
                          </button>
                          {r.status !== "FINISHED" &&
                            r.status !== "CANCELLED" && (
                              <button
                                type="button"
                                className={`ars-icon-btn ${
                                  r.registrationOpen
                                    ? "ars-icon-btn--warn"
                                    : "ars-icon-btn--ok"
                                }`}
                                title={
                                  r.registrationOpen
                                    ? "Đóng cổng đăng ký"
                                    : "Mở cổng đăng ký"
                                }
                                disabled={isBusy}
                                onClick={() => handleToggleRegistration(r)}
                              >
                                {r.registrationOpen ? (
                                  <Lock size={14} />
                                ) : (
                                  <Unlock size={14} />
                                )}
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="ars-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="ars-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ars-modal__bar" />
            <div className="ars-modal__header">
              <div>
                <h2 className="ars-modal__title">{detail.name}</h2>
                <p className="ars-modal__subtitle">Mã chặng: #{detail.raceId}</p>
              </div>
              <button
                type="button"
                className="ars-modal__close"
                onClick={() => setDetail(null)}
              >
                ✕
              </button>
            </div>
            <div className="ars-modal__body">
              <DetailRow label="Giải đấu" value={`#${detail.tournamentId}`} />
              <DetailRow
                label="Thời gian dự kiến"
                value={formatDate(detail.scheduledAt)}
              />
              <DetailRow
                label="Hạn đăng ký"
                value={formatDate(detail.registrationDeadline)}
              />
              <DetailRow
                label="Cổng đăng ký"
                value={
                  detail.registrationOpen ? (
                    <span className="ars-badge ars-badge--open">Đang mở</span>
                  ) : (
                    <span className="ars-badge ars-badge--closed">Đã đóng</span>
                  )
                }
              />
              <DetailRow
                label="Trạng thái"
                value={
                  <span className={statusBadgeClass(detail.status)}>
                    {mapStatusToVietnamese(detail.status) || detail.status}
                  </span>
                }
              />
              <DetailRow
                label="Ngày công bố"
                value={formatDate(detail.publishedAt)}
              />
              <DetailRow
                label="Ngày tạo"
                value={formatDate(detail.createdAt)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="ars-detail-row">
      <span className="ars-detail-row__label">{label}</span>
      <span className="ars-detail-row__value">{value || "—"}</span>
    </div>
  );
}
