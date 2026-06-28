/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee — Race được phân công.
 *
 * TODO: Backend chưa có API riêng.
 * MOCK DATA: refereeRaceRepository.getAssignedRaces() → mockRefereeData
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  PlayCircle,
  ArrowRight,
  Hash,
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import {
  RefereePageHeader,
  RefereeToolbar,
  RefereeSearchInput,
  RefereeFilterSelect,
  RefereeErrorAlert,
  RaceStatusBadge,
} from "../../components/referee/RefereeCommon";
import { refereeRaceService } from "../../services/refereeService";
import "./RefereeAssignedRacesPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "Scheduled",    label: "Chờ bắt đầu" },
  { value: "InProgress",  label: "Đang diễn ra" },
  { value: "Paused",      label: "Tạm dừng" },
  { value: "PendingResult", label: "Chờ kết quả" },
  { value: "Completed",   label: "Hoàn thành" },
  { value: "Cancelled",    label: "Đã hủy" },
];

function formatTime(iso) {
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

export default function RefereeAssignedRacesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";

  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refereeRaceService.getAssignedRaces();
      setRaces(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return races.filter((race) => {
      if (statusFilter !== "ALL" && race.status !== statusFilter) return false;
      if (q) {
        const name = (race.name || "").toLowerCase();
        const tName = (race.tournamentName || "").toLowerCase();
        const loc = (race.location || "").toLowerCase();
        if (!name.includes(q) && !tName.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });
  }, [races, search, statusFilter]);

  return (
    <div className="ref-page">
      <div className="ref-page-inner">
        <RefereePageHeader
          eyebrow="Phân công"
          title="Race được phân công"
          subtitle="Danh sách tất cả race bạn được phân công làm trọng tài."
          onRefresh={load}
          refreshing={loading}
        />

        {error ? <RefereeErrorAlert message={error} onRetry={load} /> : null}

        <RefereeToolbar>
          <RefereeSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên race, giải đấu, địa điểm…"
          />
          <RefereeFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            label="Trạng thái"
          />
        </RefereeToolbar>

        {loading ? (
          <div className="ref-race-table">
            <div className="ref-race-table__header">
              <span>Race</span>
              <span>Giải đấu</span>
              <span>Thời gian</span>
              <span>Leg</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ref-race-table__row">
                <Skeleton className="ref-skeleton__line" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--sm" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--sm" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--xs" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--xs" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--sm" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--xs" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ref-empty">
            <Calendar size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>
              {races.length === 0
                ? "Bạn chưa được phân công race nào."
                : "Không có race nào khớp với bộ lọc hiện tại."}
            </p>
          </div>
        ) : (
          <div className="ref-race-table">
            <div className="ref-race-table__header">
              <span>Race</span>
              <span>Giải đấu</span>
              <span>Thời gian</span>
              <span>Leg</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>
            {filtered.map((race) => (
              <RaceTableRow
                key={race.id || race.raceId}
                race={race}
                onControl={() => navigate(`/referee/races/${race.id || race.raceId}/control`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RaceTableRow({ race, onControl }) {
  return (
    <div className="ref-race-table__row">
      <div className="ref-race-table__race">
        <Hash size={12} />
        <span className="ref-race-table__id">#{race.raceId || race.id}</span>
        <strong>{race.name || "Race"}</strong>
      </div>
      <div className="ref-race-table__cell">
        <span className="ref-race-table__label">Giải</span>
        <span>{race.tournamentName || "—"}</span>
      </div>
      <div className="ref-race-table__cell">
        <span className="ref-race-table__label">Thời gian</span>
        <span className="ref-race-table__time">
          <Clock size={12} />
          {formatTime(race.scheduledStartTime)}
        </span>
      </div>
      <div className="ref-race-table__cell">
        <span className="ref-race-table__label">Leg</span>
        <span>{race.totalLegs || 0}</span>
      </div>
      <div className="ref-race-table__cell">
        <span className="ref-race-table__label">Vai trò</span>
        <span className="ref-race-table__role">{race.assignedRole || "Referee"}</span>
      </div>
      <div className="ref-race-table__cell">
        <span className="ref-race-table__label">Trạng thái</span>
        <RaceStatusBadge status={race.status} />
      </div>
      <div className="ref-race-table__cell">
        <button
          type="button"
          className="ref-btn ref-btn--primary ref-btn--sm"
          onClick={onControl}
        >
          <PlayCircle size={13} />
          Điều khiển
        </button>
      </div>
    </div>
  );
}
