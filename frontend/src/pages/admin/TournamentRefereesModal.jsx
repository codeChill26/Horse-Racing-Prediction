/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TournamentRefereesModal — Phân công 2 referee (A & B) cho TOÀN BỘ giải đấu.
 *
 * POST /api/admin/tournaments/:tournamentId/assign-referees
 * body: { refereeAId, refereeBId }
 *
 * Luật nghiệp vụ:
 *  - Chỉ cho phép khi tournament ở OPEN hoặc ONGOING (parent page sẽ disable button ở các status khác).
 *  - refereeAId !== refereeBId (backend validate, FE cảnh báo sớm).
 *  - Cả 2 phải có role='RACE_REFEREE' và isActive=true (backend validate).
 *  - Race FINISHED/CANCELLED trong tournament sẽ được skip (xem adminReferee.js).
 *  - Nếu tournament chưa có race nào → BE sẽ tạo pre-assignment notification cho cả 2 referee.
 */

import { useCallback, useEffect, useState } from "react";
import { X, AlertTriangle, ShieldCheck } from "lucide-react";
import { listReferees } from "../../api/admin";
import { tournamentService } from "../../services/tournamentService";
import "./TournamentRefereesModal.css";

function RefereeOption({ value, onChange, currentOtherId, label, desc, referees, saving }) {
  const sameAsOther = currentOtherId && value && value === currentOtherId;
  return (
    <div className={`trm-field ${sameAsOther ? "trm-field--err" : ""}`}>
      <label className="trm-label">
        {label} <span className="trm-req">*</span>
      </label>
      <select
        className="trm-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        disabled={saving}
      >
        <option value="">Chọn trọng tài…</option>
        {referees.map((r) => {
          const disabled = !r.isActive;
          const conflictWithOther = currentOtherId && String(r.userId || r.id) === currentOtherId;
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
        <span className="trm-hint trm-hint--err">
          <AlertTriangle size={12} />
          Trọng tài A và B phải khác nhau.
        </span>
      ) : (
        <span className="trm-hint">{desc}</span>
      )}
    </div>
  );
}

export default function TournamentRefereesModal({ tournament, onClose, onAssigned }) {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refereeAId, setRefereeAId] = useState(
    tournament?.refereeAId ? String(tournament.refereeAId) : ""
  );
  const [refereeBId, setRefereeBId] = useState(
    tournament?.refereeBId ? String(tournament.refereeBId) : ""
  );
  const [error, setError] = useState("");

  const loadReferees = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listReferees();
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
    setRefereeAId(tournament?.refereeAId ? String(tournament.refereeAId) : "");
    setRefereeBId(tournament?.refereeBId ? String(tournament.refereeBId) : "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.tournamentId]);

  if (!tournament) return null;

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
      const result = await tournamentService.assignRefereesToTournament(
        tournament.tournamentId,
        Number(refereeAId),
        Number(refereeBId)
      );
      onAssigned?.(result);
    } catch (e2) {
      setError(e2.message || "Phân công trọng tài thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="trm-backdrop"
      onClick={() => {
        if (!saving) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="trm-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="trm-modal__bar" />
        <header className="trm-modal__header">
          <div className="trm-modal__icon"><ShieldCheck size={22} /></div>
          <div className="trm-modal__heading">
            <h2 className="trm-modal__title">Phân công trọng tài cho cả giải</h2>
            <p className="trm-modal__subtitle">{tournament.name}</p>
          </div>
          <button
            type="button"
            className="trm-modal__close"
            onClick={() => onClose?.()}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="trm-modal__body">
          {loading ? (
            <div className="trm-loading">
              <div className="trm-spinner" />
            </div>
          ) : referees.length === 0 ? (
            <div className="trm-empty">
              <AlertTriangle size={20} />
              <span>Chưa có trọng tài nào active. Hãy tạo trọng tài trên trang Quản lý người dùng.</span>
            </div>
          ) : (
            <>
              <div className="trm-grid-2">
                <RefereeOption
                  label="Trọng tài A"
                  value={refereeAId}
                  onChange={setRefereeAId}
                  currentOtherId={refereeBId}
                  referees={referees}
                  saving={saving}
                  desc="Sẽ nhận thông báo cho tất cả race SCHEDULED trong giải."
                />
                <RefereeOption
                  label="Trọng tài B"
                  value={refereeBId}
                  onChange={setRefereeBId}
                  currentOtherId={refereeAId}
                  referees={referees}
                  saving={saving}
                  desc="Blind Double Entry — không thấy kết quả của A."
                />
              </div>

              <div className="trm-info">
                <strong>Lưu ý:</strong> trọng tài sẽ được gán cho mọi race đang ở trạng thái SCHEDULED trong giải.
                Race đã kết thúc/hủy sẽ được bỏ qua. Nếu giải chưa có race nào,
                cả 2 sẽ nhận thông báo "pre-assignment" để biết trước.
              </div>

              {sameReferee ? (
                <div className="trm-modal__alert" role="alert">
                  <AlertTriangle size={14} />
                  <span>Trọng tài A và B phải khác nhau.</span>
                </div>
              ) : null}
              {error ? (
                <div className="trm-modal__alert" role="alert">
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="trm-modal__footer">
          <button
            type="button"
            className="trm-btn trm-btn--ghost"
            onClick={() => onClose?.()}
            disabled={saving}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="trm-btn trm-btn--primary"
            disabled={saving || loading || !isComplete || referees.length === 0}
          >
            {saving ? "Đang lưu…" : "Phân công cho cả giải"}
          </button>
        </footer>
      </form>
    </div>
  );
}