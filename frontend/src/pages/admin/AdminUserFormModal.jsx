/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal";
import {
  createAdminUser,
  getAdminUserById,
  updateAdminUser,
  changeAdminUserRole,
} from "../../api/admin";
import { ROLE_CODES, roleLabelVi } from "../../utils/roleLabels";
import { RoleBadge } from "../../components/ui/Badges";
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
        if (form.password.length < 8)
          throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
        if (!form.fullName.trim()) throw new Error("Họ tên là bắt buộc");

        const payload = {
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          roleCode: form.roleCode,
        };
        if (form.phoneNumber.trim())
          payload.phoneNumber = form.phoneNumber.trim();

        await createAdminUser(payload);
      } else {
        if (!form.fullName.trim())
          throw new Error("Họ tên không được để trống");
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

  const footer = (
    <>
      <button
        type="button"
        className="adm-u-btn adm-u-btn--ghost"
        onClick={onClose}
        disabled={saving}
      >
        Hủy
      </button>
      <button
        type="submit"
        form="adm-u-form"
        className="adm-u-btn adm-u-btn--primary"
        disabled={saving}
      >
        {saving
          ? "Đang lưu..."
          : isEdit
          ? "Lưu thay đổi"
          : "Tạo người dùng"}
      </button>
    </>
  );

  return (
    <AdminModal
      size="md"
      accent="primary"
      title={isEdit ? `Chỉnh sửa người dùng #${userId}` : "Tạo người dùng"}
      subtitle={
        isEdit
          ? "Cập nhật thông tin cá nhân, vai trò và mật khẩu."
          : "Tạo tài khoản mới cho hệ thống. Ví điểm sẽ tự động được tạo cho vai trò Khán giả."
      }
      onClose={onClose}
      footer={footer}
    >
      {loading ? (
        <div className="adm-u-loading">
          <div className="adm-u-spinner" />
        </div>
      ) : (
        <form id="adm-u-form" onSubmit={handleSubmit}>
          {error && <AdminModalAlert type="error">{error}</AdminModalAlert>}

          <AdminModalSection
            title="Thông tin tài khoản"
            description="Email dùng để đăng nhập, không thể thay đổi sau khi tạo."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Email" required={!isEdit}>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isEdit}
                  required={!isEdit}
                  placeholder="user@example.com"
                />
              </AdminModalField>

              <AdminModalField
                label={isEdit ? "Mật khẩu mới" : "Mật khẩu"}
                required={!isEdit}
                hint={isEdit ? "Để trống nếu không muốn đổi." : "Tối thiểu 8 ký tự."}
              >
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required={!isEdit}
                  minLength={isEdit ? undefined : 8}
                  placeholder={isEdit ? "••••••••" : "Tối thiểu 8 ký tự"}
                />
              </AdminModalField>
            </div>
          </AdminModalSection>

          <AdminModalSection
            title="Thông tin cá nhân"
            description="Họ tên và số điện thoại sẽ hiển thị trong bảng quản lý."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Họ và tên" required>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Nguyễn Văn A"
                />
              </AdminModalField>

              <AdminModalField label="Số điện thoại">
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="0xxx xxx xxx"
                />
              </AdminModalField>
            </div>
          </AdminModalSection>

          <AdminModalSection
            title="Phân quyền"
            description={
              isEdit
                ? "Đổi vai trò sẽ thay đổi quyền truy cập ngay lập tức."
                : "Chọn vai trò phù hợp với nghiệp vụ của người dùng."
            }
          >
            <AdminModalField
              label="Vai trò"
              hint={
                isEdit
                  ? `Vai trò hiện tại: ${roleLabelVi(initialRoleCode)}`
                  : undefined
              }
            >
              <select
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
            </AdminModalField>

            <div className="adm-u-role-preview">
              <span className="adm-u-role-preview__label">Xem trước:</span>
              <RoleBadge role={form.roleCode} />
            </div>
          </AdminModalSection>
        </form>
      )}
    </AdminModal>
  );
}
