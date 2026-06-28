/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee — Race Control Page.
 * Trang điều khiển race chính: start, xem legs, nhập kết quả.
 *
 * BLIND DOUBLE ENTRY RULES (enforced on FE):
 * - Không hiển thị kết quả của referee còn lại
 * - Không cho sửa submission đã gửi
 * - Không cho submit lần 2 cho cùng 1 leg
 * - Frontend chỉ gửi kết quả, backend là nguồn quyết định
 *
 * TODO: Backend chưa có APIs riêng cho referee.
 * MOCK DATA: refereeRaceService.getRaceControlDetail()
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PlayCircle,
  Clock,
  MapPin,
  Trophy,
  Hash,
  AlertTriangle,
  Lock,
  Eye,
} from "lucide-react";
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal";
import {
  RefereePageHeader,
  RefereeToolbar,
  RefereeErrorAlert,
  RaceStatusBadge,
  LegStatusBadge,
} from "../../components/referee/RefereeCommon";
import { refereeRaceService } from "../../services/refereeService";
import { refereeSubmissionService } from "../../services/refereeService";
import "./RefereeRaceControlPage.css";

const RESULT_STATUS_OPTIONS = [
  { value: "", label: "Chọn trạng thái…" },
  { value: "FINISHED", label: "FINISHED — Về đích" },
  { value: "DNF", label: "DNF — Did Not Finish" },
  { value: "DQ", label: "DQ — Disqualified" },
];

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RefereeRaceControlPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();

  const [race, setRace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [showLegModal, setShowLegModal] = useState(false);
  const [selectedLeg, setSelectedLeg] = useState(null);

  const loadRace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refereeRaceService.getRaceControlDetail(raceId);
      setRace(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    loadRace();
  }, [loadRace]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const canStart = race?.status === "Scheduled";
  const canEnterResults = race?.status === "InProgress";
  const isPaused = race?.status === "Paused";

  const handleStartRace = async () => {
    if (!canStart) return;
    setSubmitting(true);
    try {
      await refereeRaceService.startRace(raceId);
      setToast({
        type: "success",
        text: "Race đã bắt đầu. Cược mới đã bị khóa. Bạn có thể nhập kết quả leg.",
      });
      await loadRace();
    } catch (e) {
      setToast({
        type: "error",
        text: e instanceof Error ? e.message : "Không thể bắt đầu race",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLegModal = (leg) => {
    setSelectedLeg(leg);
    setShowLegModal(true);
  };

  const handleLegSubmitSuccess = () => {
    setShowLegModal(false);
    setSelectedLeg(null);
    setToast({ type: "success", text: "Kết quả đã được gửi. Bạn không thể chỉnh sửa." });
    loadRace();
  };

  const handleLegSubmitError = (msg) => {
    setToast({ type: "error", text: msg });
  };

  return (
    <div className="ref-page">
      {toast ? (
        <div className={`ref-toast ref-toast--${toast.type}`} role="status">
          <span className="ref-toast-icon" aria-hidden="true">
            {toast.type === "success" ? "✓" : toast.type === "info" ? "i" : "!"}
          </span>
          <div className="ref-toast-body">
            <p>{toast.text}</p>
          </div>
          <button
            type="button"
            className="ref-toast-close"
            onClick={() => setToast(null)}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="ref-page-inner">
        <RefereePageHeader
          eyebrow="Race Control"
          title={race?.name || "Điều khiển Race"}
          subtitle="Nhập kết quả từng leg theo cơ chế Blind Double Entry."
          onRefresh={loadRace}
          refreshing={loading}
          actions={
            <button
              type="button"
              className="ref-btn ref-btn--ghost"
              onClick={() => navigate("/referee/assigned-races")}
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
          }
        />

        {error ? <RefereeErrorAlert message={error} onRetry={loadRace} /> : null}

        {loading ? (
          <div className="ref-rc-loading">
            <div className="ref-loading-bar" />
            <div className="ref-loading-bar ref-loading-bar--short" />
          </div>
        ) : race ? (
          <>
            {/* Race Info Card */}
            <div className="ref-race-info-card">
              <div className="ref-race-info-card__main">
                <div className="ref-race-info-card__header">
                  <div>
                    <span className="ref-race-info-card__id">
                      <Hash size={12} /> Race #{race.raceId || race.id}
                    </span>
                    <h2>{race.name}</h2>
                    <p>{race.tournamentName}</p>
                  </div>
                  <div className="ref-race-info-card__badges">
                    <RaceStatusBadge status={race.status} />
                    {race.bettingStatus === "Closed" || race.bettingStatus === "Closed" ? (
                      <span className="ref-badge ref-badge--muted">
                        <Lock size={11} /> Cược đã khóa
                      </span>
                    ) : (
                      <span className="ref-badge ref-badge--live">
                        <Eye size={11} /> Cược mở
                      </span>
                    )}
                  </div>
                </div>

                <div className="ref-race-info-card__meta">
                  <div className="ref-race-info-card__meta-item">
                    <Trophy size={14} />
                    <span>{race.tournamentName || "—"}</span>
                  </div>
                  <div className="ref-race-info-card__meta-item">
                    <MapPin size={14} />
                    <span>{race.location || "Chưa cập nhật"}</span>
                  </div>
                  <div className="ref-race-info-card__meta-item">
                    <Clock size={14} />
                    <span>{formatDateTime(race.scheduledStartTime)}</span>
                  </div>
                </div>

                {race.assignedRole ? (
                  <div className="ref-race-info-card__role">
                    Vai trò của bạn:{" "}
                    <strong>{race.assignedRole}</strong>
                    {race.otherRefereeName ? (
                      <> · Trọng tài còn lại: <strong>{race.otherRefereeName}</strong></>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Start Race Button */}
              <div className="ref-race-info-card__action">
                {canStart ? (
                  <button
                    type="button"
                    className="ref-btn ref-btn--primary ref-btn--start"
                    onClick={handleStartRace}
                    disabled={submitting}
                  >
                    <PlayCircle size={16} />
                    {submitting ? "Đang bắt đầu…" : "Start Race"}
                  </button>
                ) : null}
                {isPaused ? (
                  <div className="ref-rc-paused-msg">
                    <AlertTriangle size={16} />
                    Race đang bị tạm dừng do có sai lệch kết quả.
                  </div>
                ) : null}
                {!canStart && !isPaused && race.status === "InProgress" ? (
                  <div className="ref-rc-live-msg">
                    <span className="ref-rc-live-dot" />
                    Race đang diễn ra
                  </div>
                ) : null}
              </div>
            </div>

            {/* Legs List */}
            <section className="ref-section">
              <div className="ref-section__head">
                <div>
                  <h2>Danh sách Leg</h2>
                  <p>{race.totalLegs || 0} leg · {race.legs?.filter(l => l.mySubmissionStatus === "SubmittedByMe" || l.mySubmissionStatus === "WaitingOtherReferee").length || 0} đã submit</p>
                </div>
              </div>

              <div className="ref-legs-list">
                {(race.legs || []).map((leg) => {
                  const submitted = leg.mySubmissionStatus === "SubmittedByMe" || leg.mySubmissionStatus === "WaitingOtherReferee";
                  const conflicted = leg.status === "Conflicted";
                  const canSubmit = canEnterResults && !submitted && !conflicted && leg.mySubmissionStatus !== "SubmittedByMe";
                  const locked = submitted || conflicted;

                  return (
                    <div key={leg.id || leg.legId} className={`ref-leg-card${conflicted ? " ref-leg-card--conflicted" : submitted ? " ref-leg-card--submitted" : ""}`}>
                      <div className="ref-leg-card__head">
                        <div className="ref-leg-card__number">
                          <span>Leg</span>
                          <strong>{leg.legNumber}</strong>
                        </div>
                        <div className="ref-leg-card__info">
                          <h3>{leg.name || `Leg ${leg.legNumber}`}</h3>
                          <div className="ref-leg-card__statuses">
                            <LegStatusBadge status={leg.status} />
                            <span className="ref-leg-card__my-status">
                              {leg.mySubmissionStatus === "SubmittedByMe"
                                ? "✓ Bạn đã submit"
                                : leg.mySubmissionStatus === "WaitingOtherReferee"
                                  ? "⏳ Đang chờ TT còn lại"
                                  : leg.mySubmissionStatus === "NotSubmitted"
                                    ? "○ Chưa nhập"
                                    : leg.mySubmissionStatus}
                            </span>
                            <span className="ref-leg-card__other-status">
                              {locked
                                ? "Trọng tài còn lại: " +
                                  (leg.otherRefereeStatus === "SubmittedByMe"
                                    ? "✓ Đã submit"
                                    : leg.otherRefereeStatus === "WaitingOtherReferee"
                                      ? "⏳ Đang chờ"
                                      : "○ Chưa nhập")
                                : "Kết quả TT còn lại: Ẩn (blind)"}
                            </span>
                          </div>
                        </div>
                        <div className="ref-leg-card__action">
                          {canSubmit ? (
                            <button
                              type="button"
                              className="ref-btn ref-btn--primary ref-btn--sm"
                              onClick={() => handleOpenLegModal(leg)}
                            >
                              Nhập kết quả
                            </button>
                          ) : locked ? (
                            <span className="ref-btn ref-btn--sm" style={{ opacity: 0.5, cursor: "default" }}>
                              <Lock size={12} /> {conflicted ? "Conflict" : "Đã gửi"}
                            </span>
                          ) : (
                            <span className="ref-btn ref-btn--sm ref-btn--ghost" style={{ opacity: 0.4 }}>
                              {race.status !== "InProgress"
                                ? "Race chưa bắt đầu"
                                : "Chờ race InProgress"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Horses preview */}
                      {(leg.horses || []).length > 0 ? (
                        <div className="ref-leg-card__horses">
                          {leg.horses.slice(0, 4).map((h) => (
                            <div key={h.horseId} className="ref-leg-card__horse">
                              <span className="ref-leg-card__gate">{h.gateNumber}</span>
                              <span className="ref-leg-card__horse-name">{h.horseName || "Ngựa"}</span>
                              <span className="ref-leg-card__jockey">{h.jockeyName || "—"}</span>
                              <span className={`ref-badge ref-badge--${h.status === "FINISHED" ? "ok" : h.status === "DQ" ? "danger" : "muted"}`}>
                                {h.status || "—"}
                              </span>
                            </div>
                          ))}
                          {(leg.horses || []).length > 4 ? (
                            <p className="ref-leg-card__more">
                              +{(leg.horses || []).length - 4} ngựa khác
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {conflicted && leg.conflictReason ? (
                        <p className="ref-leg-card__conflict-reason">
                          <AlertTriangle size={13} />
                          {leg.conflictReason}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Blind Entry Notice */}
            <div className="ref-blind-notice">
              <Lock size={14} />
              <div>
                <strong>Cơ chế Blind Double Entry</strong>
                <p>
                  Kết quả bạn nhập sẽ không hiển thị cho trọng tài còn lại cho đến khi backend xác nhận.
                  Bạn không thể sửa kết quả đã gửi.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {showLegModal && selectedLeg ? (
        <LegResultModal
          leg={selectedLeg}
          race={race}
          onClose={() => { setShowLegModal(false); setSelectedLeg(null); }}
          onSuccess={handleLegSubmitSuccess}
          onError={handleLegSubmitError}
        />
      ) : null}
    </div>
  );
}

/* ============== LEG RESULT MODAL ============== */
function LegResultModal({ leg, race, onClose, onSuccess, onError }) {
  const [results, setResults] = useState(
    () =>
      (leg.horses || []).map((h) => ({
        horseId: h.horseId,
        gateNumber: h.gateNumber,
        horseName: h.horseName,
        jockeyName: h.jockeyName,
        status: h.status || "",
        rank: h.rank ?? "",
        note: h.note || "",
      })),
  );
  const [refereeNote, setRefereeNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const setResultStatus = (idx, status) => {
    setResults((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              status,
              // Auto-clear rank if not FINISHED
              rank: status !== "FINISHED" ? "" : r.rank,
            }
          : r,
      ),
    );
  };

  const setResultRank = (idx, rank) => {
    const val = rank === "" ? "" : Math.max(1, parseInt(rank, 10) || 1);
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, rank: val } : r)),
    );
  };

  const setResultNote = (idx, note) => {
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, note } : r)),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!confirmed) {
      setFormError("Bạn phải xác nhận kết quả trước khi gửi.");
      return;
    }

    // Validate: all horses must have status
    const missingStatus = results.some((r) => !r.status);
    if (missingStatus) {
      setFormError("Phải chọn trạng thái cho tất cả ngựa.");
      return;
    }

    // Validate: FINISHED must have rank
    const invalidRank = results.some(
      (r) => r.status === "FINISHED" && (!r.rank || r.rank < 1),
    );
    if (invalidRank) {
      setFormError("Ngựa Về đích (FINISHED) phải có thứ hạng >= 1.");
      return;
    }

    // Validate: no duplicate ranks
    const finished = results.filter((r) => r.status === "FINISHED");
    const ranks = finished.map((r) => r.rank);
    if (new Set(ranks).size !== ranks.length) {
      setFormError("Không được để 2 ngựa cùng thứ hạng.");
      return;
    }

    // Validate: ranks must be sequential 1, 2, 3...
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    for (let i = 0; i < sortedRanks.length; i++) {
      if (sortedRanks[i] !== i + 1) {
        setFormError("Thứ hạng phải liên tục từ 1 (ví dụ: 1, 2, 3).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        raceId: race?.raceId || race?.id,
        legId: leg?.legId || leg?.id,
        results: results.map(({ horseId, status, rank, note }) => ({
          horseId,
          status,
          rank: status === "FINISHED" ? rank : null,
          note,
        })),
        refereeNote,
      };

      await refereeSubmissionService.submitLegResult(payload);
      onSuccess?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      title={`Nhập kết quả — ${leg.name || `Leg ${leg.legNumber}`}`}
      subtitle={`Race: ${race?.name || "—"} · Blind Double Entry`}
      accent="primary"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="ref-btn ref-btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="leg-result-form"
            className="ref-btn ref-btn--primary"
            disabled={submitting}
          >
            {submitting ? "Đang gửi…" : "Gửi kết quả"}
          </button>
        </>
      }
    >
      <form id="leg-result-form" onSubmit={handleSubmit}>
        {formError ? (
          <AdminModalAlert type="error">{formError}</AdminModalAlert>
        ) : null}

        <AdminModalSection
          title="Kết quả từng ngựa"
          description="Nhập thứ hạng và trạng thái cho mỗi ngựa. DNF/DQ không cần thứ hạng."
        >
          <div className="ref-leg-form-grid">
            {results.map((r, idx) => (
              <div key={r.horseId} className="ref-leg-form-row">
                <div className="ref-leg-form-row__gate">
                  <span>Cổng</span>
                  <strong>{r.gateNumber}</strong>
                </div>
                <div className="ref-leg-form-row__info">
                  <strong>{r.horseName || "Ngựa"}</strong>
                  <span>{r.jockeyName || "—"}</span>
                </div>
                <AdminModalField label="Trạng thái" required>
                  <select
                    className="ref-input"
                    value={r.status}
                    onChange={(e) => setResultStatus(idx, e.target.value)}
                  >
                    {RESULT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </AdminModalField>
                <AdminModalField label="Thứ hạng" hint={r.status !== "FINISHED" ? "Chỉ FINISHED" : ""}>
                  <input
                    type="number"
                    className="ref-input"
                    min="1"
                    max={results.filter((x) => x.status === "FINISHED").length}
                    value={r.rank}
                    onChange={(e) => setResultRank(idx, e.target.value)}
                    placeholder={r.status === "FINISHED" ? "1" : "—"}
                    disabled={r.status !== "FINISHED"}
                  />
                </AdminModalField>
                <AdminModalField label="Ghi chú" hint={r.status !== "FINISHED" ? "Bắt buộc khi DQ" : "Tùy chọn"}>
                  <input
                    type="text"
                    className="ref-input"
                    value={r.note}
                    onChange={(e) => setResultNote(idx, e.target.value)}
                    placeholder={r.status === "DQ" ? "Lý do DQ…" : "Ghi chú…"}
                  />
                </AdminModalField>
              </div>
            ))}
          </div>
        </AdminModalSection>

        <AdminModalSection
          title="Ghi chú trọng tài"
          description="Ghi chú chung cho leg này (điều kiện sân, sự cố, v.v.)"
        >
          <textarea
            className="ref-input ref-input--textarea"
            value={refereeNote}
            onChange={(e) => setRefereeNote(e.target.value)}
            placeholder="VD: Sân trơn do mưa. 1 ngựa gãy móng ở phút 3."
            rows={3}
          />
        </AdminModalSection>

        <AdminModalSection
          title="Xác nhận"
          description='Phải tick xác nhận. Submission là append-only, không thể sửa sau khi gửi.'
        >
          <label className="ref-confirm-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              Tôi xác nhận kết quả này là chính xác theo nhận định của tôi.
              Sau khi submit sẽ <strong>không thể chỉnh sửa</strong>.
            </span>
          </label>
        </AdminModalSection>
      </form>
    </AdminModal>
  );
}
