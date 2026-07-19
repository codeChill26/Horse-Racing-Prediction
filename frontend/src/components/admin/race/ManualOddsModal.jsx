/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ManualOddsModal — Admin chỉnh odds THỦ CÔNG cho toàn bộ ngựa APPROVED của 1 race,
 * ĐỘC LẬP với gợi ý AI (không cần gọi AI service). Nạp odds hiện tại để sửa, kiểm tra
 * Σ(1/odds) ≥ 105% ngay trên UI, rồi lưu qua PATCH /api/admin/races/:id/odds.
 *
 * Backend là chốt chặn cuối (đủ tất cả entry APPROVED, odds 1.2–20, Σ≥105%, race
 * SCHEDULED hoặc IN_PROGRESS + đã đóng cổng đăng ký) — lỗi vi phạm hiện ra applyMsg.
 */

import { useEffect, useState } from "react";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { ModalShell } from "./AdminRaceDetailModals";
import { raceDetailService } from "../../../services/raceDetailService";

export default function ManualOddsModal({ race, onClose, onSaved }) {
  const raceId = race?.raceId ?? race?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]); // [{entryId, horseName, jockeyName, currentOdds}]
  const [overrides, setOverrides] = useState({}); // entryId -> string
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMsg, setApplyMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const entries = await raceDetailService.getEntries(raceId, { status: "APPROVED" });
        if (!alive) return;
        const approved = (entries || []).filter((e) => e.status === "APPROVED");
        setRows(
          approved.map((e) => ({
            entryId: e.entryId,
            horseName: e.horseName,
            jockeyName: e.jockeyName,
            currentOdds: e.oddsFinal,
          }))
        );
        const init = {};
        for (const e of approved) {
          init[e.entryId] = e.oddsFinal != null ? String(e.oddsFinal) : "";
        }
        setOverrides(init);
      } catch (e) {
        if (alive) setError(e.message || "Không tải được danh sách odds");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [raceId]);

  // Tổng xác suất ngầm định từ odds admin ĐANG nhập — kiểm tra trước khi lưu, vì sửa 1
  // dòng cũng làm lệch tổng như đổi qua API (backend chặn nếu < 105%).
  const impliedSumPct = (() => {
    const values = Object.values(overrides)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (values.length === 0) return null;
    return values.reduce((sum, o) => sum + 1 / o, 0) * 100;
  })();

  const handleSave = async () => {
    setApplyBusy(true);
    setApplyMsg(null);
    try {
      const entries = rows.map((r) => ({ entryId: r.entryId, oddsFinal: overrides[r.entryId] }));
      await raceDetailService.applyOddsSuggestions(raceId, entries);
      setApplyMsg({ type: "success", text: "Đã lưu odds mới cho toàn bộ race." });
      if (onSaved) await onSaved();
    } catch (e) {
      setApplyMsg({ type: "error", text: e.message });
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <ModalShell
      className="aia-modal"
      onClose={onClose}
      busy={applyBusy}
      labelId="mo-title"
      descId="mo-desc"
    >
      <div className="ard-reason-modal__bar" />
      <div className="ard-reason-modal__header">
        <SlidersHorizontal size={24} className="ard-reason-modal__icon" />
        <div>
          <h2 id="mo-title" className="ard-reason-modal__title">Chỉnh odds thủ công</h2>
          <p id="mo-desc" className="ard-reason-modal__subtitle">{race?.name}</p>
        </div>
      </div>

      <div className="ard-reason-modal__body">
        <div className="aia-tab">
          {loading && (
            <div className="aia-note">
              <Loader2 size={16} className="rab-spin" /> Đang tải odds…
            </div>
          )}
          {error && <div className="ard-alert ard-alert--error">{error}</div>}

          {!loading && !error && rows.length === 0 && (
            <div className="ard-alert ard-alert--warn">
              Race chưa có ngựa APPROVED nào để chỉnh odds.
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <>
              <p className="aia-note">
                Sửa odds trực tiếp (1.2 – 20). Phải sửa <strong>tất cả</strong> các cửa cùng
                lúc; tổng Σ(1/odds) phải ≥ 105% nếu không backend sẽ từ chối.
              </p>
              <div className="et-table-wrap">
                <table className="et-table">
                  <thead>
                    <tr>
                      <th>Ngựa</th>
                      <th>Jockey</th>
                      <th>Odds hiện tại</th>
                      <th>Odds mới</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.entryId}>
                        <td>{r.horseName || "—"}</td>
                        <td>{r.jockeyName || "—"}</td>
                        <td>{r.currentOdds != null ? r.currentOdds : "—"}</td>
                        <td>
                          <input
                            className="aia-input aia-input--sm"
                            type="number"
                            min="1.2"
                            max="20"
                            step="0.01"
                            value={overrides[r.entryId] ?? ""}
                            onChange={(e) =>
                              setOverrides((prev) => ({ ...prev, [r.entryId]: e.target.value }))
                            }
                            disabled={applyBusy}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="aia-apply-all">
                {impliedSumPct != null && (
                  <span
                    className={`aia-apply-msg ${
                      impliedSumPct >= 105 ? "aia-apply-msg--success" : "aia-apply-msg--error"
                    }`}
                  >
                    Tổng xác suất ngầm định: {impliedSumPct.toFixed(2)}% (bắt buộc ≥ 105%)
                  </span>
                )}
                <button
                  type="button"
                  className="ard-btn ard-btn--primary"
                  onClick={handleSave}
                  disabled={applyBusy}
                >
                  {applyBusy ? <Loader2 size={16} className="rab-spin" /> : "Lưu odds"}
                </button>
                {applyMsg && (
                  <div
                    className={
                      applyMsg.type === "success"
                        ? "ard-alert ard-alert--ok"
                        : "ard-alert ard-alert--error"
                    }
                  >
                    {applyMsg.text}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ard-reason-modal__footer">
        <button type="button" className="ard-btn ard-btn--ghost" onClick={onClose}>
          Đóng
        </button>
      </div>
    </ModalShell>
  );
}
