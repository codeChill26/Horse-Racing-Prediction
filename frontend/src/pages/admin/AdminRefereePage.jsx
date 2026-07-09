/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  RefreshCw,
  Power,
  Award,
  Flag,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { listReferees } from "../../api/admin";
import { formatDate } from "../../utils/formatter";
import "./AdminRefereePage.css";

export default function AdminRefereePage() {
  const [referees, setReferees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId] = useState(null);

  const loadReferees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listReferees();
      setReferees(list);
    } catch (e) {
      setError(e.message || "Không tải được danh sách trọng tài");
      setReferees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferees();
  }, [loadReferees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referees;
    return referees.filter((r) => {
      return (
        String(r.userId ?? "").includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.fullName ?? "").toLowerCase().includes(q) ||
        (r.phoneNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [referees, search]);

  const stats = useMemo(() => {
    const active = referees.filter((r) => r.isActive).length;
    const inactive = referees.length - active;
    const withProfile = referees.filter((r) => r.isProfileComplete).length;
    const withoutProfile = referees.length - withProfile;
    return {
      total: referees.length,
      active,
      inactive,
      withProfile,
      withoutProfile,
    };
  }, [referees]);

  return (
    <div className="adm-ref-page">
      <header className="adm-ref-page__header">
        <div>
          <h1 className="adm-ref-page__title">Quản lý Trọng tài</h1>
          <p className="adm-ref-page__desc">
            Xem, phân công và quản lý tài khoản trọng tài trong hệ thống.
          </p>
        </div>
        <button
          type="button"
          className="adm-ref-btn adm-ref-btn--primary"
          onClick={() => window.alert("Tính năng đang phát triển")}
        >
          <Plus size={16} />
          Thêm trọng tài
        </button>
      </header>

      <div className="adm-ref-stats">
        <div className="adm-ref-stat">
          <div className="adm-ref-stat__icon adm-ref-stat__icon--total">
            <Award size={20} />
          </div>
          <div>
            <div className="adm-ref-stat__value">{stats.total}</div>
            <div className="adm-ref-stat__label">Tổng trọng tài</div>
          </div>
        </div>
        <div className="adm-ref-stat">
          <div className="adm-ref-stat__icon adm-ref-stat__icon--active">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="adm-ref-stat__value">{stats.active}</div>
            <div className="adm-ref-stat__label">Đang hoạt động</div>
          </div>
        </div>
        <div className="adm-ref-stat">
          <div className="adm-ref-stat__icon adm-ref-stat__icon--inactive">
            <XCircle size={20} />
          </div>
          <div>
            <div className="adm-ref-stat__value">{stats.inactive}</div>
            <div className="adm-ref-stat__label">Đã khóa</div>
          </div>
        </div>
        <div className="adm-ref-stat">
          <div className="adm-ref-stat__icon adm-ref-stat__icon--profile">
            <Flag size={20} />
          </div>
          <div>
            <div className="adm-ref-stat__value">{stats.withProfile}</div>
            <div className="adm-ref-stat__label">Hồ sơ hoàn tất</div>
          </div>
        </div>
      </div>

      <div className="adm-ref-toolbar">
        <input
          className="adm-ref-search"
          type="search"
          placeholder="Tìm theo tên, email, SĐT, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="adm-ref-btn adm-ref-btn--ghost"
          onClick={loadReferees}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "adm-ref-spin" : ""} />
          Làm mới
        </button>
      </div>

      {error && !loading && (
        <div className="adm-ref-alert--error">
          <AlertCircle size={16} />
          {error}
          <button type="button" className="adm-ref-alert__retry" onClick={loadReferees}>
            Thử lại
          </button>
        </div>
      )}

      <div className="adm-ref-panel">
        {loading ? (
          <div className="adm-ref-loading">
            <div className="adm-ref-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-ref-empty">
            {search ? "Không có trọng tài phù hợp bộ lọc." : "Chưa có trọng tài nào trong hệ thống."}
          </div>
        ) : (
          <div className="adm-ref-table-wrap">
            <table className="adm-ref-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Trọng tài</th>
                  <th>Liên hệ</th>
                  <th>Trạng thái</th>
                  <th>Hồ sơ</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((referee) => {
                  const isBusy = busyId === referee.userId;
                  return (
                    <tr key={referee.userId}>
                      <td>
                        <span className="adm-ref-id">#{referee.userId}</span>
                      </td>
                      <td>
                        <div className="adm-ref-name">
                          {referee.avatarUrl ? (
                            <img
                              src={referee.avatarUrl}
                              alt={referee.fullName}
                              className="adm-ref-avatar"
                            />
                          ) : (
                            <div className="adm-ref-avatar adm-ref-avatar--placeholder">
                              {referee.fullName?.charAt(0) || "?"}
                            </div>
                          )}
                          <div>
                            <div className="adm-ref-name__text">{referee.fullName}</div>
                            <div className="adm-ref-meta">{referee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="adm-ref-contact">
                          {referee.phoneNumber ? (
                            <span>{referee.phoneNumber}</span>
                          ) : (
                            <span className="adm-ref-contact--empty">Chưa cập nhật</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {referee.isActive ? (
                          <span className="adm-ref-badge adm-ref-badge--active">
                            <CheckCircle2 size={12} />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="adm-ref-badge adm-ref-badge--inactive">
                            <XCircle size={12} />
                            Đã khóa
                          </span>
                        )}
                      </td>
                      <td>
                        {referee.isProfileComplete ? (
                          <span className="adm-ref-profile adm-ref-profile--complete">
                            <CheckCircle2 size={12} />
                            Hoàn tất
                          </span>
                        ) : (
                          <span className="adm-ref-profile adm-ref-profile--incomplete">
                            <AlertCircle size={12} />
                            Chưa hoàn tất
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="adm-ref-date">{formatDate(referee.createdAt)}</span>
                      </td>
                      <td>
                        <div className="adm-ref-actions">
                          <button
                            type="button"
                            className="adm-ref-icon-btn"
                            title="Chỉnh sửa"
                            disabled={isBusy}
                            onClick={() => window.alert("Tính năng đang phát triển")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="adm-ref-icon-btn"
                            title={referee.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            disabled={isBusy}
                            onClick={() =>
                              window.confirm(
                                `${referee.isActive ? "Khóa" : "Mở khóa"} tài khoản trọng tài ${referee.fullName}?`
                              ) && console.log("Toggle active:", referee.userId)
                            }
                          >
                            <Power size={14} />
                          </button>
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
    </div>
  );
}
