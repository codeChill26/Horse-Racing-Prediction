/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RaceCreateFormModal — FLOW 3 Step 2.
 *
 * Form tạo race mới trong 1 tournament.
 * POST /api/admin/tournaments/:tournamentId/races
 * body: { name, maxEntries, scheduledAt, registrationDeadline }
 *
 * Cải tiến: Tự động populate entries và referees từ tournament đã chọn.
 *
 * mainflow.md:
 *  - tournament phải tồn tại
 *  - maxEntries default 8
 *  - Race được tạo với status='SCHEDULED'
 *  - tournament CANCELLED → 409
 */

import { useEffect, useState } from "react";
import { Plus, X, Flag, AlertTriangle, Users } from "lucide-react";
import { raceService } from "../../services/raceService";
import { tournamentService } from "../../services/tournamentService";
import "./RaceCreateFormModal.css";

function toIsoLocal(d) {
  // datetime-local input expects yyyy-MM-ddTHH:mm, trả về ISO luôn
  if (!d) return null;
  const iso = new Date(d).toISOString();
  return iso;
}

export default function RaceCreateFormModal({
  tournaments = [],
  defaultTournamentId,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(() => ({
    tournamentId: defaultTournamentId
      ? String(defaultTournamentId)
      : (tournaments[0]?.tournamentId
        ? String(tournaments[0].tournamentId)
        : ""),
    name: "",
    maxEntries: 8,
    scheduledAt: "",
    registrationDeadline: "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingTournamentData, setLoadingTournamentData] = useState(false);
  const [tournamentEntries, setTournamentEntries] = useState([]);
  const [tournamentReferees, setTournamentReferees] = useState([]);

  // Load entries và referees khi chọn tournament
  useEffect(() => {
    if (!form.tournamentId) {
      setTournamentEntries([]);
      setTournamentReferees([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingTournamentData(true);
      try {
        // Lấy tournament details để biết refereeAId, refereeBId
        const tournament = await tournamentService.getTournamentById(form.tournamentId);
        if (cancelled) return;

        // Lấy entries đã duyệt của tournament
        let entries = [];
        try {
          entries = await tournamentService.getTournamentEntries(form.tournamentId);
        } catch (_e) {
          // Backend chưa có endpoint - entries sẽ rỗng
          entries = [];
        }
        if (cancelled) return;

        setTournamentEntries(Array.isArray(entries) ? entries : []);
        // Referees từ tournament data (nếu backend trả về)
        const refs = [];
        if (tournament.refereeAId) {
          refs.push({ userId: tournament.refereeAId, fullName: tournament.refereeAName || `Trọng tài #${tournament.refereeAId}` });
        }
        if (tournament.refereeBId) {
          refs.push({ userId: tournament.refereeBId, fullName: tournament.refereeBName || `Trọng tài #${tournament.refereeBId}` });
        }
        setTournamentReferees(refs);
      } catch (_e) {
        // Ignore errors - form vẫn hoạt động
      } finally {
        if (!cancelled) setLoadingTournamentData(false);
      }
    })();

    return () => { cancelled = true; };
  }, [form.tournamentId]);

  useEffect(() => {
    // keep tournamentId luôn hợp lệ
    if (
      form.tournamentId &&
      !tournaments.some((t) => String(t.tournamentId) === form.tournamentId)
    ) {
      setForm((f) => ({
        ...f,
        tournamentId: tournaments[0]?.tournamentId
          ? String(tournaments[0].tournamentId)
          : "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournaments.length]);

  const handleChange = (field) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [field]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.tournamentId) {
      setError("Vui lòng chọn giải đấu");
      return;
    }
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên chặng đua");
      return;
    }
    const max = Number(form.maxEntries);
    if (!Number.isFinite(max) || max <= 0) {
      setError("Số ngựa tối đa phải lớn hơn 0");
      return;
    }

    if (
      form.scheduledAt &&
      form.registrationDeadline &&
      new Date(form.scheduledAt) <= new Date(form.registrationDeadline)
    ) {
      setError("Hạn chót đăng ký phải trước thời điểm thi đấu (tối thiểu 1 phút)");
      return;
    }

    if (form.scheduledAt && new Date(form.scheduledAt) <= new Date()) {
      setError("Thời điểm thi đấu phải ở tương lai");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        maxEntries: max,
        scheduledAt: form.scheduledAt ? toIsoLocal(form.scheduledAt) : undefined,
        registrationDeadline: form.registrationDeadline
          ? toIsoLocal(form.registrationDeadline)
          : undefined,
      };
      const created = await raceService.createRaceInTournament(
        form.tournamentId,
        payload
      );

      // Assign referees if available from tournament
      if (tournamentReferees.length === 2 && created.raceId) {
        try {
          await raceService.assignReferees(created.raceId, {
            refereeAId: tournamentReferees[0].userId,
            refereeBId: tournamentReferees[1].userId,
          });
        } catch (refErr) {
          console.warn("[RaceCreateFormModal] assign referees failed:", refErr);
        }
      }

      onCreated?.(created);
    } catch (e2) {
      setError(e2.message || "Không tạo được chặng đua");
    } finally {
      setSaving(false);
    }
  };

  if (tournaments.length === 0) {
    return (
      <div
        className="rcfm-backdrop"
        onClick={() => {
          if (!saving) onClose?.();
        }}
        role="presentation"
      >
        <div className="rcfm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="rcfm-modal__bar" />
          <header className="rcfm-modal__header">
            <div className="rcfm-modal__icon"><Flag size={22} /></div>
            <div className="rcfm-modal__heading">
              <h2 className="rcfm-modal__title">Tạo chặng đua</h2>
              <p className="rcfm-modal__subtitle">Cần có giải đấu trước</p>
            </div>
            <button type="button" className="rcfm-modal__close" onClick={onClose} disabled={saving} aria-label="Đóng">
              <X size={16} />
            </button>
          </header>
          <div className="rcfm-modal__body">
            <div className="rcfm-modal__alert" role="alert">
              <AlertTriangle size={14} />
              <span>Bạn cần tạo ít nhất một giải đấu trước khi thêm chặng đua.</span>
            </div>
          </div>
          <footer className="rcfm-modal__footer">
            <button type="button" className="rcfm-btn rcfm-btn--ghost" onClick={onClose}>
              Đóng
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rcfm-backdrop"
      onClick={() => {
        if (!saving) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="rcfm-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="rcfm-modal__bar" />
        <header className="rcfm-modal__header">
          <div className="rcfm-modal__icon"><Plus size={22} /></div>
          <div className="rcfm-modal__heading">
            <h2 className="rcfm-modal__title">Tạo chặng đua mới</h2>
            <p className="rcfm-modal__subtitle">FLOW 3 · Step 2</p>
          </div>
          <button
            type="button"
            className="rcfm-modal__close"
            onClick={() => onClose?.()}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="rcfm-modal__body">
          <div className="rcfm-field">
            <label className="rcfm-label">
              Giải đấu <span className="rcfm-req">*</span>
            </label>
            <select
              className="rcfm-select"
              value={form.tournamentId}
              onChange={handleChange("tournamentId")}
              required
              disabled={saving}
            >
              <option value="">Chọn giải đấu…</option>
              {tournaments.map((t) => (
                <option
                  key={t.tournamentId}
                  value={String(t.tournamentId)}
                  disabled={t.status === "CANCELLED" || t.status === "FINISHED"}
                >
                  {t.name} {t.status ? `· ${t.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rcfm-field">
            <label className="rcfm-label">
              Tên chặng đua <span className="rcfm-req">*</span>
            </label>
            <input
              className="rcfm-input"
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              maxLength={120}
              required
              autoFocus
              disabled={saving}
              placeholder="VD: Vòng loại 1, Chung kết, Bảng A…"
            />
          </div>

          <div className="rcfm-grid-2">
            <div className="rcfm-field">
              <label className="rcfm-label">
                Số ngựa tối đa <span className="rcfm-req">*</span>
              </label>
              <input
                className="rcfm-input"
                type="number"
                min="1"
                max="100"
                value={form.maxEntries}
                onChange={handleChange("maxEntries")}
                required
                disabled={saving}
              />
              <span className="rcfm-hint">Mặc định 8 (theo mainflow.md)</span>
            </div>

<div className="rcfm-field">
            <label className="rcfm-label">Hạn chót đăng ký</label>
            <input
              className="rcfm-input"
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={handleChange("registrationDeadline")}
              disabled={saving}
              aria-describedby="rcfm-reg-deadline-hint"
            />
            <span className="rcfm-hint" id="rcfm-reg-deadline-hint">
              Phải trước thời điểm thi đấu.
            </span>
          </div>
          </div>

          <div className="rcfm-field">
            <label className="rcfm-label">Thời điểm thi đấu</label>
            <input
              className="rcfm-input"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={handleChange("scheduledAt")}
              disabled={saving}
            />
            <span className="rcfm-hint">
              Có thể để trống nếu muốn cập nhật sau khi mở đăng ký.
            </span>
          </div>

          {/* Tournament entries preview */}
          {loadingTournamentData && (
            <div className="rcfm-loading-indicator">
              <div className="rcfm-spinner-small" />
              <span>Đang tải dữ liệu giải đấu...</span>
            </div>
          )}

          {!loadingTournamentData && form.tournamentId && (
            <>
              {/* Entries from tournament */}
              {tournamentEntries.length > 0 && (
                <div className="rcfm-field">
                  <label className="rcfm-label">
                    <Users size={12} style={{ marginRight: "0.3rem" }} />
                    Ngựa đã đăng ký ({tournamentEntries.length})
                  </label>
                  <div className="rcfm-chip-list">
                    {tournamentEntries.slice(0, 6).map((entry) => (
                      <span key={entry.entryId ?? entry.id} className="rcfm-chip">
                        {entry.horse?.name || `Entry #${entry.entryId ?? entry.id}`}
                      </span>
                    ))}
                    {tournamentEntries.length > 6 && (
                      <span className="rcfm-chip rcfm-chip--more">
                        +{tournamentEntries.length - 6} khác
                      </span>
                    )}
                  </div>
                  <span className="rcfm-hint">
                    {tournamentEntries.length} ngựa sẵn sàng tham gia chặng đua.
                  </span>
                </div>
              )}

              {/* Referees from tournament */}
              {tournamentReferees.length > 0 && (
                <div className="rcfm-field">
                  <label className="rcfm-label">
                    <Users size={12} style={{ marginRight: "0.3rem" }} />
                    Trọng tài đã phân công ({tournamentReferees.length}/2)
                  </label>
                  <div className="rcfm-chip-list">
                    {tournamentReferees.map((ref) => (
                      <span key={ref.userId} className="rcfm-chip rcfm-chip--referee">
                        {ref.fullName}
                      </span>
                    ))}
                    {tournamentReferees.length < 2 && (
                      <span className="rcfm-chip rcfm-chip--warn">
                        Cần {2 - tournamentReferees.length} trọng tài nữa
                      </span>
                    )}
                  </div>
                </div>
              )}

              {tournamentEntries.length === 0 && (
                <div className="rcfm-modal__alert rcfm-modal__alert--info" role="alert">
                  <AlertTriangle size={14} />
                  <span>Giải đấu chưa có ngựa đăng ký. Vui lòng chờ chủ ngựa đăng ký trước.</span>
                </div>
              )}
            </>
          )}

          {error ? (
            <div className="rcfm-modal__alert" role="alert">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <footer className="rcfm-modal__footer">
          <button
            type="button"
            className="rcfm-btn rcfm-btn--ghost"
            onClick={() => onClose?.()}
            disabled={saving}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="rcfm-btn rcfm-btn--primary"
            disabled={saving}
          >
            {saving ? "Đang tạo…" : "Tạo chặng đua"}
          </button>
        </footer>
      </form>
    </div>
  );
}