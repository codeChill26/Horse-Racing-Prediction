/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdminResolveConflictModal
 *
 * Modal admin ghi đè thứ hạng khi race ở trạng thái PAUSED
 * (2 referee nộp kết quả không khớp).
 * Mirror logic từ mobile `admin_race_referee_screen.dart` (tab "Giải quyết").
 *
 * Flow:
 *  - Mở modal → load GET /api/admin/races/:id/review-conflict
 *    để có danh sách entries + 2 submission song song.
 *  - Admin nhập rank cho từng entry (override rank TT1/TT2 nếu cần).
 *  - Nhập lý do (≥ 5 ký tự).
 *  - Submit → POST /api/admin/races/:id/resolve-conflict
 *    → race.status === 'FINISHED' (sau khi service settle).
 *  - Sau success → onConfirm(race) để parent merge state.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { Gavel, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { ModalShell } from "./AdminRaceDetailModals";
import { adminRaceConflictService } from "../../../services/adminRaceConflictService";
import "./AdminResolveConflictModal.css";

const REASON_MIN = 5;

/**
 * Build danh sách entries để nhập rank: union của entryIds xuất hiện trong
 * submissions + raceEntries của race (nếu BE include). Mobile làm tương tự.
 */
function buildEntryRows(submissions, fallbackEntries = []) {
  const map = new Map();
  submissions?.forEach((sub) => {
    sub.rankings?.forEach((r) => {
      if (r.entryId == null) return;
      if (!map.has(r.entryId)) {
        map.set(r.entryId, {
          entryId: r.entryId,
          horseName: r.horseName ?? fallbackEntries.find((e) => e.entryId === r.entryId)?.horseName,
          ttA: null,
          ttB: null,
        });
      }
    });
  });
  // Fill horseName từ fallback nếu thiếu
  fallbackEntries.forEach((e) => {
    if (!map.has(e.entryId)) {
      map.set(e.entryId, { entryId: e.entryId, horseName: e.horseName, ttA: null, ttB: null });
    } else if (!map.get(e.entryId).horseName && e.horseName) {
      map.get(e.entryId).horseName = e.horseName;
    }
  });
  submissions?.forEach((sub, idx) => {
    sub.rankings?.forEach((r) => {
      const row = map.get(r.entryId);
      if (!row) return;
      if (idx === 0) row.ttA = r.rank;
      else if (idx === 1) row.ttB = r.rank;
    });
  });
  return Array.from(map.values()).sort((a, b) => a.entryId - b.entryId);
}

export default function AdminResolveConflictModal({
  race,
  onConfirm,
  onClose,
  busy = false,
}) {
  const baseId = useId();
  const id = `conflict-${baseId.replace(/:/g, "")}`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [rows, setRows] = useState([]);
  const [ranks, setRanks] = useState({}); // entryId -> rank
  const [reason, setReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminRaceConflictService.reviewConflict(race.raceId);
        if (cancelled) return;
        setReview(data);
        const built = buildEntryRows(data?.submissions ?? [], race?.entries ?? []);
        setRows(built);
        // Khởi tạo rank rỗng — admin tự nhập.
        setRanks({});
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Không tải được dữ liệu đối chiếu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [race?.raceId, race?.entries]);

  const filledCount = useMemo(
    () => Object.values(ranks).filter((v) => v && Number(v) > 0).length,
    [ranks],
  );

  const reasonTrimmed = reason.trim();
  const canSubmit =
    !busy &&
    !loading &&
    !submitting &&
    filledCount > 0 &&
    reasonTrimmed.length >= REASON_MIN;

  const handleRankChange = (entryId, value) => {
    setError("");
    setRanks((prev) => {
      const next = { ...prev };
      const n = parseInt(value, 10);
      if (!Number.isInteger(n) || n <= 0) {
        delete next[entryId];
      } else {
        next[entryId] = n;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (filledCount === 0) {
      setError("Vui lòng nhập thứ hạng ít nhất cho 1 ngựa.");
      return;
    }
    if (reasonTrimmed.length < REASON_MIN) {
      setError(`Lý do phải có ít nhất ${REASON_MIN} ký tự.`);
      return;
    }

    const finalResults = Object.entries(ranks)
      .filter(([, rank]) => rank && Number(rank) > 0)
      .map(([entryId, rank]) => ({
        entryId: Number(entryId),
        rank: Number(rank),
      }));

    setSubmitting(true);
    try {
      const updated = await adminRaceConflictService.resolveConflict(race.raceId, {
        finalResults,
        reason: reasonTrimmed,
      });
      onConfirm?.(updated);
    } catch (e) {
      setError(e?.message || "Xử lý tranh chấp thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const subA = review?.submissions?.[0];
  const subB = review?.submissions?.[1];
  const alreadyAgreed = Boolean(review?.alreadyAgreed);

  return (
    <ModalShell
      className="ard-conflict-modal"
      onClose={onClose}
      busy={busy || submitting}
      labelId={`${id}-title`}
      descId={`${id}-desc`}
    >
      <div className="ard-conflict-modal__bar ard-conflict-modal__bar--warn" />
      <div className="ard-conflict-modal__header">
        <Gavel size={24} className="ard-conflict-modal__icon" />
        <div>
          <h2 id={`${id}-title`} className="ard-conflict-modal__title">
            Xử lý tranh chấp trọng tài
          </h2>
          <p className="ard-conflict-modal__subtitle">
            {race?.name ? `Race #${race.raceId} · ${race.name}` : `Race #${race?.raceId}`}
          </p>
        </div>
      </div>

      <div id={`${id}-desc`} className="ard-conflict-modal__body">
        {loading && (
          <div className="ard-conflict-modal__loading">
            <Loader2 size={16} className="ard-spin" /> Đang tải kết quả 2 trọng tài…
          </div>
        )}

        {!loading && alreadyAgreed && (
          <div className="ard-conflict-modal__notice ard-conflict-modal__notice--ok">
            <CheckCircle2 size={16} />
            <span>
              Hai trọng tài đã đồng thuận kết quả — hệ thống tự xử lý, admin không cần can thiệp.
            </span>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="ard-conflict-modal__empty">
            Chưa có entry nào để xếp hạng.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="ard-conflict-modal__compare">
              <div className="ard-conflict-modal__sub">
                <span className="ard-conflict-modal__sub-label">TT1</span>
                <span className="ard-conflict-modal__sub-name">
                  {subA?.refereeName || "—"}
                </span>
              </div>
              <div className="ard-conflict-modal__sub">
                <span className="ard-conflict-modal__sub-label">TT2</span>
                <span className="ard-conflict-modal__sub-name">
                  {subB?.refereeName || "—"}
                </span>
              </div>
            </div>

            <div className="ard-conflict-modal__table-wrap">
              <table className="ard-conflict-modal__table">
                <thead>
                  <tr>
                    <th>Ngựa</th>
                    <th className="ard-conflict-modal__th-num">TT1</th>
                    <th className="ard-conflict-modal__th-num">TT2</th>
                    <th className="ard-conflict-modal__th-num">Rank quyết định</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const conflicting =
                      row.ttA != null && row.ttB != null && row.ttA !== row.ttB;
                    return (
                      <tr key={row.entryId} className={conflicting ? "is-conflict" : ""}>
                        <td>{row.horseName || `Entry #${row.entryId}`}</td>
                        <td className="ard-conflict-modal__td-num">{row.ttA ?? "—"}</td>
                        <td className="ard-conflict-modal__td-num">{row.ttB ?? "—"}</td>
                        <td className="ard-conflict-modal__td-num">
                          <input
                            type="number"
                            min={1}
                            className="ard-conflict-modal__rank-input"
                            value={ranks[row.entryId] ?? ""}
                            onChange={(e) => handleRankChange(row.entryId, e.target.value)}
                            disabled={busy || submitting}
                            aria-label={`Rank quyết định cho ${row.horseName || `Entry #${row.entryId}`}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <label className="ard-conflict-modal__reason-label" htmlFor={`${id}-reason`}>
              Lý do can thiệp <span className="ard-required">*</span>{" "}
              <span className="ard-conflict-modal__reason-hint">
                (≥ {REASON_MIN} ký tự, lưu audit log)
              </span>
            </label>
            <textarea
              id={`${id}-reason`}
              className="ard-conflict-modal__reason-input"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="Mô tả ngắn gọn lý do ghi đè kết quả…"
              disabled={busy || submitting}
            />
          </>
        )}

        {error && (
          <div className="ard-conflict-modal__error" role="alert">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="ard-conflict-modal__footer">
        <button
          type="button"
          className="ard-btn ard-btn--ghost"
          onClick={onClose}
          disabled={busy || submitting}
        >
          Hủy
        </button>
        <button
          type="button"
          className="ard-btn ard-btn--warn"
          onClick={handleSubmit}
          disabled={!canSubmit || alreadyAgreed}
          title={alreadyAgreed ? "Hai trọng tài đã đồng thuận — không cần can thiệp" : undefined}
        >
          {submitting ? "Đang ghi đè…" : `Xác nhận & ghi đè (${filledCount} rank)`}
        </button>
      </div>
    </ModalShell>
  );
}
