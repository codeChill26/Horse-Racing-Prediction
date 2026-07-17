/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AiAdvisoryModal — Xem gợi ý AI cho 1 race (Admin).
 *   Tab 1: Gợi ý Odds (Agent 1 — GET /api/admin/races/:id/ai-odds)
 *   Tab 2: Đánh giá rủi ro (Agent 2 — GET /api/admin/races/:id/risk-score)
 *
 * Cả 2 chỉ ĐỀ XUẤT — không ghi đè bảng Odds chính thức. Xem docs/AI_ADVISORY_API.md.
 */

import { useState } from "react";
import { Sparkles, ShieldAlert, Loader2 } from "lucide-react";
import { ModalShell } from "./AdminRaceDetailModals";
import { raceDetailService } from "../../../services/raceDetailService";

const RISK_LEVEL_LABEL = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nguy hiểm",
};

// Backend trả lỗi bằng tiếng Anh (xem docs/AI_ADVISORY_API.md) — dịch sang tiếng Việt
// cho Admin dễ đọc. Không khớp message nào -> giữ nguyên bản gốc (an toàn, không mất thông tin).
const ERROR_TRANSLATIONS = [
  [/^Invalid race id/i, "ID chặng đua không hợp lệ."],
  [/^margin must be a non-negative number/i, "Margin phải là số không âm."],
  [/^treasury query parameter is required/i, "Vốn nhà cái (treasury) là bắt buộc."],
  [/^treasury must be a non-negative number/i, "Treasury phải là số không âm."],
  [/^Race not found/i, "Không tìm thấy chặng đua."],
  [/^Race has no APPROVED entries to predict\.?/i, "Chặng đua chưa có ngựa nào được duyệt để AI dự đoán."],
  [
    /^Race has no computed odds yet\. Apply AI\/admin odds before closing the registration gate\.?/i,
    "Chặng đua chưa có odds. Hãy áp AI/admin odds trước khi đóng cổng đăng ký.",
  ],
];

function translateAiError(message) {
  if (!message) return message;
  const match = ERROR_TRANSLATIONS.find(([pattern]) => pattern.test(message));
  return match ? match[1] : message;
}

// Format số theo kiểu Việt Nam: dấu chấm ngăn cách hàng nghìn (vd 10000 -> "10.000").
function formatThousands(rawDigits) {
  if (!rawDigits) return "";
  return Number(rawDigits).toLocaleString("vi-VN");
}

function RiskBadge({ level }) {
  if (!level) return null;
  return (
    <span className={`aia-risk-badge aia-risk-badge--${level.toLowerCase()}`}>
      {RISK_LEVEL_LABEL[level] || level}
    </span>
  );
}

function OddsTab({ raceId }) {
  const [margin, setMargin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  // entryId -> giá trị odds admin đang chỉnh (string), khởi tạo từ suggestedOdds.
  const [overrides, setOverrides] = useState({});
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMsg, setApplyMsg] = useState(null);

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    setApplyMsg(null);
    try {
      const data = await raceDetailService.getAiOdds(raceId, margin || undefined);
      setResult(data);
      const initial = {};
      for (const s of data.suggestions || []) {
        if (s.entryId != null) initial[s.entryId] = String(s.suggestedOdds);
      }
      setOverrides(initial);
    } catch (e) {
      setResult(null);
      setError(translateAiError(e.message) || "Không lấy được gợi ý odds từ AI");
    } finally {
      setLoading(false);
    }
  };

  // Tổng xác suất ngầm định (1/odds) từ các giá trị admin ĐANG nhập — cho admin tự
  // kiểm tra trước khi bấm Áp dụng, vì đổi tay 1 dòng cũng làm lệch tổng như đổi qua API.
  const impliedSumPct = (() => {
    const values = Object.values(overrides)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (values.length === 0) return null;
    return values.reduce((sum, o) => sum + 1 / o, 0) * 100;
  })();

  const handleApplyAll = async () => {
    setApplyBusy(true);
    setApplyMsg(null);
    try {
      const entries = (result.suggestions || [])
        .filter((s) => s.entryId != null)
        .map((s) => ({ entryId: s.entryId, oddsFinal: overrides[s.entryId] }));
      await raceDetailService.applyOddsSuggestions(raceId, entries);
      setApplyMsg({ type: "success", text: "Đã áp dụng odds mới cho toàn bộ race." });
    } catch (e) {
      setApplyMsg({ type: "error", text: translateAiError(e.message) || e.message });
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <div className="aia-tab">
      <div className="aia-form-row">
        <label className="aia-label" htmlFor="aia-margin">
          Margin (tùy chọn, mặc định 0.15)
        </label>
        <input
          id="aia-margin"
          className="aia-input"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.15"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          disabled={loading}
        />
        <button
          type="button"
          className="ard-btn ard-btn--primary"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="rab-spin" /> : "Lấy gợi ý"}
        </button>
      </div>

      {error && <div className="ard-alert ard-alert--error">{error}</div>}

      {result && (
        <>
          <p className="aia-note">{result.note}</p>
          <div className="et-table-wrap">
            <table className="et-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ngựa</th>
                  <th>Jockey</th>
                  <th>Xác suất thắng</th>
                  <th>Fair odds</th>
                  <th>Odds đề xuất</th>
                  <th>Odds sẽ áp dụng</th>
                </tr>
              </thead>
              <tbody>
                {(result.suggestions || []).map((s) => (
                  <tr key={s.entryId ?? `${s.horseName}-${s.rank}`}>
                    <td>{s.rank}</td>
                    <td>{s.horseName}</td>
                    <td>{s.jockeyName || "—"}</td>
                    <td>{s.winProbability}%</td>
                    <td>{s.fairOdds}</td>
                    <td>
                      <strong>{s.suggestedOdds}</strong>
                    </td>
                    <td>
                      <input
                        className="aia-input aia-input--sm"
                        type="number"
                        min="1.2"
                        max="20"
                        step="0.01"
                        value={overrides[s.entryId] ?? ""}
                        onChange={(e) =>
                          setOverrides((prev) => ({ ...prev, [s.entryId]: e.target.value }))
                        }
                        disabled={applyBusy || s.entryId == null}
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
                  impliedSumPct >= 105
                    ? "aia-apply-msg--success"
                    : "aia-apply-msg--error"
                }`}
              >
                Tổng xác suất ngầm định hiện tại: {impliedSumPct.toFixed(2)}% (bắt buộc
                ≥ 105% — dưới mức này backend sẽ từ chối vì nhà cái chắc chắn lỗ)
              </span>
            )}
            <button
              type="button"
              className="ard-btn ard-btn--primary"
              onClick={handleApplyAll}
              disabled={applyBusy}
            >
              {applyBusy ? <Loader2 size={16} className="rab-spin" /> : "Áp dụng tất cả"}
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
  );
}

function RiskTab({ raceId, registrationOpen }) {
  const [treasury, setTreasury] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await raceDetailService.getRiskScore(raceId, treasury);
      setResult(data);
    } catch (e) {
      setResult(null);
      setError(translateAiError(e.message) || "Không lấy được đánh giá rủi ro từ AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aia-tab">
      {registrationOpen && (
        <div className="ard-alert ard-alert--warn">
          Race đang mở đăng ký — chưa có odds chính thức, đánh giá rủi ro nhiều khả năng
          sẽ báo lỗi cho tới khi đóng cổng đăng ký.
        </div>
      )}

      <div className="aia-form-row">
        <label className="aia-label" htmlFor="aia-treasury">
          Vốn nhà cái (treasury) *
        </label>
        <input
          id="aia-treasury"
          className="aia-input"
          type="text"
          inputMode="numeric"
          placeholder="Vd: 10.000"
          value={formatThousands(treasury)}
          onChange={(e) => setTreasury(e.target.value.replace(/\D/g, ""))}
          disabled={loading}
        />
        <button
          type="button"
          className="ard-btn ard-btn--primary"
          onClick={handleFetch}
          disabled={loading || !treasury}
        >
          {loading ? <Loader2 size={16} className="rab-spin" /> : "Đánh giá"}
        </button>
      </div>

      {error && <div className="ard-alert ard-alert--error">{error}</div>}

      {result && (
        <>
          <div className="aia-risk-summary">
            <div className="aia-risk-summary__item">
              <span className="aia-risk-summary__label">Risk score</span>
              <span className="aia-risk-summary__value">
                {result.riskScore} <RiskBadge level={result.riskLevel} />
              </span>
            </div>
            <div className="aia-risk-summary__item">
              <span className="aia-risk-summary__label">Tổng pool</span>
              <span className="aia-risk-summary__value">{result.totalPool}</span>
            </div>
            <div className="aia-risk-summary__item">
              <span className="aia-risk-summary__label">Lỗ tối đa (nếu xảy ra)</span>
              <span className="aia-risk-summary__value">{result.worstCaseLiability}</span>
            </div>
            <div className="aia-risk-summary__item">
              <span className="aia-risk-summary__label">Treasury</span>
              <span className="aia-risk-summary__value">{result.treasury}</span>
            </div>
          </div>

          <div className="et-table-wrap">
            <table className="et-table">
              <thead>
                <tr>
                  <th>Ngựa</th>
                  <th>Odds hiện tại</th>
                  <th>Tổng cược</th>
                  <th>% pool</th>
                  <th>Lỗ nếu thắng</th>
                  <th>Odds đề xuất</th>
                  <th>Lý do</th>
                </tr>
              </thead>
              <tbody>
                {(result.horses || []).map((h) => (
                  <tr key={h.entryId ?? h.horseName}>
                    <td>{h.horseName}</td>
                    <td>{h.currentOdds}</td>
                    <td>{h.totalBet}</td>
                    <td>{h.poolShare}%</td>
                    <td>{h.liabilityIfWin}</td>
                    <td>
                      <strong>{h.suggestedOdds}</strong>
                    </td>
                    <td>{h.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function AiAdvisoryModal({ race, onClose }) {
  const [activeTab, setActiveTab] = useState("odds");
  const raceId = race?.raceId ?? race?.id;

  return (
    <ModalShell
      className="aia-modal"
      onClose={onClose}
      busy={false}
      labelId="aia-title"
      descId="aia-desc"
    >
      <div className="ard-reason-modal__bar" />
      <div className="ard-reason-modal__header">
        <Sparkles size={24} className="ard-reason-modal__icon" />
        <div>
          <h2 id="aia-title" className="ard-reason-modal__title">Gợi ý AI</h2>
          <p id="aia-desc" className="ard-reason-modal__subtitle">{race?.name}</p>
        </div>
      </div>

      <div className="aia-tabs">
        <button
          type="button"
          className={`aia-tab-btn ${activeTab === "odds" ? "aia-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("odds")}
        >
          <Sparkles size={14} />
          Gợi ý Odds
        </button>
        <button
          type="button"
          className={`aia-tab-btn ${activeTab === "risk" ? "aia-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("risk")}
        >
          <ShieldAlert size={14} />
          Đánh giá rủi ro
        </button>
      </div>

      <div className="ard-reason-modal__body">
        {activeTab === "odds" ? (
          <OddsTab raceId={raceId} />
        ) : (
          <RiskTab raceId={raceId} registrationOpen={!!race?.registrationOpen} />
        )}
      </div>

      <div className="ard-reason-modal__footer">
        <button type="button" className="ard-btn ard-btn--ghost" onClick={onClose}>
          Đóng
        </button>
      </div>
    </ModalShell>
  );
}
