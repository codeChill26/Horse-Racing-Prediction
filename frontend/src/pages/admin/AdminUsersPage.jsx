/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, RefreshCw, Power, Trash2 } from "lucide-react";
import {
  listAdminUsers,
  toggleAdminUserActive,
  deleteAdminUser,
  changeAdminUserRole,
} from "../../api/admin";
import { formatDate } from "../../utils/formatter";
import {
  ROLE_FILTER_OPTIONS,
  ROLE_CODES,
  roleLabelVi,
} from "../../utils/roleLabels";
import { RoleBadge, StatusBadge } from "../../components/ui/Badges";
import AdminUserFormModal from "./AdminUserFormModal";
import "./AdminUsersPage.css";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listAdminUsers(roleFilter || undefined);
      setUsers(list);
    } catch (e) {
      setError(e.message || "Không tải được danh sách người dùng");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        String(u.userId ?? "").includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.fullName ?? "").toLowerCase().includes(q) ||
        (u.phoneNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const byRole = {};
    for (const code of ROLE_CODES) {
      byRole[code] = users.filter((u) => u.role?.code === code).length;
    }
    let topRole = "—";
    let topCount = 0;
    Object.entries(byRole).forEach(([code, count]) => {
      if (count > topCount) {
        topCount = count;
        topRole = roleLabelVi(code);
      }
    });
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      topRole,
    };
  }, [users]);

  const replaceUser = (updated) => {
    setUsers((prev) =>
      prev.map((u) => (u.userId === updated.userId ? updated : u))
    );
  };

  const handleToggleActive = async (user) => {
    setBusyId(user.userId);
    try {
      const updated = await toggleAdminUserActive(user.userId);
      replaceUser(updated);
    } catch (e) {
      window.alert(e.message || "Không đổi được trạng thái");
    } finally {
      setBusyId(null);
    }
  };

  const handleChangeRole = async (user, nextRole) => {
    if (!nextRole || nextRole === user.role?.code) return;
    const ok = window.confirm(
      `Đổi vai trò user #${user.userId} (${user.email})\n\n` +
        `${roleLabelVi(user.role?.code)} → ${roleLabelVi(nextRole)}?`
    );
    if (!ok) return;

    setBusyId(user.userId);
    try {
      const updated = await changeAdminUserRole(user.userId, nextRole);
      replaceUser(updated);
    } catch (e) {
      window.alert(e.message || "Không đổi được vai trò");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeactivate = async (user) => {
    const ok = window.confirm(
      `Vô hiệu hóa user #${user.userId} (${user.email})?\n\n` +
        "Tài khoản sẽ bị deactivate và thu hồi phiên đăng nhập."
    );
    if (!ok) return;

    setBusyId(user.userId);
    try {
      const updated = await deleteAdminUser(user.userId);
      replaceUser(updated);
    } catch (e) {
      window.alert(e.message || "Không vô hiệu hóa được người dùng");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="adm-u-page">
      <header className="adm-u-page__header">
        <div>
          <h1 className="adm-u-page__title">Quản lý người dùng</h1>
        </div>
        <button
          type="button"
          className="adm-u-btn adm-u-btn--primary"
          onClick={() => setModal({ mode: "create" })}
        >
          <Plus size={16} />
          Tạo người dùng
        </button>
      </header>

      <div className="adm-u-stats">
        <div className="adm-u-stat">
          <div className="adm-u-stat__label">Tổng user</div>
          <div className="adm-u-stat__value">{stats.total}</div>
        </div>
        <div className="adm-u-stat">
          <div className="adm-u-stat__label">Đang hoạt động</div>
          <div className="adm-u-stat__value">{stats.active}</div>
        </div>
        <div className="adm-u-stat">
          <div className="adm-u-stat__label">Đã khóa</div>
          <div className="adm-u-stat__value">{stats.inactive}</div>
        </div>
        <div className="adm-u-stat">
          <div className="adm-u-stat__label">Vai trò phổ biến</div>
          <div className="adm-u-stat__value" style={{ fontSize: "1rem" }}>
            {stats.topRole}
          </div>
        </div>
      </div>

      <div className="adm-u-toolbar">
        <input
          className="adm-u-search"
          type="search"
          placeholder="Tìm theo tên, email, SĐT, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="adm-u-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="adm-u-btn adm-u-btn--ghost"
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && !loading && (
        <div className="adm-u-alert--error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="adm-u-panel">
        {loading ? (
          <div className="adm-u-loading">
            <div className="adm-u-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-u-empty">Không có người dùng phù hợp bộ lọc.</div>
        ) : (
          <div className="adm-u-table-wrap">
            <table className="adm-u-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Đổi vai trò</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isBusy = busyId === user.userId;
                  return (
                    <tr key={user.userId}>
                      <td>#{user.userId}</td>
                      <td>
                        <div className="adm-u-name">{user.fullName}</div>
                        <div className="adm-u-meta">{user.email}</div>
                        {user.phoneNumber && (
                          <div className="adm-u-meta">{user.phoneNumber}</div>
                        )}
                      </td>
                      <td>
                        <RoleBadge role={user.role?.code} />
                        {user.isProfileComplete === false &&
                          user.role?.code === "JOCKEY" && (
                            <div className="adm-u-meta" style={{ marginTop: "0.25rem" }}>
                              Hồ sơ kỵ sĩ chưa đủ
                            </div>
                          )}
                      </td>
                      <td>
                        <StatusBadge
                          status={user.isActive ? "ACTIVE" : "INACTIVE"}
                          label={user.isActive ? "Hoạt động" : "Đã khóa"}
                        />
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <select
                          className="adm-u-role-select"
                          value=""
                          disabled={isBusy}
                          onChange={(e) =>
                            handleChangeRole(user, e.target.value)
                          }
                        >
                          <option value="">Chọn...</option>
                          {ROLE_CODES.filter((c) => c !== user.role?.code).map(
                            (code) => (
                              <option key={code} value={code}>
                                {roleLabelVi(code)}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td>
                        <div className="adm-u-actions">
                          <button
                            type="button"
                            className="adm-u-icon-btn"
                            title="Chỉnh sửa"
                            disabled={isBusy}
                            onClick={() =>
                              setModal({ mode: "edit", id: user.userId })
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="adm-u-icon-btn"
                            title={user.isActive ? "Tắt tài khoản" : "Bật tài khoản"}
                            disabled={isBusy}
                            onClick={() => handleToggleActive(user)}
                          >
                            <Power size={14} />
                          </button>
                          {user.isActive && (
                            <button
                              type="button"
                              className="adm-u-icon-btn adm-u-icon-btn--danger"
                              title="Vô hiệu hóa"
                              disabled={isBusy}
                              onClick={() => handleDeactivate(user)}
                            >
                              <Trash2 size={14} />
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

      {modal?.mode === "create" && (
        <AdminUserFormModal
          onClose={() => setModal(null)}
          onSaved={loadUsers}
        />
      )}
      {modal?.mode === "edit" && (
        <AdminUserFormModal
          userId={modal.id}
          onClose={() => setModal(null)}
          onSaved={loadUsers}
        />
      )}
    </div>
  );
}
