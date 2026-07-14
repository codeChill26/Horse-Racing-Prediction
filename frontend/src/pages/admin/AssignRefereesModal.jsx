/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AssignRefereesModal — FLOW 3 Step 3.
 *
 * Phân công 2 referee (A & B) cho race.
 * POST /api/admin/races/:id/assign-referees
 * body: { refereeAId, refereeBId }
 *
 * mainflow.md:
 *  - refereeAId !== refereeBId (BACKEND validate, FE cảnh báo)
 *  - Cả 2 phải có role='RACE_REFEREE' và isActive=true (BACKEND validate)
 *  - Race FINISHED/CANCELLED → immutable (409)
 */

import { useCallback, useEffect, useState } from "react";
import { X, Users, AlertTriangle } from "lucide-react";
import { raceService } from "../../services/raceService";
import "./AssignRefereesModal.css";

function RefereeOption({ value, onChange, currentOtherId, label, desc, referees, saving, loading }) {
  const sameAsOther = currentOtherId && value && value === currentOtherId;
  return (
    <div className={`arm-field ${sameAsOther ? "arm-field--err" : ""}`}>
      <label className="arm-label">
        {label} <span className="arm-req">*</span>
      </label>
      <select
        className="arm-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        disabled={saving || loading}
      >
        <option value="">Chọn trọng tài…</option>
        {referees.map((r) => {
          const disabled = !r.isActive;
          const otherId = currentOtherId;
          const conflictWithOther = otherId && String(r.userId || r.id) === otherId;
          return (
            <option
              key={r.userId || r.id}
              value={String(r.userId || r.id)}
              disabled={disabled || conflictWithOther}
            >
              {r.fullName || r.name || `#${r.userId || r.id}`}
              {disabled ? " (chưa active)" : ""}
              {r.email ? ` · ${r.email}` : ""}
            </option>
          );
        })}
      </select>
      {sameAsOther ? (
        <span className="arm-hint arm-hint--err">
          <AlertTriangle size={12} />
          Trọng tài A và B phải khác nhau.
        </span>
      ) : (
        <span className="arm-hint">{desc}</span>
      )}
    </div>
  );
}

export default function AssignRefereesModal({ race, onClose, onAssigned }) {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refereeAId, setRefereeAId] = useState(race?.refereeAId ? String(race.refereeAId) : "");
  const [refereeBId, setRefereeBId] = useState(race?.refereeBId ? String(race.refereeBId) : "");
  const [error, setError] = useState("");

  const loadReferees = useCallback(async () => {
    setLoading(true);
    try {
      const list = await raceService.listReferees();
      setReferees(Array.isArray(list) ? list : []);
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

  useEffect(() => {
    // Reset state khi đổi race
    setRefereeAId(race?.refereeAId ? String(race.refereeAId) : "");
    setRefereeBId(race?.refereeBId ? String(race.refereeBId) : "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race?.raceId]);

  if (!race) return null;

  const sameReferee = refereeAId && refereeBId && refereeAId === refereeBId;
  const isComplete = !!(refereeAId && refereeBId) && !sameReferee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!refereeAId || !refereeBId) {
      setError("Vui lòng chọn đủ 2 trọng tài (A và B)");
      return;
    }
    if (sameReferee) {
      setError("Trọng tài A và B phải khác nhau");
      return;
    }
    setSaving(true);
    try {
      const updated = await raceService.assignReferees(race.raceId, {
        refereeAId: Number(refereeAId),
        refereeBId: Number(refereeBId),
      });
      onAssigned?.(updated);
    } catch (e2) {
      setError(e2.message || "Phân công trọng tài thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="arm-backdrop"
      onClick={() => {
        if (!saving) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="arm-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="arm-modal__bar" />
        <header className="arm-modal__header">
          <div className="arm-modal__icon"><Users size={22} /></div>
          <div className="arm-modal__heading">
            <h2 className="arm-modal__title">Phân công 2 trọng tài</h2>
            <p className="arm-modal__subtitle">{race.name}</p>
          </div>
          <button
            type="button"
            className="arm-modal__close"
            onClick={() => onClose?.()}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="arm-modal__body">
          {loading ? (
            <div className="arm-loading">
              <div className="arm-spinner" />
            </div>
          ) : referees.length === 0 ? (
            <div className="arm-empty">
              <AlertTriangle size={20} />
              <span>Chưa có trọng tài nào active. Hãy tạo trọng tài trên trang Quản lý trọng tài.</span>
            </div>
          ) : (
            <>
              <div className="arm-grid-2">
                <RefereeOption
                  label="Trọng tài A"
                  value={refereeAId}
                  onChange={setRefereeAId}
                  currentOtherId={refereeBId}
                  referees={referees}
                  saving={saving}
                  loading={loading}
                  desc="Người đầu tiên nộp kết quả. Sẽ nhận thông báo khi race bắt đầu."
                />
                <RefereeOption
                  label="Trọng tài B"
                  value={refereeBId}
                  onChange={setRefereeBId}
                  currentOtherId={refereeAId}
                  referees={referees}
                  saving={saving}
                  loading={loading}
                  desc="Người thứ 2 nộp kết quả. Hai referee KHÔNG thấy kết quả của nhau (Blind Entry)."
                />
              </div>

              <div className="arm-info">
                <strong>Blind Double Entry:</strong> cả 2 referee nộp kết quả độc lập.
                Hệ thống tự so sánh — nếu khớp thì tự động cập nhật race; nếu lệch thì race sẽ PAUSED chờ admin xử lý.
              </div>

              {sameReferee ? (
                <div className="arm-modal__alert" role="alert">
                  <AlertTriangle size={14} />
                  <span>Trọng tài A và B phải khác nhau.</span>
                </div>
              ) : null}
              {error ? (
                <div className="arm-modal__alert" role="alert">
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="arm-modal__footer">
          <button
            type="button"
            className="arm-btn arm-btn--ghost"
            onClick={() => onClose?.()}
            disabled={saving}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="arm-btn arm-btn--primary"
            disabled={saving || loading || !isComplete || referees.length === 0}
          >
            {saving ? "Đang lưu…" : "Phân công"}
          </button>
        </footer>
      </form>
    </div>
  );
}