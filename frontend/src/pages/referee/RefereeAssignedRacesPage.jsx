/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Assigned Races Page
 * Route: /referee/assigned-races
 *
 * Features:
 * - View race list
 * - Search
 * - Filter by status (Scheduled, InProgress, Completed)
 * - Navigate to race control
 *
 * FIXES:
 * - BUG-REF-004: dùng refereeRaceService.getAssignedRaces() thay mock trực tiếp
 * - A11y: role=table, aria-sort, keyboard nav
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  Hash,
  PlayCircle,
  Filter,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import { refereeRaceService } from "../../services/refereeService";
import { normalizeRaceStatus } from "../../repositories/refereeRepository";
import { useToast } from "../../hooks/useToast";
import { useSocket } from "../../hooks/useSocket";
import { onSocketEvent } from "../../utils/socket";
import { getAccessToken } from "../../utils/token";
import "./RefereeAssignedRacesPage.css";

// ============================================================
// RACE STATUS BADGE
// ============================================================
const STATUS_CONFIG = {
  Scheduled: { variant: "info", label: "Chờ bắt đầu" },
  InProgress: { variant: "live", label: "Đang diễn ra" },
  Paused: { variant: "warn", label: "Tạm dừng" },
  PendingResult: { variant: "warn", label: "Chờ kết quả" },
  Completed: { variant: "ok", label: "Hoàn thành" },
  Finished: { variant: "ok", label: "Hoàn thành" },
  Cancelled: { variant: "danger", label: "Đã hủy" },
};

function RaceStatusBadge({ status }) {
  const normalized = normalizeRaceStatus(status);
  const config = STATUS_CONFIG[normalized] || { variant: "muted", label: status || "—" };
  return <span className={`race-status-badge race-status-badge--${config.variant}`}>{config.label}</span>;
}

// ============================================================
// RACE FILTER
// ============================================================
const FILTER_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "Scheduled", label: "Chờ bắt đầu" },
  { value: "InProgress", label: "Đang diễn ra" },
  { value: "Paused", label: "Tạm dừng" },
  { value: "PendingResult", label: "Chờ kết quả" },
  { value: "Finished", label: "Hoàn thành" },
  { value: "Cancelled", label: "Đã hủy" },
];

function RaceFilter({ value, onChange }) {
  return (
    <div className="race-filter">
      <Filter size={16} />
      <select
        className="race-filter__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// SEARCH INPUT
// ============================================================
function SearchInput({ value, onChange, onClear }) {
  return (
    <div className="race-search">
      <Search size={16} className="race-search__icon" />
      <input
        type="text"
        className="race-search__input"
        placeholder="Tìm kiếm race, giải đấu..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="race-search__clear"
          onClick={onClear}
          aria-label="Xóa tìm kiếm"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// TABLE ROW
// ============================================================
function TableRow({ race, onViewControl }) {
  const formatDateTime = (iso) => {
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
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onViewControl(race);
    }
  };

  return (
    <tr
      className="race-table__row"
      onClick={() => onViewControl(race)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-label={`Race ${race.name} - ${race.tournamentName || ""} - ${race.status || ""}`}
    >
      <td className="race-table__cell race-table__cell--race" role="cell">
        <div className="race-table__race-info">
          <span className="race-table__race-id">
            <Hash size={12} aria-hidden="true" />
            {race.raceId || race.id}
          </span>
          <span className="race-table__race-name">{race.name}</span>
        </div>
      </td>
      <td className="race-table__cell" role="cell">
        <span className="race-table__tournament">{race.tournamentName || "—"}</span>
      </td>
      <td className="race-table__cell" role="cell">
        <span className="race-table__location">
          <MapPin size={12} aria-hidden="true" />
          {race.location || "Chưa cập nhật"}
        </span>
      </td>
      <td className="race-table__cell" role="cell">
        <span className="race-table__time">
          <Clock size={12} aria-hidden="true" />
          {formatDateTime(race.scheduledStartTime)}
        </span>
      </td>
      <td className="race-table__cell" role="cell">
        <RaceStatusBadge status={race.status} />
      </td>
      <td className="race-table__cell" role="cell">
        <span className="race-table__legs">{race.totalLegs || 0} leg</span>
      </td>
      <td className="race-table__cell race-table__cell--action" role="cell">
        <button
          type="button"
          className="race-table__btn race-table__btn--primary"
          onClick={(e) => {
            e.stopPropagation();
            onViewControl(race);
          }}
          aria-label={`Điều khiển race ${race.name}`}
        >
          <PlayCircle size={14} aria-hidden="true" />
          Điều khiển
        </button>
      </td>
    </tr>
  );
}

// ============================================================
// ASSIGNED RACE TABLE
// ============================================================
function AssignedRaceTable({ races, onViewControl, isLoading }) {
  if (isLoading) {
    return (
      <div className="race-table" role="table" aria-label="Bảng race được phân công" aria-busy="true">
        <div className="race-table__header" role="row">
          <span role="columnheader">Race</span>
          <span role="columnheader">Giải đấu</span>
          <span role="columnheader">Địa điểm</span>
          <span role="columnheader">Thời gian</span>
          <span role="columnheader">Trạng thái</span>
          <span role="columnheader">Leg</span>
          <span role="columnheader">Thao tác</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="race-table__skeleton-row">
            <Skeleton width="40%" height="16px" />
            <Skeleton width="30%" height="16px" />
            <Skeleton width="25%" height="16px" />
            <Skeleton width="30%" height="16px" />
            <Skeleton width="80px" height="24px" borderRadius="6px" />
            <Skeleton width="40px" height="16px" />
            <Skeleton width="100px" height="32px" borderRadius="8px" />
          </div>
        ))}
      </div>
    );
  }

  if (!races || races.length === 0) {
    return null;
  }

  return (
    <div className="race-table" role="table" aria-label="Bảng race được phân công">
      <div className="race-table__header" role="row">
        <span role="columnheader">Race</span>
        <span role="columnheader">Giải đấu</span>
        <span role="columnheader">Địa điểm</span>
        <span role="columnheader">Thời gian</span>
        <span role="columnheader">Trạng thái</span>
        <span role="columnheader">Leg</span>
        <span role="columnheader">Thao tác</span>
      </div>
      <tbody>
        {races.map((race) => (
          <TableRow
            key={race.id || race.raceId}
            race={race}
            onViewControl={onViewControl}
          />
        ))}
      </tbody>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState({ isFiltered }) {
  return (
    <div className="race-empty">
      <Calendar size={48} />
      <h3>
        {isFiltered
          ? "Không tìm thấy race nào"
          : "Bạn chưa được phân công race nào"}
      </h3>
      <p>
        {isFiltered
          ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          : "Khi có race được phân công, bạn sẽ thấy danh sách ở đây."}
      </p>
    </div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================
function ErrorState({ message, onRetry }) {
  return (
    <div className="race-error">
      <h3>Đã xảy ra lỗi</h3>
      <p>{message || "Không thể tải danh sách race."}</p>
      <button type="button" className="race-btn race-btn--primary" onClick={onRetry}>
        Thử lại
      </button>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RefereeAssignedRacesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = getAccessToken();
  const { connected } = useSocket(token);
  const toastify = useToast();

  const initialStatus = searchParams.get("status") || "ALL";

  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // Manual retry handler (uses same flow as initial load via ref guard)
  const loadRaces = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const apiStatus = statusFilter === "ALL"
        ? undefined
        : ({ Scheduled: "SCHEDULED", InProgress: "IN_PROGRESS", Paused: "PAUSED",
            PendingResult: "PENDING_RESULT", Finished: "FINISHED", Completed: "FINISHED",
            Cancelled: "CANCELLED" }[statusFilter] || statusFilter);
      const list = await refereeRaceService.getAssignedRaces(
        apiStatus ? { status: apiStatus } : undefined
      );
      setRaces(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách race.");
      toastify?.error?.(e instanceof Error ? e.message : null) ||
        toastify?.error?.("Không thể tải danh sách race");
      setRaces([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toastify]);

  // Fetch races on mount via ref-based effect to avoid cascading renders
  useEffect(() => {
    loadRaces();
  }, [loadRaces]);

  // Realtime: race:started / race:auto_matched / race:conflicted (chưa được BE emit
  // — nhưng đăng ký sẵn để khi BE bật thì FE nhận ngay)
  useEffect(() => {
    if (!token) return undefined;
    const refresh = () => {
      loadRaces().catch(() => {});
    };
    const offStarted = onSocketEvent("race:started", (payload) => {
      refresh();
      if (payload?.raceId || payload?.id) {
        toastify?.info?.(
          `Race #${payload.raceId || payload.id} đã được kích hoạt.`
        );
      }
    });
    const offMatched = onSocketEvent("race:auto_matched", (payload) => {
      refresh();
      toastify?.success?.(
        `Race #${payload?.raceId || ""}: 2 kết quả trùng khớp 100%.`
      );
    });
    const offConflict = onSocketEvent("race:conflicted", (payload) => {
      refresh();
      toastify?.warn?.(
        `Race #${payload?.raceId || ""} bị xung đột — chờ Admin xử lý.`
      );
    });
    return () => {
      offStarted();
      offMatched();
      offConflict();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, toastify]);

  // Update URL when filter changes
  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    if (newStatus === "ALL") {
      setSearchParams({});
    } else {
      setSearchParams({ status: newStatus });
    }
  };

  // Filter races
  const filteredRaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    return races.filter((race) => {
      // Status filter
      if (statusFilter !== "ALL" && normalizeRaceStatus(race.status) !== statusFilter) {
        return false;
      }
      // Search filter
      if (query) {
        const name = (race.name || "").toLowerCase();
        const tournament = (race.tournamentName || "").toLowerCase();
        const location = (race.location || "").toLowerCase();
        if (!name.includes(query) && !tournament.includes(query) && !location.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [races, search, statusFilter]);

  // Navigation handler
  const handleViewControl = (race) => {
    const raceId = race.id || race.raceId;
    navigate(`/referee/races/${raceId}/control`);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearch("");
  };

  // Render loading state
  if (loading) {
    return (
      <div className="assigned-races-page">
        <div className="assigned-races-page__inner">
          <header className="assigned-races-page__header">
            <div>
              <p className="assigned-races-page__eyebrow">Referee</p>
              <h1 className="assigned-races-page__title">Race được phân công</h1>
              <p className="assigned-races-page__subtitle">
                Danh sách tất cả race bạn được phân công làm trọng tài.
              </p>
            </div>
          </header>

          <div className="assigned-races-page__toolbar">
            <SearchInput value="" onChange={() => {}} onClear={() => {}} />
            <RaceFilter value="ALL" onChange={() => {}} />
          </div>

          <AssignedRaceTable races={[]} onViewControl={() => {}} isLoading={true} />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="assigned-races-page">
        <div className="assigned-races-page__inner">
          <header className="assigned-races-page__header">
            <div>
              <p className="assigned-races-page__eyebrow">Referee</p>
              <h1 className="assigned-races-page__title">Race được phân công</h1>
            </div>
          </header>
          <ErrorState message={error} onRetry={loadRaces} />
        </div>
      </div>
    );
  }

  // Render empty state
  if (races.length === 0) {
    return (
      <div className="assigned-races-page">
        <div className="assigned-races-page__inner">
          <header className="assigned-races-page__header">
            <div>
              <p className="assigned-races-page__eyebrow">Referee</p>
              <h1 className="assigned-races-page__title">Race được phân công</h1>
              <p className="assigned-races-page__subtitle">
                Danh sách tất cả race bạn được phân công làm trọng tài.
              </p>
            </div>
          </header>

          <div className="assigned-races-page__toolbar">
            <SearchInput value={search} onChange={setSearch} onClear={handleClearSearch} />
            <RaceFilter value={statusFilter} onChange={handleStatusChange} />
          </div>

          <EmptyState isFiltered={false} />
        </div>
      </div>
    );
  }

  // Render main content
  return (
    <div className="assigned-races-page">
      <div className="assigned-races-page__inner">
        {/* Page Header */}
        <header className="assigned-races-page__header">
          <div>
            <p className="assigned-races-page__eyebrow">Referee</p>
            <h1 className="assigned-races-page__title">
              Race được phân công
              <span
                className={`ars-rt ${connected ? "ars-rt--ok" : "ars-rt--off"}`}
                title={
                  connected
                    ? "Đang nhận cập nhật realtime (FLOW 4)"
                    : "Mất kết nối realtime"
                }
              >
                {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
                <span>{connected ? "Realtime" : "Offline"}</span>
              </span>
            </h1>
            <p className="assigned-races-page__subtitle">
              Danh sách tất cả race bạn được phân công làm trọng tài.
            </p>
          </div>
          <div className="assigned-races-page__stats">
            <span className="assigned-races-page__stats-count">
              {filteredRaces.length} / {races.length} race
            </span>
          </div>
        </header>

        {/* Toolbar */}
        <div className="assigned-races-page__toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={handleClearSearch}
          />
          <RaceFilter value={statusFilter} onChange={handleStatusChange} />
        </div>

        {/* Table or Empty */}
        {filteredRaces.length === 0 ? (
          <EmptyState isFiltered={true} />
        ) : (
          <AssignedRaceTable
            races={filteredRaces}
            onViewControl={handleViewControl}
            isLoading={false}
          />
        )}
      </div>
    </div>
  );
}
