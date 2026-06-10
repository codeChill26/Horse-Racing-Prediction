/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { X, UserPlus } from "lucide-react";
import {
  createAdminUser,
  getAdminUserById,
  updateAdminUser,
  changeAdminUserRole,
} from "../../api/admin";
import { ROLE_CODES, roleLabelVi } from "../../utils/roleLabels";
import "./AdminUsersPage.css";

export default function AdminUserFormModal({ userId, onClose, onSaved }) {
  const isEdit = Boolean(userId);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phoneNumber: "",
    roleCode: "SPECTATOR",
  });
  const [initialRoleCode, setInitialRoleCode] = useState("SPECTATOR");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const user = await getAdminUserById(userId);
        if (cancelled) return;
        const role = user.role?.code ?? "SPECTATOR";
        setForm({
          email: user.email ?? "",
          password: "",
          fullName: user.fullName ?? "",
          phoneNumber: user.phoneNumber ?? "",
          roleCode: role,
        });
        setInitialRoleCode(role);
      } catch (e) {
        if (!cancelled) setError(e.message || "Không tải được người dùng");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (!isEdit) {
        if (!form.email.includes("@")) throw new Error("Email không hợp lệ");
        if (form.password.length < 8) throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
        if (!form.fullName.trim()) throw new Error("Họ tên là bắt buộc");

        const payload = {
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          roleCode: form.roleCode,
        };
        if (form.phoneNumber.trim()) payload.phoneNumber = form.phoneNumber.trim();

        await createAdminUser(payload);
      } else {
        if (!form.fullName.trim()) throw new Error("Họ tên không được để trống");
        if (form.password && form.password.length < 8) {
          throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự");
        }

        const payload = {
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim() || null,
        };
        if (form.password.length >= 8) payload.password = form.password;

        await updateAdminUser(userId, payload);

        if (form.roleCode !== initialRoleCode) {
          await changeAdminUserRole(userId, form.roleCode);
        }
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Không lưu được người dùng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-u-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="adm-u-modal" role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
        <div className="adm-u-modal__bar" />
        <header className="adm-u-modal__header">
          <div>
            <h2 className="adm-u-modal__title">
              <UserPlus size={16} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
              {isEdit ? `Chỉnh sửa #${userId}` : "Tạo người dùng"}
            </h2>
            <p className="adm-u-modal__subtitle">API /api/admin/users</p>
          </div>
          <button type="button" className="adm-u-modal__close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>

        {loading ? (
          <div className="adm-u-loading">
            <div className="adm-u-spinner" />
          </div>
        ) : (
          <form className="adm-u-modal__body" onSubmit={handleSubmit}>
            {error && <div className="adm-u-alert--error">{error}</div>}

            <label className="adm-u-field">
              <span className="adm-u-field__label">Email {isEdit ? "" : "*"}</span>
              <input
                className="adm-u-field__input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                disabled={isEdit}
                required={!isEdit}
              />
            </label>

            <label className="adm-u-field">
              <span className="adm-u-field__label">
                {isEdit ? "Mật khẩu mới (tùy chọn)" : "Mật khẩu *"}
              </span>
              <input
                className="adm-u-field__input"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required={!isEdit}
                minLength={isEdit ? undefined : 8}
                placeholder={isEdit ? "Để trống nếu không đổi" : "Tối thiểu 8 ký tự"}
              />
            </label>

            <label className="adm-u-field">
              <span className="adm-u-field__label">Họ và tên *</span>
              <input
                className="adm-u-field__input"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </label>

            <label className="adm-u-field">
              <span className="adm-u-field__label">Số điện thoại</span>
              <input
                className="adm-u-field__input"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
              />
            </label>

            <label className="adm-u-field">
              <span className="adm-u-field__label">Vai trò</span>
              <select
                className="adm-u-field__input"
                name="roleCode"
                value={form.roleCode}
                onChange={handleChange}
              >
                {ROLE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {roleLabelVi(code)}
                  </option>
                ))}
              </select>
            </label>

            <footer className="adm-u-modal__footer">
              <button type="button" className="adm-u-btn adm-u-btn--ghost" onClick={onClose} disabled={saving}>
                Hủy
              </button>
              <button type="submit" className="adm-u-btn adm-u-btn--primary" disabled={saving}>
                {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
