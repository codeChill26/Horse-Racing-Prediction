/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Dashboard — tổng quan công việc trọng tài.
 *
 * TODO: Backend chưa có API riêng.
 * MOCK DATA: getMockDashboard() từ mockRefereeData.js
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  PlayCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  RefereePageHeader,
  RefereeStatCard,
  RefereeErrorAlert,
  RefereeToolbar,
  RefereeSearchInput,
  ConflictAlertCard,
} from "../../components/referee/RefereeCommon";
import { getMockDashboard } from "../../data/mockRefereeData";
import {
  refereeRaceService,
} from "../../services/refereeService";
import "./RefereeDashboardPage.css";

export default function RefereeDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Thử gọi repository thật trước (sẽ fallback mock)
      let races = [];
      try {
        races = await refereeRaceService.getAssignedRaces();
      } catch {
        /* fallback mock */
      }
      if (!races.length) {
        const mock = getMockDashboard();
        setData(mock);
      } else {
        // Build dashboard từ races thật
        setData(buildDashboardFromRaces(races));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRacesToday = (data?.racesToday || []).filter(
    (r) =>
      !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.tournamentName?.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredInProgress = (data?.racesInProgress || []).filter(
    (r) =>
      !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.tournamentName?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="ref-page">
        <div className="ref-page-inner">
          <div className="ref-dashboard-loading">
            <div className="ref-loading-bar" />
            <div className="ref-loading-bar ref-loading-bar--short" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ref-page">
      <div className="ref-page-inner">
        <RefereePageHeader
          eyebrow="Trọng tài"
          title="Tổng quan công việc"
          subtitle="Theo dõi race được phân công, tiến độ nhập kết quả và các conflict cần xử lý."
          onRefresh={load}
          refreshing={loading}
        />

        {error ? <RefereeErrorAlert message={error} onRetry={load} /> : null}

        {/* Stats */}
        <div className="ref-grid ref-stats-grid">
          <RefereeStatCard
            icon={ClipboardList}
            label="Race hôm nay"
            value={data?.stats?.scheduledToday ?? 0}
            accent="primary"
          />
          <RefereeStatCard
            icon={PlayCircle}
            label="Đang diễn ra"
            value={data?.stats?.inProgress ?? 0}
            accent="gold"
            onClick={() => navigate("/referee/assigned-races?status=InProgress")}
          />
          <RefereeStatCard
            icon={AlertTriangle}
            label="Tạm dừng"
            value={data?.stats?.paused ?? 0}
            accent="danger"
            onClick={() => navigate("/referee/conflicts")}
          />
          <RefereeStatCard
            icon={Clock}
            label="Leg chờ nhập"
            value={data?.stats?.pendingLegs ?? 0}
            accent="default"
            onClick={() => navigate("/referee/assigned-races?status=InProgress")}
          />
          <RefereeStatCard
            icon={CheckCircle2}
            label="Leg đã submit"
            value={data?.stats?.mySubmittedLegs ?? 0}
            accent="default"
          />
          <RefereeStatCard
            icon={AlertTriangle}
            label="Conflict"
            value={data?.stats?.conflictedLegs ?? 0}
            accent="danger"
            onClick={() => navigate("/referee/conflicts")}
          />
        </div>

        {/* Conflict Alert */}
        {(data?.conflicts?.length ?? 0) > 0 ? (
          <section className="ref-section">
            <div className="ref-section__head">
              <div>
                <h2>Conflict cần chú ý</h2>
                <p>
                  {(data?.conflicts || []).length} leg đang có sai lệch kết quả giữa 2 trọng tài.
                </p>
              </div>
            </div>
            <div className="ref-conflict-alerts">
              {(data?.conflicts || []).map((leg) => {
                const race = (data?.racesInProgress || []).find(
                  (r) => r.id === leg.raceId || r.raceId === leg.raceId,
                );
                return (
                  <ConflictAlertCard
                    key={leg.id || leg.legId}
                    raceName={race?.name || leg.raceName || "Race"}
                    legName={leg.name || leg.legName || `Leg ${leg.legNumber}`}
                    onView={() => navigate(`/referee/assigned-races`)}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Races In Progress */}
        {(data?.racesInProgress?.length ?? 0) > 0 ? (
          <section className="ref-section">
            <div className="ref-section__head">
              <div>
                <h2>Race đang diễn ra</h2>
                <p>{data?.racesInProgress?.length} race cần tiếp tục nhập kết quả.</p>
              </div>
              <button
                type="button"
                className="ref-btn ref-btn--primary"
                onClick={() => navigate("/referee/assigned-races?status=InProgress")}
              >
                Xem tất cả <ArrowRight size={14} />
              </button>
            </div>
            <RefereeToolbar>
              <RefereeSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Tìm race…"
              />
            </RefereeToolbar>
            <div className="ref-race-list">
              {filteredInProgress.length === 0 ? (
                <div className="ref-empty">Không có race đang diễn ra khớp với tìm kiếm.</div>
              ) : (
                filteredInProgress.map((race) => (
                  <RaceDashboardRow
                    key={race.id || race.raceId}
                    race={race}
                    onControl={() => navigate(`/referee/races/${race.id || race.raceId}/control`)}
                  />
                ))
              )}
            </div>
          </section>
        ) : null}

        {/* Races Today */}
        {(data?.racesToday?.length ?? 0) > 0 ? (
          <section className="ref-section">
            <div className="ref-section__head">
              <div>
                <h2>Race cần xử lý hôm nay</h2>
                <p>{data?.racesToday?.length} race được phân công hôm nay.</p>
              </div>
              <button
                type="button"
                className="ref-btn ref-btn--ghost"
                onClick={() => navigate("/referee/assigned-races")}
              >
                Xem tất cả <ArrowRight size={14} />
              </button>
            </div>
            <div className="ref-race-list">
              {filteredRacesToday.map((race) => (
                <RaceDashboardRow
                  key={race.id || race.raceId}
                  race={race}
                  onControl={() => navigate(`/referee/races/${race.id || race.raceId}/control`)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* No data */}
        {!loading && !error && (data?.racesInProgress?.length ?? 0) === 0 && (data?.racesToday?.length ?? 0) === 0 ? (
          <div className="ref-empty">
            <Calendar size={40} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>Bạn chưa có race được phân công nào hôm nay.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============== RACE DASHBOARD ROW ============== */
function RaceDashboardRow({ race, onControl }) {
  const pendingLegs = (race.legs || []).filter(
    (l) => l.status === "AwaitingSubmission" && l.mySubmissionStatus === "NotSubmitted",
  ).length;

  const submittedLegs = (race.legs || []).filter(
    (l) => l.mySubmissionStatus === "SubmittedByMe" || l.mySubmissionStatus === "WaitingOtherReferee",
  ).length;

  return (
    <div className="ref-race-row">
      <div className="ref-race-row__main">
        <div className="ref-race-row__info">
          <h3>{race.name || "Race"}</h3>
          <p>{race.tournamentName || "—"}</p>
          <p className="ref-race-row__meta">
            <span>{race.location || "Chưa cập nhật"}</span>
            <span>·</span>
            <span>{race.totalLegs || 0} leg</span>
            <span>·</span>
            <span>{race.assignedRole || "Referee"}</span>
          </p>
        </div>
        <div className="ref-race-row__progress">
          <div className="ref-race-row__progress-bar">
            <div
              className="ref-race-row__progress-fill"
              style={{
                width: `${race.totalLegs > 0 ? (submittedLegs / race.totalLegs) * 100 : 0}%`,
              }}
            />
          </div>
          <span>
            {submittedLegs}/{race.totalLegs || 0} leg submitted
          </span>
        </div>
      </div>
      <div className="ref-race-row__status">
        <span className="ref-race-row__pending">
          {pendingLegs > 0 ? `${pendingLegs} leg chờ nhập` : "Đã xong"}
        </span>
        <button type="button" className="ref-btn ref-btn--primary ref-btn--sm" onClick={onControl}>
          Vào Race Control <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* Build dashboard data from real races */
function buildDashboardFromRaces(races) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400 * 1000);

  const racesToday = races.filter(
    (r) =>
      r.status === "Scheduled" &&
      new Date(r.scheduledStartTime) >= today &&
      new Date(r.scheduledStartTime) < tomorrow,
  );
  const racesInProgress = races.filter((r) => r.status === "InProgress");
  const paused = races.filter((r) => r.status === "Paused");
  const completed = races.filter((r) => r.status === "Completed");

  const pendingLegs = races
    .flatMap((r) => r.legs || [])
    .filter((l) => l.status === "AwaitingSubmission" && l.mySubmissionStatus === "NotSubmitted");
  const mySubmittedLegs = races
    .flatMap((r) => r.legs || [])
    .filter(
      (l) => l.mySubmissionStatus === "SubmittedByMe" || l.mySubmissionStatus === "WaitingOtherReferee",
    );
  const conflictedLegs = races
    .flatMap((r) => r.legs || [])
    .filter((l) => l.status === "Conflicted");

  return {
    stats: {
      totalAssigned: races.length,
      scheduledToday: racesToday.length,
      inProgress: racesInProgress.length,
      paused: paused.length,
      completed: completed.length,
      pendingLegs: pendingLegs.length,
      mySubmittedLegs: mySubmittedLegs.length,
      conflictedLegs: conflictedLegs.length,
    },
    racesToday,
    racesInProgress,
    conflicts: conflictedLegs,
  };
}
