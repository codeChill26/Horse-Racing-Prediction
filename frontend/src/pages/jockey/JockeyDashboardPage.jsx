import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  TrendingUp,
  Calendar,
  Bell,
  ArrowRight,
  Target,
  Award,
  Clock,
  Medal,
} from "lucide-react";
import {
  JockeyPageHeader,
  JockeyStatCard,
  JockeyRaceCard,
  JockeyErrorAlert,
  JockeySkeleton,
  JockeyEmptyState,
  JockeyRaceStatusBadge,
  JockeyPositionBadge,
  JockeyAvatar,
  JockeyFormBadge,
} from "../../components/jockey/JockeyCommon";
import {
  jockeyProfileService,
  jockeyRaceService,
  jockeyNotificationService,
  jockeyStatsService,
} from "../../services/jockeyService";
import { getMockDashboard } from "../../data/mockJockeyData";
import "./JockeyDashboardPage.css";

export default function JockeyDashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [nextRace, setNextRace] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentPerformance, setRecentPerformance] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [profileData, statsData, notificationsData] = await Promise.all([
        jockeyProfileService.getProfile(),
        jockeyStatsService.getSeasonStats(),
        jockeyNotificationService.getUnreadCount(),
      ]);

      const mockData = getMockDashboard();

      setProfile(profileData);
      setNextRace(mockData.nextRace);
      setStats(statsData);
      setRecentPerformance(mockData.recentPerformance);
      setUnreadCount(notificationsData.count);
    } catch (e) {
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const handleRaceClick = (race) => {
    navigate(`/jockey/races/${race.id}`);
  };

  if (loading) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeySkeleton type="stats" count={4} />
          <div className="jock-dashboard-grid">
            <div className="jock-dashboard-section">
              <h3 className="jock-section-title">Next Race</h3>
              <JockeySkeleton type="card" count={1} />
            </div>
            <div className="jock-dashboard-section">
              <h3 className="jock-section-title">Recent Performance</h3>
              <JockeySkeleton type="list" count={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyErrorAlert message={error} onRetry={handleRefresh} />
        </div>
      </div>
    );
  }

  const greeting = `Chào buổi sáng, ${profile?.name?.split(" ").pop() || "Jockey"}`;

  return (
    <div className="jock-page">
      <div className="jock-page-content">
        <JockeyPageHeader
          eyebrow="Dashboard"
          title={greeting}
          subtitle={new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {error && <JockeyErrorAlert message={error} onRetry={handleRefresh} />}

        {/* Stats Grid */}
        <div className="jock-stats-grid">
          <JockeyStatCard
            icon={Trophy}
            label="Season Wins"
            value={stats?.wins || 0}
            subtitle={`${stats?.winRate || 0}% win rate`}
            accent
          />
          <JockeyStatCard
            icon={Target}
            label="Races This Season"
            value={stats?.races || 0}
            subtitle={`${stats?.podiums || 0} podiums`}
          />
          <JockeyStatCard
            icon={Medal}
            label="Career Wins"
            value={profile?.totalWins || 0}
            subtitle={`${profile?.totalRaces || 0} total races`}
          />
          <JockeyStatCard
            icon={Bell}
            label="Notifications"
            value={unreadCount}
            subtitle="Unread messages"
            onClick={() => navigate("/jockey/notifications")}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="jock-dashboard-grid">
          {/* Next Race Section */}
          <div className="jock-dashboard-section jock-dashboard-section--wide">
            <div className="jock-section-header">
              <h3 className="jock-section-title">
                <Calendar size={20} />
                Next Race
              </h3>
              <button
                className="jock-text-btn"
                onClick={() => navigate("/jockey/races")}
              >
                View All
                <ArrowRight size={16} />
              </button>
            </div>

            {nextRace ? (
              <div className="jock-next-race-card" onClick={() => handleRaceClick(nextRace)}>
                <div className="jock-next-race-header">
                  <JockeyRaceStatusBadge status={nextRace.status} />
                  <span className="jock-next-race-date">
                    {new Date(nextRace.raceDate).toLocaleDateString("vi-VN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {" • "}
                    {nextRace.raceTime}
                  </span>
                </div>

                <h2 className="jock-next-race-name">{nextRace.name}</h2>
                <p className="jock-next-race-tournament">{nextRace.tournamentName}</p>

                <div className="jock-next-race-details">
                  <div className="jock-next-race-detail">
                    <span className="jock-detail-label">Distance</span>
                    <span className="jock-detail-value">{nextRace.distance}m</span>
                  </div>
                  <div className="jock-next-race-detail">
                    <span className="jock-detail-label">Surface</span>
                    <span className="jock-detail-value">{nextRace.surface}</span>
                  </div>
                  <div className="jock-next-race-detail">
                    <span className="jock-detail-label">Gate</span>
                    <span className="jock-detail-value">#{nextRace.gateNumber}</span>
                  </div>
                  <div className="jock-next-race-detail">
                    <span className="jock-detail-label">Horse</span>
                    <span className="jock-detail-value">{nextRace.myHorse?.horseName}</span>
                  </div>
                </div>

                <div className="jock-next-race-footer">
                  <div className="jock-odds-display">
                    <span className="jock-odds-label">Odds</span>
                    <span className="jock-odds-value">{nextRace.odds}</span>
                  </div>
                  <div className="jock-form-display">
                    <span className="jock-form-label">Form</span>
                    <JockeyFormBadge form={nextRace.form} />
                  </div>
                  <button className="jock-btn jock-btn--primary">
                    Race Details
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <JockeyEmptyState
                icon={Calendar}
                title="No Upcoming Races"
                description="You don't have any races scheduled. Check back later or view your schedule."
                action={() => navigate("/jockey/schedule")}
                actionLabel="View Schedule"
              />
            )}
          </div>

          {/* Profile Quick View */}
          <div className="jock-dashboard-section">
            <div className="jock-section-header">
              <h3 className="jock-section-title">
                <Award size={20} />
                Profile
              </h3>
              <button
                className="jock-text-btn"
                onClick={() => navigate("/jockey/profile")}
              >
                View Profile
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="jock-profile-quick">
              <JockeyAvatar
                name={profile?.name}
                avatar={profile?.avatar}
                size="lg"
              />
              <div className="jock-profile-info">
                <h4 className="jock-profile-name">{profile?.name}</h4>
                <p className="jock-profile-license">License: {profile?.licenseNumber}</p>
                <div className="jock-profile-rating">
                  <span className="jock-rating-value">{profile?.rating}</span>
                  <span className="jock-rating-stars">
                    {"★".repeat(Math.floor(profile?.rating || 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="jock-profile-stats">
              <div className="jock-profile-stat">
                <span className="jock-profile-stat-value">{profile?.yearsExperience}</span>
                <span className="jock-profile-stat-label">Years Exp</span>
              </div>
              <div className="jock-profile-stat">
                <span className="jock-profile-stat-value">{profile?.winRate}%</span>
                <span className="jock-profile-stat-label">Win Rate</span>
              </div>
              <div className="jock-profile-stat">
                <span className="jock-profile-stat-value">{profile?.topThreeRate}%</span>
                <span className="jock-profile-stat-label">Podium Rate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Performance */}
        <div className="jock-dashboard-section">
          <div className="jock-section-header">
            <h3 className="jock-section-title">
              <TrendingUp size={20} />
              Recent Performance
            </h3>
          </div>

          {recentPerformance.length > 0 ? (
            <div className="jock-performance-list">
              {recentPerformance.map((perf, index) => (
                <div key={index} className="jock-performance-item">
                  <div className="jock-performance-position">
                    <JockeyPositionBadge position={perf.position} />
                  </div>
                  <div className="jock-performance-info">
                    <h4 className="jock-performance-name">{perf.raceName}</h4>
                    <span className="jock-performance-date">
                      {new Date(perf.date).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="jock-performance-time">
                    <Clock size={14} />
                    <span>{perf.time}s</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <JockeyEmptyState
              icon={TrendingUp}
              title="No Recent Races"
              description="Your race history will appear here after completing races."
            />
          )}
        </div>
      </div>
    </div>
  );
}
