/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { X, Trophy } from "lucide-react";
import { tournamentService } from "../../services/tournamentService";
import "./AdminTournamentsPage.css";

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

  return (
    <div className="adm-t-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="adm-t-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-t-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="adm-t-modal__bar" />
        <header className="adm-t-modal__header">
          <div className="adm-t-modal__title-wrap">
            <Trophy className="adm-t-modal__icon" />
            <div>
              <h2 id="adm-t-modal-title" className="adm-t-modal__title">
                {isEdit ? "Chỉnh sửa giải đấu" : "Tạo giải đấu mới"}
              </h2>
              <p className="adm-t-modal__subtitle">
                Giải mới mặc định ở trạng thái <strong>Nháp (DRAFT)</strong>
              </p>
            </div>
          </div>
          <button type="button" className="adm-t-modal__close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>

        {loading ? (
          <div className="adm-t-modal__loading">
            <div className="adm-t-spinner" />
          </div>
        ) : (
          <form className="adm-t-modal__body" onSubmit={handleSubmit}>
            {error && <div className="adm-t-alert adm-t-alert--error">{error}</div>}

            <label className="adm-t-field">
              <span className="adm-t-field__label">Tên giải đấu *</span>
              <input
                className="adm-t-field__input"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Ví dụ: Cúp GrandStride 2026"
              />
            </label>

            <label className="adm-t-field">
              <span className="adm-t-field__label">Mô tả</span>
              <textarea
                className="adm-t-field__input adm-t-field__textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Thông tin địa điểm, quy định, giải thưởng..."
              />
            </label>

            <div className="adm-t-field-row">
              <label className="adm-t-field">
                <span className="adm-t-field__label">Bắt đầu</span>
                <input
                  className="adm-t-field__input"
                  type="datetime-local"
                  name="startAt"
                  value={form.startAt}
                  onChange={handleChange}
                />
              </label>
              <label className="adm-t-field">
                <span className="adm-t-field__label">Kết thúc</span>
                <input
                  className="adm-t-field__input"
                  type="datetime-local"
                  name="endAt"
                  value={form.endAt}
                  onChange={handleChange}
                />
              </label>
            </div>

            <footer className="adm-t-modal__footer">
              <button type="button" className="adm-t-btn adm-t-btn--ghost" onClick={onClose} disabled={saving}>
                Hủy
              </button>
              <button type="submit" className="adm-t-btn adm-t-btn--primary" disabled={saving}>
                {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo giải"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
