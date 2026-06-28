/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee — Profile Page.
 * TODO: Backend chưa có API riêng cho referee profile.
 * Dùng GET /api/auth/profile (thật) + stats mock.
 */

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Mail, Phone, Award, CheckCircle2, AlertTriangle, Clock, Trophy } from "lucide-react";
import {
  RefereePageHeader,
  RefereeErrorAlert,
} from "../../components/referee/RefereeCommon";
import { refereeProfileService } from "../../services/refereeService";
import "./RefereeProfilePage.css";

export default function RefereeProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refereeProfileService.getProfile();
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="ref-page">
        <div className="ref-page-inner">
          <div className="ref-profile-loading">
            <div className="ref-profile-hero-skeleton" />
            <div className="ref-profile-stats-skeleton" />
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
          title="Hồ sơ cá nhân"
          subtitle="Thông tin tài khoản và thống kê công việc của bạn."
          onRefresh={load}
          refreshing={loading}
        />

        {error ? <RefereeErrorAlert message={error} onRetry={load} /> : null}

        {profile ? (
          <>
            {/* Hero Card */}
            <div className="ref-profile-hero">
              <div className="ref-profile-hero__avatar">
                {profile.fullName
                  ? profile.fullName.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase()).join("")
                  : "TT"}
              </div>
              <div className="ref-profile-hero__info">
                <h2>{profile.fullName || "Trọng tài"}</h2>
                <div className="ref-profile-hero__badges">
                  <span className="ref-badge ref-badge--warn">
                    <ShieldCheck size={12} />
                    {profile.roleName || "Trọng tài"}
                  </span>
                  {profile.isActive ? (
                    <span className="ref-badge ref-badge--ok">
                      <CheckCircle2 size={12} /> Đang hoạt động
                    </span>
                  ) : (
                    <span className="ref-badge ref-badge--danger">
                      <AlertTriangle size={12} /> Tài khoản bị khóa
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="ref-profile-stats-grid">
              <div className="ref-profile-stat-card">
                <div className="ref-profile-stat-card__icon">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="ref-profile-stat-card__label">Race được phân công</p>
                  <p className="ref-profile-stat-card__value">
                    {profile.stats?.totalRacesAssigned ?? "—"}
                  </p>
                </div>
              </div>
              <div className="ref-profile-stat-card">
                <div className="ref-profile-stat-card__icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="ref-profile-stat-card__label">Leg đã submit</p>
                  <p className="ref-profile-stat-card__value">
                    {profile.stats?.totalLegsSubmitted ?? "—"}
                  </p>
                </div>
              </div>
              <div className="ref-profile-stat-card">
                <div className="ref-profile-stat-card__icon ref-profile-stat-card__icon--primary">
                  <Award size={20} />
                </div>
                <div>
                  <p className="ref-profile-stat-card__label">Tỷ lệ AutoMatched</p>
                  <p className="ref-profile-stat-card__value ref-profile-stat-card__value--primary">
                    {profile.stats?.autoMatchedRate != null
                      ? `${profile.stats.autoMatchedRate}%`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="ref-profile-stat-card">
                <div className="ref-profile-stat-card__icon ref-profile-stat-card__icon--danger">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="ref-profile-stat-card__label">Conflict liên quan</p>
                  <p className="ref-profile-stat-card__value ref-profile-stat-card__value--danger">
                    {profile.stats?.conflictCount ?? 0}
                    {profile.stats?.pendingConflicts ? (
                      <span className="ref-profile-stat-card__pending">
                        {" "}({profile.stats.pendingConflicts} đang xử lý)
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="ref-profile-info-section">
              <h3>Thông tin tài khoản</h3>
              <div className="ref-profile-info-grid">
                <div className="ref-profile-info-item">
                  <span className="ref-profile-info-item__label">
                    <Mail size={14} /> Email
                  </span>
                  <span className="ref-profile-info-item__value">{profile.email || "—"}</span>
                </div>
                <div className="ref-profile-info-item">
                  <span className="ref-profile-info-item__label">
                    <Phone size={14} /> Số điện thoại
                  </span>
                  <span className="ref-profile-info-item__value">{profile.phoneNumber || "Chưa cập nhật"}</span>
                </div>
                <div className="ref-profile-info-item">
                  <span className="ref-profile-info-item__label">
                    <ShieldCheck size={14} /> Role
                  </span>
                  <span className="ref-profile-info-item__value">{profile.roleName || profile.roleCode || "Trọng tài"}</span>
                </div>
                <div className="ref-profile-info-item">
                  <span className="ref-profile-info-item__label">
                    <Clock size={14} /> Ngày tham gia
                  </span>
                  <span className="ref-profile-info-item__value">
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Notice */}
            <div className="ref-profile-notice">
              <ShieldCheck size={15} />
              <div>
                <strong>Thông tin hồ sơ</strong>
                <p>
                  Để cập nhật thông tin tài khoản, vui lòng liên hệ admin hoặc sử dụng tính năng đổi mật khẩu.
                  Các API cập nhật profile riêng cho referee sẽ được bổ sung sau.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
