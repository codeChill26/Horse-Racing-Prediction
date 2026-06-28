/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee — Lịch sử submission.
 * Chỉ xem, không sửa. Append-only.
 *
 * TODO: Backend chưa có API riêng.
 * MOCK DATA: refereeSubmissionService.getMySubmissions()
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, ChevronRight, Lock, Eye } from "lucide-react";
import {
  AdminModal,
  AdminModalSection,
} from "../../components/ui/AdminModal";
import { Skeleton } from "../../components/ui/Skeleton";
import {
  RefereePageHeader,
  RefereeToolbar,
  RefereeSearchInput,
  RefereeFilterSelect,
  RefereeErrorAlert,
  SubmissionStatusBadge,
  HorseResultStatusBadge,
} from "../../components/referee/RefereeCommon";
import { refereeSubmissionService } from "../../services/refereeService";
import "./RefereeSubmissionHistoryPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "WaitingOtherReferee", label: "Chờ TT còn lại" },
  { value: "AutoMatched", label: "Khớp tự động" },
  { value: "Conflicted", label: "Xung đột" },
];

function formatTime(iso) {
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

export default function RefereeSubmissionHistoryPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showDetail, setShowDetail] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refereeSubmissionService.getMySubmissions();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter !== "ALL" && s.comparisonStatus !== statusFilter) return false;
      if (q) {
        const race = (s.raceName || "").toLowerCase();
        const leg = (s.legName || "").toLowerCase();
        if (!race.includes(q) && !leg.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, search, statusFilter]);

  const stats = useMemo(() => ({
    total: submissions.length,
    waiting: submissions.filter((s) => s.comparisonStatus === "WaitingOtherReferee").length,
    matched: submissions.filter((s) => s.comparisonStatus === "AutoMatched").length,
    conflicted: submissions.filter((s) => s.comparisonStatus === "Conflicted").length,
  }), [submissions]);

  return (
    <div className="ref-page">
      <div className="ref-page-inner">
        <RefereePageHeader
          eyebrow="Submission"
          title="Lịch sử Submit"
          subtitle="Xem lại kết quả bạn đã gửi. Mọi submission là append-only, không thể sửa."
          onRefresh={load}
          refreshing={loading}
        />

        {error ? <RefereeErrorAlert message={error} onRetry={load} /> : null}

        {/* Stats */}
        <div className="ref-sub-stats">
          <div className="ref-sub-stat">
            <strong>{stats.total}</strong>
            <span>Tổng</span>
          </div>
          <div className="ref-sub-stat ref-sub-stat--warn">
            <strong>{stats.waiting}</strong>
            <span>Chờ TT còn lại</span>
          </div>
          <div className="ref-sub-stat ref-sub-stat--ok">
            <strong>{stats.matched}</strong>
            <span>Khớp tự động</span>
          </div>
          <div className="ref-sub-stat ref-sub-stat--danger">
            <strong>{stats.conflicted}</strong>
            <span>Xung đột</span>
          </div>
        </div>

        <RefereeToolbar>
          <RefereeSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm race, leg…"
          />
          <RefereeFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            label="Trạng thái"
          />
        </RefereeToolbar>

        {loading ? (
          <div className="ref-sub-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ref-sub-skeleton">
                <Skeleton className="ref-skeleton__line" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--sm" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ref-empty">
            <Clock size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>
              {submissions.length === 0
                ? "Bạn chưa có submission nào."
                : "Không có submission khớp với bộ lọc hiện tại."}
            </p>
          </div>
        ) : (
          <ul className="ref-sub-list">
            {filtered.map((sub) => (
              <li key={sub.id || sub.submissionId} className="ref-sub-item">
                <div className="ref-sub-item__icon" aria-hidden="true">
                  <Lock size={16} />
                </div>
                <div className="ref-sub-item__body">
                  <div className="ref-sub-item__head">
                    <div>
                      <strong>{sub.raceName || "Race"}</strong>
                      <span>·</span>
                      <span>{sub.legName || `Leg ${sub.legNumber}`}</span>
                    </div>
                    <SubmissionStatusBadge status={sub.comparisonStatus} />
                  </div>
                  <div className="ref-sub-item__meta">
                    <span>
                      <Clock size={11} />
                      {formatTime(sub.submittedAt)}
                    </span>
                    <span>
                      {sub.results?.length || 0} ngựa
                    </span>
                    <span className="ref-sub-item__append-note">
                      <Lock size={11} />
                      Append-only — không thể sửa
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="ref-btn ref-btn--ghost ref-btn--sm"
                  onClick={() => { setSelectedSubmission(sub); setShowDetail(true); }}
                >
                  <Eye size={13} /> Chi tiết
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showDetail && selectedSubmission ? (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => { setShowDetail(false); setSelectedSubmission(null); }}
        />
      ) : null}
    </div>
  );
}

function SubmissionDetailModal({ submission, onClose }) {
  return (
    <AdminModal
      title={`Chi tiết Submission — ${submission.legName || `Leg ${submission.legNumber}`}`}
      subtitle={`Race: ${submission.raceName || "—"} · Submitted: ${formatTime(submission.submittedAt)}`}
      accent="primary"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <div className="ref-sub-modal-blind-note">
            <Lock size={13} />
            Kết quả trọng tài còn lại không hiển thị (blind).
          </div>
          <button type="button" className="ref-btn ref-btn--primary" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      <AdminModalSection title="Trạ thái so sánh">
        <div className="ref-sub-detail-status">
          <SubmissionStatusBadge status={submission.comparisonStatus} />
          <p>
            Submission của bạn đang được hệ thống so sánh với trọng tài còn lại.
            Kết quả của trọng tài còn lại sẽ được ẩn cho đến khi backend xác nhận.
          </p>
        </div>
      </AdminModalSection>

      <AdminModalSection title="Kết quả bạn đã submit">
        <div className="ref-sub-detail-results">
          {(submission.results || []).map((r, idx) => (
            <div key={`${r.horseId}-${idx}`} className="ref-sub-result-row">
              <span className="ref-sub-result-row__gate">{r.gateNumber}</span>
              <div className="ref-sub-result-row__info">
                <strong>{r.horseName || "Ngựa"}</strong>
                <span>{r.jockeyName || "—"}</span>
              </div>
              <HorseResultStatusBadge status={r.status} />
              {r.status === "FINISHED" && r.rank ? (
                <span className="ref-sub-result-row__rank">#{r.rank}</span>
              ) : (
                <span className="ref-sub-result-row__rank ref-sub-result-row__rank--none">
                  —
                </span>
              )}
              {r.note ? (
                <span className="ref-sub-result-row__note">{r.note}</span>
              ) : null}
            </div>
          ))}
        </div>
      </AdminModalSection>

      {submission.refereeNote ? (
        <AdminModalSection title="Ghi chú trọng tài">
          <p className="ref-sub-note">{submission.refereeNote}</p>
        </AdminModalSection>
      ) : null}
    </AdminModal>
  );
}
