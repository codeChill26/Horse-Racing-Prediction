/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdminAssignRefereesModal
 *
 * Modal chọn 2 trọng tài phân biệt cho race SCHEDULED.
 * Mirror logic từ mobile `admin_race_assign_referee_sheet.dart`.
 *
 * Flow:
 *  - Load danh sách referee active qua adminRaceRefereeService.
 *  - User chọn tối đa 2 (cảnh báo nếu > 2).
 *  - Submit → POST /api/admin/races/:id/assign-referees.
 *  - Sau success → onConfirm(race) để parent merge state.
 */

import { useEffect, useId, useState } from "react";
import { ShieldCheck, AlertTriangle, UserCheck } from "lucide-react";
import { ModalShell } from "./AdminRaceDetailModals";
import { adminRaceRefereeService } from "../../../services/adminRaceRefereeService";
import "./AdminAssignRefereesModal.css";

export default function AdminAssignRefereesModal({
  race,
  onConfirm,
  onClose,
  busy = false,
}) {
  const baseId = useId();
  const id = `assign-${baseId.replace(/:/g, "")}`;

  const [referees, setReferees] = useState([]);
  const [selected, setSelected] = useState(() => {
    const a = race?.refereeA?.userId ?? race?.refereeAId ?? null;
    const b = race?.refereeB?.userId ?? race?.refereeBId ?? null;
    const ids = [a, b].filter(Boolean).map(Number);
    return new Set(ids);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await adminRaceRefereeService.listAvailableReferees();
        if (cancelled) return;
        setReferees(list);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Không tải được danh sách trọng tài");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (userId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        setError("");
        return next;
      }
      if (next.size >= 2) {
        setError("Chỉ được chọn tối đa 2 trọng tài.");
        return prev;
      }
      next.add(userId);
      setError("");
      return next;
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (selected.size !== 2) {
      setError("Vui lòng chọn đúng 2 trọng tài khác nhau.");
      return;
    }
    const sortedIds = Array.from(selected).sort((a, b) => a - b);
    const [refereeAId, refereeBId] = sortedIds;
    try {
      const updated = await adminRaceRefereeService.assignReferees(race.raceId, {
        refereeAId,
        refereeBId,
      });
      onConfirm?.(updated);
    } catch (e) {
      setError(e?.message || "Phân công trọng tài thất bại");
    }
  };

  return (
    <ModalShell
      className="ard-assign-modal"
      onClose={onClose}
      busy={busy || loading}
      labelId={`${id}-title`}
      descId={`${id}-desc`}
    >
      <div className="ard-assign-modal__bar" />
      <div className="ard-assign-modal__header">
        <ShieldCheck size={24} className="ard-assign-modal__icon" />
        <div>
          <h2 id={`${id}-title`} className="ard-assign-modal__title">
            Phân công trọng tài
          </h2>
          <p className="ard-assign-modal__subtitle">
            {race?.name ? `Race #${race.raceId} · ${race.name}` : `Race #${race?.raceId}`}
          </p>
        </div>
      </div>

      <div id={`${id}-desc`} className="ard-assign-modal__body">
        <div className="ard-assign-modal__counter">
          <UserCheck size={14} />
          <span>
            Đã chọn <strong>{selected.size}</strong>/2
            {selected.size === 2 && (
              <span className="ard-assign-modal__counter-ok"> · sẵn sàng phân công</span>
            )}
          </span>
        </div>

        {loading && (
          <div className="ard-assign-modal__loading">Đang tải danh sách trọng tài…</div>
        )}

        {!loading && !error && referees.length === 0 && (
          <div className="ard-assign-modal__empty">
            Chưa có trọng tài khả dụng. Cần tạo user với role "RACE_REFEREE" trước.
          </div>
        )}

        {!loading && referees.length > 0 && (
          <ul className="ard-assign-list" role="listbox" aria-label="Danh sách trọng tài">
            {referees.map((ref) => {
              const isSelected = selected.has(ref.userId);
              const previousA = Number(race?.refereeA?.userId ?? race?.refereeAId ?? 0);
              const previousB = Number(race?.refereeB?.userId ?? race?.refereeBId ?? 0);
              const wasAssigned = ref.userId === previousA || ref.userId === previousB;
              return (
                <li key={ref.userId}>
                  <button
                    type="button"
                    className={
                      isSelected
                        ? "ard-assign-item ard-assign-item--selected"
                        : "ard-assign-item"
                    }
                    onClick={() => toggle(ref.userId)}
                    role="option"
                    aria-selected={isSelected}
                    disabled={busy || loading}
                  >
                    <span className="ard-assign-item__avatar" aria-hidden="true">
                      <ShieldCheck size={16} />
                    </span>
                    <span className="ard-assign-item__body">
                      <span className="ard-assign-item__name">
                        {ref.fullName || `Trọng tài #${ref.userId}`}
                        {wasAssigned && (
                          <span className="ard-assign-item__badge">đang phân công</span>
                        )}
                      </span>
                      {ref.email && (
                        <span className="ard-assign-item__email">{ref.email}</span>
                      )}
                    </span>
                    <span
                      className={
                        isSelected
                          ? "ard-assign-item__check ard-assign-item__check--on"
                          : "ard-assign-item__check"
                      }
                      aria-hidden="true"
                    >
                      {isSelected ? "✓" : "○"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <div className="ard-assign-modal__error" role="alert">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="ard-assign-modal__footer">
        <button
          type="button"
          className="ard-btn ard-btn--ghost"
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="ard-btn ard-btn--primary"
          onClick={handleSubmit}
          disabled={busy || loading || selected.size !== 2}
        >
          {busy ? "Đang lưu…" : "Phân công"}
        </button>
      </div>
    </ModalShell>
  );
}
