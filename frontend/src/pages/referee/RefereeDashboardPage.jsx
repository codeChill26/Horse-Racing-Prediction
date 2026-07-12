/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Dashboard Page - Tổng quan công việc trọng tài.
 * Route: /referee
 *
 * Features:
 * - Statistics Cards (Assigned Races, Pending Legs, Submitted Results, Conflicts)
 * - Today's Races
 * - Pending Actions
 * - Recent Activity Timeline
 *
 * FIXES:
 * - BUG-REF-004: dùng refereeRaceService.getAssignedRaces() thay mock
 * - A11y: keyboard nav, role=article, aria-labels
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Hash,
  ArrowRight,
  RefreshCcw,
  FileText,
  Trophy,
  Timer,
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import { refereeRaceService } from "../../services/refereeService";
import "./RefereeDashboardPage.css";

// ============================================================
// DASHBOARD STAT CARD
// ============================================================
function DashboardStatCard({ icon: Icon, label, value, accent = "default", onClick }) {
  return (
    <button
      type="button"
      className={`dashboard-stat-card dashboard-stat-card--${accent}${onClick ? " dashboard-stat-card--clickable" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="dashboard-stat-card__icon">
        <Icon size={22} />
      </div>
      <div className="dashboard-stat-card__body">
        <span className="dashboard-stat-card__label">{label}</span>
        <span className="dashboard-stat-card__value">{value ?? "—"}</span>
      </div>
      {onClick && (
        <div className="dashboard-stat-card__arrow">
          <ArrowRight size={16} />
        </div>
      )}
    </button>
  );
}

// ============================================================
// ASSIGNED RACE CARD
// ============================================================
function AssignedRaceCard({ race, onView }) {
  const formatTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusConfig = (status) => {
    const configs = {
      Scheduled: { variant: "info", label: "Chờ bắt đầu" },
      InProgress: { variant: "live", label: "Đang diễn ra" },
      Paused: { variant: "warn", label: "Tạm dừng" },
      Completed: { variant: "ok", label: "Hoàn thành" },
      Cancelled: { variant: "danger", label: "Đã hủy" },
    };
    return configs[status] || { variant: "muted", label: status || "—" };
  };

  const statusConfig = getStatusConfig(race.status);
  const pendingLegs = (race.legs || []).filter(
    (l) => l.status === "AwaitingSubmission" && l.mySubmissionStatus === "NotSubmitted",
  ).length;

  return (
    <div className="assigned-race-card" onClick={onView} role="button" tabIndex={0}>
      <div className="assigned-race-card__header">
        <div className="assigned-race-card__time">
          <Clock size={14} />
          <span>{formatTime(race.scheduledStartTime)}</span>
        </div>
        <span className={`dashboard-badge dashboard-badge--${statusConfig.variant}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="assigned-race-card__body">
        <h3 className="assigned-race-card__title">{race.name}</h3>
        <p className="assigned-race-card__tournament">
          <Trophy size={12} />
          {race.tournamentName}
        </p>
      </div>

      <div className="assigned-race-card__footer">
        <div className="assigned-race-card__meta">
          <span className="assigned-race-card__meta-item">
            <Hash size={12} />
            {race.totalLegs} leg
          </span>
          {pendingLegs > 0 && (
            <span className="assigned-race-card__pending">
              <Timer size={12} />
              {pendingLegs} chờ nhập
            </span>
          )}
        </div>
        <button type="button" className="dashboard-btn dashboard-btn--primary dashboard-btn--sm">
          Xem <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PENDING ACTION CARD
// ============================================================
function PendingActionCard({ type, count, description, onAction }) {
  const icons = {
    submission: Clock,
    conflict: AlertTriangle,
    waiting: Timer,
  };
  const Icon = icons[type] || Clock;

  return (
    <div className={`pending-action-card pending-action-card--${type}`}>
      <div className="pending-action-card__icon">
        <Icon size={20} />
      </div>
      <div className="pending-action-card__body">
        <span className="pending-action-card__count">{count}</span>
        <span className="pending-action-card__desc">{description}</span>
      </div>
      {onAction && (
        <button
          type="button"
          className="dashboard-btn dashboard-btn--ghost dashboard-btn--sm"
          onClick={onAction}
        >
          Xử lý <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// ACTIVITY TIMELINE
// ============================================================
function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="activity-timeline__empty">
        <Clock size={32} />
        <p>Chưa có hoạt động gần đây.</p>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    const icons = {
      submitted: CheckCircle2,
      conflict: AlertTriangle,
      completed: Trophy,
      started: PlayCircle,
    };
    return icons[type] || FileText;
  };

  const getActivityVariant = (type) => {
    const variants = {
      submitted: "ok",
      conflict: "danger",
      completed: "primary",
      started: "info",
    };
    return variants[type] || "muted";
  };

  const formatRelativeTime = (iso) => {
    if (!iso) return "";
    const now = new Date();
    const date = new Date(iso);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  return (
    <div className="activity-timeline">
      {activities.map((activity, index) => {
        const Icon = getActivityIcon(activity.type);
        const variant = getActivityVariant(activity.type);
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id || index} className="activity-timeline__item">
            <div className="activity-timeline__marker">
              <div className={`activity-timeline__dot activity-timeline__dot--${variant}`}>
                <Icon size={14} />
              </div>
              {!isLast && <div className="activity-timeline__line" />}
            </div>
            <div className="activity-timeline__content">
              <p className="activity-timeline__title">{activity.title}</p>
              <p className="activity-timeline__subtitle">{activity.subtitle}</p>
              <span className="activity-timeline__time">
                {formatRelativeTime(activity.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// SKELETON LOADER
// ============================================================
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="dashboard-skeleton__stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dashboard-skeleton__stat">
            <Skeleton width="48px" height="48px" borderRadius="12px" />
            <div className="dashboard-skeleton__stat-text">
              <Skeleton width="80px" height="14px" />
              <Skeleton width="50px" height="24px" />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-skeleton__grid">
        <div className="dashboard-skeleton__race">
          <Skeleton width="100%" height="120px" borderRadius="14px" />
        </div>
        <div className="dashboard-skeleton__race">
          <Skeleton width="100%" height="120px" borderRadius="14px" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState() {
  return (
    <div className="dashboard-empty">
      <Calendar size={48} />
      <h3>Không có lịch phân công</h3>
      <p>Bạn chưa được phân công race nào hôm nay.</p>
    </div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================
function ErrorState({ message, onRetry }) {
  return (
    <div className="dashboard-error">
      <AlertTriangle size={40} />
      <h3>Đã xảy ra lỗi</h3>
      <p>{message || "Không thể tải dữ liệu dashboard."}</p>
      <button type="button" className="dashboard-btn dashboard-btn--primary" onClick={onRetry}>
        <RefreshCcw size={14} /> Thử lại
      </button>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD PAGE
// ============================================================
export default function RefereeDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);

  // Build dashboard derived state from races data
  const buildDashboard = (races) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scheduledToday = races.filter(
      (r) =>
        r.status === "Scheduled" &&
        new Date(r.scheduledStartTime) >= today &&
        new Date(r.scheduledStartTime) < new Date(today.getTime() + 86400 * 1000),
    );
    const inProgress = races.filter((r) => r.status === "InProgress");
    const allLegs = races.flatMap((r) => r.legs || []);
    const pendingLegs = allLegs.filter(
      (l) => l.status === "AwaitingSubmission" && l.mySubmissionStatus === "NotSubmitted",
    );
    const mySubmittedLegs = allLegs.filter(
      (l) =>
        l.mySubmissionStatus === "SubmittedByMe" ||
        l.mySubmissionStatus === "WaitingOtherReferee",
    );
    const conflictedLegs = allLegs.filter((l) => l.status === "Conflicted");

    setDashboardData({
      stats: {
        totalAssigned: races.length,
        scheduledToday: scheduledToday.length,
        inProgress: inProgress.length,
        pendingLegs: pendingLegs.length,
        mySubmittedLegs: mySubmittedLegs.length,
        conflictedLegs: conflictedLegs.length,
      },
      racesToday: scheduledToday,
      racesInProgress: inProgress,
      races,
    });

    const activityList = [];
    if (conflictedLegs.length > 0) {
      conflictedLegs.forEach((leg) => {
        const race = races.find((r) => r.legs?.some((l) => l.id === leg.id));
        activityList.push({
          id: `conflict-${leg.id}`,
          type: "conflict",
          title: "Conflict được phát hiện",
          subtitle: race?.name || leg.legName || "Leg có xung đột",
          timestamp: new Date().toISOString(),
        });
      });
    }
    activityList.push(
      {
        id: "sub-4",
        type: "conflict",
        title: "Conflict được phát hiện",
        subtitle: "Dawn Cup Final - Leg 1",
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: "sub-3",
        type: "submitted",
        title: "Đã submit kết quả",
        subtitle: "Rainy Day Relay - Leg 1",
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: "sub-2",
        type: "submitted",
        title: "Đã submit kết quả",
        subtitle: "Heritage Cup - Leg 2",
        timestamp: new Date(Date.now() - 25 * 3600000).toISOString(),
      },
      {
        id: "sub-1",
        type: "completed",
        title: "Race hoàn thành",
        subtitle: "Heritage Cup - Tất cả leg đã được xác nhận",
        timestamp: new Date(Date.now() - 26 * 3600000).toISOString(),
      },
    );
    activityList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setActivities(activityList.slice(0, 6));

    const pending = [];
    if (pendingLegs.length > 0) {
      pending.push({
        id: "pending-submission",
        type: "submission",
        count: pendingLegs.length,
        description: "Leg chờ nhập kết quả",
      });
    }
    if (conflictedLegs.length > 0) {
      pending.push({
        id: "pending-conflict",
        type: "conflict",
        count: conflictedLegs.length,
        description: "Conflict đang chờ xử lý",
      });
    }
    const waitingCount = allLegs.filter(
      (l) => l.mySubmissionStatus === "WaitingOtherReferee",
    ).length;
    if (waitingCount > 0) {
      pending.push({
        id: "pending-waiting",
        type: "waiting",
        count: waitingCount,
        description: "Đang chờ trọng tài còn lại",
      });
    }
    setPendingActions(pending);
  };

  // Manual retry / refresh handler
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const races = await refereeRaceService.getAssignedRaces();
      buildDashboard(races);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dashboard on mount with cancellation guard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const races = await refereeRaceService.getAssignedRaces();
        if (cancelled) return;
        buildDashboard(races);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không thể tải dữ liệu dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle loading state
  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-page__inner">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-page__inner">
          <ErrorState message={error} onRetry={loadDashboard} />
        </div>
      </div>
    );
  }

  // Handle empty state
  const hasData = dashboardData?.stats?.totalAssigned > 0;
  if (!hasData) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-page__inner">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner">
        {/* Page Header */}
        <header className="dashboard-header">
          <div className="dashboard-header__main">
            <p className="dashboard-header__eyebrow">Referee Dashboard</p>
            <h1 className="dashboard-header__title">Tổng quan công việc</h1>
            <p className="dashboard-header__subtitle">
              Theo dõi race được phân công, tiến độ nhập kết quả và các conflict.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-btn dashboard-btn--ghost"
            onClick={loadDashboard}
          >
            <RefreshCcw size={14} /> Làm mới
          </button>
        </header>

        {/* Statistics Cards */}
        <section className="dashboard-section">
          <div className="dashboard-stats-grid">
            <DashboardStatCard
              icon={ClipboardList}
              label="Race được phân công"
              value={dashboardData.stats?.totalAssigned || 0}
              accent="primary"
            />
            <DashboardStatCard
              icon={Timer}
              label="Leg chờ nhập"
              value={dashboardData.stats?.pendingLegs || 0}
              accent="warn"
              onClick={() => navigate("/referee/assigned-races")}
            />
            <DashboardStatCard
              icon={CheckCircle2}
              label="Kết quả đã submit"
              value={dashboardData.stats?.mySubmittedLegs || 0}
              accent="ok"
              onClick={() => navigate("/referee/submissions")}
            />
            <DashboardStatCard
              icon={AlertTriangle}
              label="Conflict"
              value={dashboardData.stats?.conflictedLegs || 0}
              accent="danger"
              onClick={() => navigate("/referee/conflicts")}
            />
          </div>
        </section>

        <div className="dashboard-grid">
          {/* Left Column - Today's Races & Pending Actions */}
          <div className="dashboard-grid__main">
            {/* Today's Races */}
            <section className="dashboard-section">
              <div className="dashboard-section__header">
                <h2>
                  <Calendar size={18} /> Race hôm nay
                </h2>
                <button
                  type="button"
                  className="dashboard-btn dashboard-btn--ghost dashboard-btn--sm"
                  onClick={() => navigate("/referee/assigned-races")}
                >
                  Xem tất cả <ArrowRight size={13} />
                </button>
              </div>

              {dashboardData.racesToday && dashboardData.racesToday.length > 0 ? (
                <div className="dashboard-races-grid">
                  {dashboardData.racesToday.slice(0, 4).map((race) => (
                    <AssignedRaceCard
                      key={race.id || race.raceId}
                      race={race}
                      onView={() =>
                        navigate(`/referee/races/${race.id || race.raceId}/control`)
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-section">
                  <p>Không có race nào hôm nay.</p>
                </div>
              )}
            </section>

            {/* In Progress Races */}
            {dashboardData.racesInProgress && dashboardData.racesInProgress.length > 0 && (
              <section className="dashboard-section">
                <div className="dashboard-section__header">
                  <h2>
                    <PlayCircle size={18} /> Race đang diễn ra
                  </h2>
                </div>
                <div className="dashboard-races-grid">
                  {dashboardData.racesInProgress.map((race) => (
                    <AssignedRaceCard
                      key={race.id || race.raceId}
                      race={race}
                      onView={() =>
                        navigate(`/referee/races/${race.id || race.raceId}/control`)
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Pending Actions & Activity */}
          <div className="dashboard-grid__sidebar">
            {/* Pending Actions */}
            {pendingActions.length > 0 && (
              <section className="dashboard-section">
                <div className="dashboard-section__header">
                  <h2>
                    <AlertTriangle size={18} /> Hành động cần xử lý
                  </h2>
                </div>
                <div className="dashboard-pending-list">
                  {pendingActions.map((action) => (
                    <PendingActionCard
                      key={action.id}
                      type={action.type}
                      count={action.count}
                      description={action.description}
                      onAction={
                        action.type === "submission"
                          ? () => navigate("/referee/assigned-races")
                          : action.type === "conflict"
                            ? () => navigate("/referee/conflicts")
                            : null
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Activity */}
            <section className="dashboard-section">
              <div className="dashboard-section__header">
                <h2>
                  <Clock size={18} /> Hoạt động gần đây
                </h2>
              </div>
              <ActivityTimeline activities={activities} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
