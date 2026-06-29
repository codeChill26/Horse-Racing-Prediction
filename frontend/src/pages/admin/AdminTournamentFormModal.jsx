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
import { tournamentService } from "../../services/tournamentService";

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const emptyForm = () => ({
  name: "",
  description: "",
  startAt: "",
  endAt: "",
});

export default function AdminTournamentFormModal({ tournamentId, onClose, onSaved }) {
  const isEdit = Boolean(tournamentId);
  const [form, setForm] = useState(emptyForm);
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
        const t = await tournamentService.getTournamentById(tournamentId);
        if (cancelled) return;
        setForm({
          name: t.name ?? "",
          description: t.description ?? "",
          startAt: toDatetimeLocalValue(t.startAt),
          endAt: toDatetimeLocalValue(t.endAt),
        });
      } catch (e) {
        if (!cancelled) setError(e.message || "Không tải được giải đấu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, tournamentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        startAt: fromDatetimeLocalValue(form.startAt),
        endAt: fromDatetimeLocalValue(form.endAt),
      };

      if (isEdit) {
        await tournamentService.updateTournament(tournamentId, payload);
      } else {
        await tournamentService.createTournament(payload);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Không lưu được giải đấu");
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button type="button" className="adm-t-btn adm-t-btn--ghost" onClick={onClose} disabled={saving}>
        Hủy
      </button>
      <button type="submit" form="adm-t-form" className="adm-t-btn adm-t-btn--primary" disabled={saving}>
        {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo giải"}
      </button>
    </>
  );

  return (
    <AdminModal
      size="lg"
      accent="gold"
      title={isEdit ? "Chỉnh sửa giải đấu" : "Tạo giải đấu mới"}
      subtitle={
        isEdit
          ? "Cập nhật thông tin giải đấu. Trạng thái hiện tại được giữ nguyên."
          : "Giải mới mặc định ở trạng thái Đang chờ (DRAFT). Bạn có thể chuyển sang Đang mở sau khi tạo."
      }
      onClose={onClose}
      footer={loading ? null : footer}
    >
      {loading ? (
        <div className="adm-t-modal__loading">
          <div className="adm-t-spinner" />
        </div>
      ) : (
        <form id="adm-t-form" onSubmit={handleSubmit}>
          {error && <AdminModalAlert type="error">{error}</AdminModalAlert>}

          <AdminModalSection
            title="Thông tin cơ bản"
            description="Tên và mô tả giúp khán giả nhận diện giải đấu."
          >
            <AdminModalField label="Tên giải đấu" required>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Ví dụ: Cúp GrandStride 2026"
              />
            </AdminModalField>

            <AdminModalField
              label="Mô tả"
              hint="Thông tin địa điểm, quy định, giải thưởng..."
            >
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Mô tả chi tiết giải đấu..."
              />
            </AdminModalField>
          </AdminModalSection>

          <AdminModalSection
            title="Thời gian"
            description="Khung thời gian tổ chức giải. Có thể cập nhật sau."
          >
            <div className="gs-modal-section gs-modal-section--grid">
              <AdminModalField label="Bắt đầu">
                <input
                  type="datetime-local"
                  name="startAt"
                  value={form.startAt}
                  onChange={handleChange}
                />
              </AdminModalField>

              <AdminModalField label="Kết thúc">
                <input
                  type="datetime-local"
                  name="endAt"
                  value={form.endAt}
                  onChange={handleChange}
                />
              </AdminModalField>
            </div>
          </AdminModalSection>
        </form>
      )}
    </AdminModal>
  );
}
