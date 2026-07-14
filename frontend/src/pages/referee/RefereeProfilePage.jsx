/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee Profile Page
 * Route: /referee/profile
 *
 * Features:
 * - Display referee profile
 * - Show statistics
 * - Performance chart with Recharts
 *
 * FIXES:
 * - BUG-REF-004: dùng refereeProfileService.getProfile()
 * - A11y: aria labels, keyboard nav
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Trophy,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { refereeProfileService } from "../../services/refereeService";
import "./RefereeProfilePage.css";

// ============================================================
// MOCK DATA
// ============================================================
const MOCK_MONTHLY_DATA = [
  { month: "T1", submissions: 12, conflicts: 1 },
  { month: "T2", submissions: 15, conflicts: 2 },
  { month: "T3", submissions: 18, conflicts: 0 },
  { month: "T4", submissions: 14, conflicts: 1 },
  { month: "T5", submissions: 20, conflicts: 3 },
  { month: "T6", submissions: 22, conflicts: 1 },
  { month: "T7", submissions: 19, conflicts: 0 },
  { month: "T8", submissions: 16, conflicts: 0 },
  { month: "T9", submissions: 8, conflicts: 0 },
  { month: "T10", submissions: 0, conflicts: 0 },
  { month: "T11", submissions: 0, conflicts: 0 },
  { month: "T12", submissions: 0, conflicts: 0 },
];

// ============================================================
// PROFILE CARD
// ============================================================
function ProfileCard({ user }) {
  return (
    <div className="profile-card" role="region" aria-label="Thông tin cá nhân trọng tài">
      <div className="profile-card__avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={`Avatar của ${user.fullName}`} className="profile-card__avatar-img" />
        ) : (
          <div className="profile-card__avatar-placeholder" aria-hidden="true">
            <User size={48} />
          </div>
        )}
        <span className="profile-card__role-badge" aria-label={`Vai trò: ${user.roleCode || user.roleName || "Trọng tài"}`}>
          {user.roleCode || user.roleName || "Trọng tài"}
        </span>
      </div>

      <div className="profile-card__info">
        <h2 className="profile-card__name">{user.fullName}</h2>

        <div className="profile-card__detail">
          <Mail size={14} aria-hidden="true" />
          <span>{user.email}</span>
        </div>

        <div className="profile-card__detail">
          <Phone size={14} aria-hidden="true" />
          <span>{user.phoneNumber || user.phone || "—"}</span>
        </div>

        {user.assignedRegion && (
          <div className="profile-card__detail">
            <BarChart2 size={14} aria-hidden="true" />
            <span>Khu vực: {user.assignedRegion}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STATISTIC CARD
// ============================================================
function StatisticCard({ icon: Icon, label, value, suffix, variant, description }) {
  const variants = {
    default: "statistic-card--default",
    primary: "statistic-card--primary",
    success: "statistic-card--success",
    warning: "statistic-card--warning",
    danger: "statistic-card--danger",
  };

  return (
    <div className={`statistic-card ${variants[variant] || variants.default}`}>
      <div className="statistic-card__icon">
        <Icon size={24} />
      </div>
      <div className="statistic-card__content">
        <span className="statistic-card__label">{label}</span>
        <div className="statistic-card__value">
          <span className="statistic-card__number">{value}</span>
          {suffix && <span className="statistic-card__suffix">{suffix}</span>}
        </div>
        {description && (
          <span className="statistic-card__description">{description}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PERFORMANCE CHART
// ============================================================
// CHART TOOLTIP — defined outside component to avoid recreating on each render
// ============================================================
function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip__label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="chart-tooltip__value" style={{ color: entry.color }}>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// ============================================================
function PerformanceChart({ data }) {
  const [chartType, setChartType] = useState("bar");

  const hasData = data.some((d) => d.submissions > 0 || d.conflicts > 0);

  if (!hasData) {
    return (
      <div className="performance-chart">
        <div className="performance-chart__header">
          <h3 className="performance-chart__title">
            <TrendingUp size={16} />
            Biểu đồ hiệu suất
          </h3>
        </div>
        <div className="performance-chart__empty">
          <BarChart2 size={48} />
          <p>Chưa có dữ liệu biểu đồ.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-chart">
      <div className="performance-chart__header">
        <h3 className="performance-chart__title">
          <TrendingUp size={16} />
          Biểu đồ hiệu suất
        </h3>

        <div className="performance-chart__toggle">
          <button
            type="button"
            className={`performance-chart__toggle-btn${chartType === "bar" ? " performance-chart__toggle-btn--active" : ""}`}
            onClick={() => setChartType("bar")}
          >
            Cột
          </button>
          <button
            type="button"
            className={`performance-chart__toggle-btn${chartType === "line" ? " performance-chart__toggle-btn--active" : ""}`}
            onClick={() => setChartType("line")}
          >
            Đường
          </button>
        </div>
      </div>

      <div className="performance-chart__legend">
        <span className="performance-chart__legend-item performance-chart__legend-item--submissions">
          <span className="performance-chart__legend-dot" />
          Số lần submit
        </span>
        <span className="performance-chart__legend-item performance-chart__legend-item--conflicts">
          <span className="performance-chart__legend-dot" />
          Số conflict
        </span>
      </div>

      <div className="performance-chart__container">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "#8b949e", fontSize: 12 }}
                axisLine={{ stroke: "#30363d" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8b949e", fontSize: 12 }}
                axisLine={{ stroke: "#30363d" }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="submissions"
                name="Số lần submit"
                fill="#8dd6a6"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="conflicts"
                name="Số conflict"
                fill="#ffb4ab"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "#8b949e", fontSize: 12 }}
                axisLine={{ stroke: "#30363d" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8b949e", fontSize: 12 }}
                axisLine={{ stroke: "#30363d" }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="submissions"
                name="Số lần submit"
                stroke="#8dd6a6"
                strokeWidth={2}
                dot={{ fill: "#8dd6a6", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: "#8dd6a6", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="conflicts"
                name="Số conflict"
                stroke="#ffb4ab"
                strokeWidth={2}
                dot={{ fill: "#ffb4ab", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: "#ffb4ab", strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyStats() {
  return (
    <div className="profile-empty">
      <BarChart2 size={48} />
      <h3>Chưa có dữ liệu thống kê</h3>
      <p>Dữ liệu thống kê của bạn sẽ xuất hiện sau khi bạn bắt đầu làm việc.</p>
    </div>
  );
}

// ============================================================
// SKELETON
// ============================================================
function PageSkeleton() {
  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        <div className="profile-page__skeleton-header">
          <div className="skeleton-card skeleton-card--wide">
            <div className="skeleton-avatar" />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--medium" />
              <div className="skeleton-line skeleton-line--short" />
            </div>
          </div>
        </div>

        <div className="profile-page__stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>

        <div className="skeleton-card skeleton-card--chart" />
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RefereeProfilePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);

  // Fetch profile on mount with cancellation guard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const profile = await refereeProfileService.getProfile();
        if (cancelled) return;
        setUser(profile);
        setStats(profile.stats || {
          totalRaces: profile.totalRacesAssigned || 0,
          totalSubmissions: profile.totalLegsSubmitted || 0,
          autoMatchRate: profile.autoMatchedRate || 0,
          conflictCount: profile.conflictCount || 0,
        });
        setMonthlyData(MOCK_MONTHLY_DATA);
      } catch (e) {
        if (!cancelled) console.error("Failed to load profile:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading state
  if (loading) {
    return <PageSkeleton />;
  }

  const hasStats = stats && (stats.totalRaces > 0 || stats.totalSubmissions > 0);

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        {/* Back Button */}
        <button
          type="button"
          className="profile-btn profile-btn--back"
          onClick={() => navigate("/referee")}
        >
          <ArrowLeft size={16} /> Quay lại Dashboard
        </button>

        {/* Page Header */}
        <header className="profile-page__header">
          <p className="profile-page__eyebrow">Referee</p>
          <h1 className="profile-page__title">Hồ sơ cá nhân</h1>
        </header>

        <div className="profile-page__content">
          {/* Left Column: Profile */}
          <div className="profile-page__left">
            <ProfileCard user={user} />
          </div>

          {/* Right Column: Stats & Chart */}
          <div className="profile-page__right">
            {/* Statistics */}
            {hasStats ? (
              <div className="profile-page__stats" role="region" aria-label="Thống kê hiệu suất trọng tài">
                <h3 className="profile-page__section-title">
                  <Trophy size={16} aria-hidden="true" />
                  Thống kê
                </h3>
                <div className="profile-page__stats-grid">
                  <StatisticCard
                    icon={Trophy}
                    label="Tổng số race"
                    value={stats.totalRaces}
                    variant="default"
                    description="Race đã được phân công"
                  />
                  <StatisticCard
                    icon={FileText}
                    label="Tổng submissions"
                    value={stats.totalSubmissions}
                    variant="primary"
                    description="Lần submit kết quả"
                  />
                  <StatisticCard
                    icon={CheckCircle2}
                    label="Tỷ lệ khớp tự động"
                    value={stats.autoMatchRate}
                    suffix="%"
                    variant="success"
                    description="Kết quả khớp với trọng tài còn lại"
                  />
                  <StatisticCard
                    icon={AlertTriangle}
                    label="Số conflict"
                    value={stats.conflictCount}
                    variant="warning"
                    description="Xung đột cần được giải quyết"
                  />
                </div>
              </div>
            ) : (
              <div className="profile-page__stats-empty">
                <EmptyStats />
              </div>
            )}

            {/* Performance Chart */}
            <PerformanceChart data={monthlyData} />
          </div>
        </div>
      </div>
    </div>
  );
}
