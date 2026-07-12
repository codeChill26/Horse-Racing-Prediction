import { useState, useEffect, useCallback } from "react";
import {
  User,
  Award,
  Trophy,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  Edit,
  Save,
  X,
  Shield,
  Star,
  Medal,
  Target,
} from "lucide-react";
import {
  JockeyPageHeader,
  JockeyAvatar,
  JockeyErrorAlert,
  JockeySkeleton,
  JockeySuccessAlert,
} from "../../components/jockey/JockeyCommon";
import { MyViolationsList } from "../../components/shared/MyViolationsList";
import { jockeyProfileService, jockeyStatsService } from "../../services/jockeyService";
import "./JockeyProfilePage.css";

export default function JockeyProfilePage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchProfileData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [profileData, statsData] = await Promise.all([
        jockeyProfileService.getProfile(),
        jockeyStatsService.getCareerStats(),
      ]);
      setProfile(profileData);
      setStats(statsData);
      setEditForm({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
      });
    } catch (e) {
      setError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleEdit = () => {
    setEditForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSave = async () => {
    try {
      await jockeyProfileService.updateProfile(editForm);
      setProfile({ ...profile, ...editForm });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      alert(e.message || "Failed to update profile");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await jockeyProfileService.updateAvatar(file);
      setProfile({ ...profile, avatar: result.avatarUrl });
    } catch (e) {
      alert(e.message || "Failed to update avatar");
    }
  };

  if (loading) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="Profile"
            title="My Profile"
            subtitle="Manage your jockey profile"
          />
          <div className="jock-profile-grid">
            <JockeySkeleton type="card" count={1} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="Profile"
            title="My Profile"
            subtitle="Manage your jockey profile"
          />
          <JockeyErrorAlert message={error} onRetry={() => fetchProfileData()} />
        </div>
      </div>
    );
  }

  return (
    <div className="jock-page">
      <div className="jock-page-content">
        <JockeyPageHeader
          eyebrow="Profile"
          title="My Profile"
          subtitle="Manage your jockey profile"
          onRefresh={() => fetchProfileData(true)}
          refreshing={refreshing}
        />

        {error && <JockeyErrorAlert message={error} onRetry={() => fetchProfileData()} />}
        {saveSuccess && (
          <JockeySuccessAlert
            message="Profile updated successfully!"
            onDismiss={() => setSaveSuccess(false)}
          />
        )}

        {/* Profile Header Card */}
        <div className="jock-profile-card">
          <div className="jock-profile-header">
            <div className="jock-profile-avatar-section">
              <div className="jock-avatar-wrapper">
                <JockeyAvatar
                  name={profile?.name}
                  avatar={profile?.avatar}
                  size="xl"
                />
                <label className="jock-avatar-edit-btn">
                  <Edit size={16} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              <div className="jock-profile-identity">
                <h2 className="jock-profile-name">{profile?.name}</h2>
                <p className="jock-profile-license">
                  <Shield size={14} />
                  License: {profile?.licenseNumber}
                </p>
                <p className="jock-profile-expiry">
                  Valid until: {new Date(profile?.licenseExpiry).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>

            <div className="jock-profile-rating-section">
              <div className="jock-rating-display">
                <Star size={24} fill="#f59e0b" stroke="#f59e0b" />
                <span className="jock-rating-number">{profile?.rating}</span>
                <span className="jock-rating-count">({profile?.totalRatings} ratings)</span>
              </div>
            </div>
          </div>

          {/* Career Stats */}
          <div className="jock-profile-stats-section">
            <h3 className="jock-section-subtitle">Career Statistics</h3>
            <div className="jock-profile-stats-grid">
              <div className="jock-profile-stat-item">
                <Trophy size={20} />
                <div className="jock-profile-stat-content">
                  <span className="jock-profile-stat-value">{stats?.totalRaces}</span>
                  <span className="jock-profile-stat-label">Total Races</span>
                </div>
              </div>
              <div className="jock-profile-stat-item">
                <Medal size={20} />
                <div className="jock-profile-stat-content">
                  <span className="jock-profile-stat-value">{stats?.totalWins}</span>
                  <span className="jock-profile-stat-label">Wins</span>
                </div>
              </div>
              <div className="jock-profile-stat-item">
                <Target size={20} />
                <div className="jock-profile-stat-content">
                  <span className="jock-profile-stat-value">{stats?.winRate}%</span>
                  <span className="jock-profile-stat-label">Win Rate</span>
                </div>
              </div>
              <div className="jock-profile-stat-item">
                <Award size={20} />
                <div className="jock-profile-stat-content">
                  <span className="jock-profile-stat-value">{stats?.totalTopThree}</span>
                  <span className="jock-profile-stat-label">Podiums</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="jock-profile-info-section">
            <div className="jock-profile-info-header">
              <h3 className="jock-section-subtitle">Personal Information</h3>
              {!isEditing ? (
                <button className="jock-btn jock-btn--secondary" onClick={handleEdit}>
                  <Edit size={16} />
                  Edit
                </button>
              ) : (
                <div className="jock-edit-actions">
                  <button className="jock-btn jock-btn--secondary" onClick={handleCancelEdit}>
                    <X size={16} />
                    Cancel
                  </button>
                  <button className="jock-btn jock-btn--primary" onClick={handleSave}>
                    <Save size={16} />
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="jock-profile-info-grid">
              <div className="jock-profile-info-item">
                <div className="jock-info-icon">
                  <User size={18} />
                </div>
                <div className="jock-info-content">
                  <span className="jock-info-label">Full Name</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="jock-info-input"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  ) : (
                    <span className="jock-info-value">{profile?.name}</span>
                  )}
                </div>
              </div>

              <div className="jock-profile-info-item">
                <div className="jock-info-icon">
                  <Mail size={18} />
                </div>
                <div className="jock-info-content">
                  <span className="jock-info-label">Email</span>
                  {isEditing ? (
                    <input
                      type="email"
                      className="jock-info-input"
                      value={editForm.email || ""}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  ) : (
                    <span className="jock-info-value">{profile?.email}</span>
                  )}
                </div>
              </div>

              <div className="jock-profile-info-item">
                <div className="jock-info-icon">
                  <Phone size={18} />
                </div>
                <div className="jock-info-content">
                  <span className="jock-info-label">Phone</span>
                  {isEditing ? (
                    <input
                      type="tel"
                      className="jock-info-input"
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  ) : (
                    <span className="jock-info-value">{profile?.phone}</span>
                  )}
                </div>
              </div>

              <div className="jock-profile-info-item">
                <div className="jock-info-icon">
                  <Calendar size={18} />
                </div>
                <div className="jock-info-content">
                  <span className="jock-info-label">Date of Birth</span>
                  <span className="jock-info-value">
                    {new Date(profile?.dateOfBirth).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>

              <div className="jock-profile-info-item">
                <div className="jock-info-icon">
                  <TrendingUp size={18} />
                </div>
                <div className="jock-info-content">
                  <span className="jock-info-label">Years of Experience</span>
                  <span className="jock-info-value">{profile?.yearsExperience} years</span>
                </div>
              </div>

              <div className="jock-profile-info-item">
                <div className="jock-info-icon">
                  <User size={18} />
                </div>
                <div className="jock-info-content">
                  <span className="jock-info-label">Height / Weight</span>
                  <span className="jock-info-value">
                    {profile?.height}cm / {profile?.weight}kg
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FLOW 6: Vi phạm của tôi — lịch sử vi phạm & điểm phạt (nếu có) */}
          <section className="jock-profile-card jock-profile-card--wide">
            <MyViolationsList />
          </section>

          {/* Achievements */}
          {profile?.achievements && profile.achievements.length > 0 && (
            <div className="jock-profile-achievements-section">
              <h3 className="jock-section-subtitle">Achievements</h3>
              <div className="jock-achievements-grid">
                {profile.achievements.map((achievement, index) => (
                  <div key={index} className="jock-achievement-card">
                    <div className="jock-achievement-icon">
                      <Award size={24} />
                    </div>
                    <div className="jock-achievement-content">
                      <h4 className="jock-achievement-title">{achievement.title}</h4>
                      <p className="jock-achievement-year">{achievement.year}</p>
                      <p className="jock-achievement-description">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
