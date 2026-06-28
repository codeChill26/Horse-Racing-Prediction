/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee — Conflict Page.
 * Theo dõi các leg bị conflict.
 * Referee không được tự resolve conflict.
 *
 * TODO: Backend chưa có API riêng.
 * MOCK DATA: refereeConflictService.getConflicts()
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Lock, Eye, FileText } from "lucide-react";
import {
  AdminModal,
  AdminModalSection,
} from "../../components/ui/AdminModal";
import { Skeleton } from "../../components/ui/Skeleton";
import {
  RefereePageHeader,
  RefereeToolbar,
  RefereeSearchInput,
  RefereeErrorAlert,
  ConflictStatusBadge,
} from "../../components/referee/RefereeCommon";
import { refereeConflictService } from "../../services/refereeService";
import "./RefereeConflictPage.css";

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

export default function RefereeConflictPage() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showDetail, setShowDetail] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refereeConflictService.getConflicts();
      setConflicts(Array.isArray(data) ? data : []);
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
    return conflicts.filter((c) => {
      if (q) {
        const race = (c.raceName || "").toLowerCase();
        const leg = (c.legName || "").toLowerCase();
        if (!race.includes(q) && !leg.includes(q)) return false;
      }
      return true;
    });
  }, [conflicts, search]);

  return (
    <div className="ref-page">
      <div className="ref-page-inner">
        <RefereePageHeader
          eyebrow="Conflict"
          title="Theo dõi Conflict"
          subtitle="Các leg có sai lệch kết quả giữa 2 trọng tài. Không tự ý sửa submission đã gửi."
          onRefresh={load}
          refreshing={loading}
        />

        {error ? <RefereeErrorAlert message={error} onRetry={load} /> : null}

        <RefereeToolbar>
          <RefereeSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm race, leg…"
          />
        </RefereeToolbar>

        {loading ? (
          <div className="ref-conflict-list">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="ref-conflict-skeleton">
                <Skeleton className="ref-skeleton__line" />
                <Skeleton className="ref-skeleton__line ref-skeleton__line--sm" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ref-empty">
            <AlertTriangle size={36} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>Không có conflict nào.</p>
            {conflicts.length === 0 ? (
              <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Tất cả kết quả đều khớp giữa 2 trọng tài.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="ref-conflict-list">
            {filtered.map((conflict) => (
              <ConflictCard
                key={conflict.id || conflict.conflictId}
                conflict={conflict}
                onView={() => { setSelectedConflict(conflict); setShowDetail(true); }}
              />
            ))}
          </div>
        )}
      </div>

      {showDetail && selectedConflict ? (
        <ConflictDetailModal
          conflict={selectedConflict}
          onClose={() => { setShowDetail(false); setSelectedConflict(null); }}
        />
      ) : null}
    </div>
  );
}

function ConflictCard({ conflict, onView }) {
  return (
    <div className="ref-conflict-card">
      <div className="ref-conflict-card__icon" aria-hidden="true">
        <AlertTriangle size={20} />
      </div>
      <div className="ref-conflict-card__body">
        <div className="ref-conflict-card__head">
          <div>
            <strong>{conflict.raceName || "Race"}</strong>
            <span>·</span>
            <span>{conflict.legName || `Leg ${conflict.legNumber}`}</span>
          </div>
          <ConflictStatusBadge status={conflict.status} />
        </div>
        <p className="ref-conflict-card__desc">
          {conflict.description || "Có sai lệch kết quả giữa 2 trọng tài."}
        </p>
        <div className="ref-conflict-card__meta">
          <span>
            <Clock size={11} />
            Phát hiện: {formatTime(conflict.detectedAt)}
          </span>
          <span className="ref-conflict-card__locked">
            <Lock size={11} />
            Submission gốc không thể sửa
          </span>
        </div>
      </div>
      <button
        type="button"
        className="ref-btn ref-btn--ghost ref-btn--sm"
        onClick={onView}
      >
        <Eye size={13} /> Chi tiết
      </button>
    </div>
  );
}

function ConflictDetailModal({ conflict, onClose }) {
  return (
    <AdminModal
      title={`Conflict — ${conflict.legName || `Leg ${conflict.legNumber}`}`}
      subtitle={`Race: ${conflict.raceName || "—"}`}
      accent="danger"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <div className="ref-conflict-modal-notice">
            <Lock size={13} />
            Bạn không thể sửa submission đã gửi. Hệ thống / Chief Referee sẽ xử lý conflict này.
          </div>
          <button type="button" className="ref-btn ref-btn--primary" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      <AdminModalSection title="Thông tin Conflict">
        <dl className="ref-detail-list">
          <div>
            <dt>Race</dt>
            <dd>{conflict.raceName || "—"}</dd>
          </div>
          <div>
            <dt>Leg</dt>
            <dd>{conflict.legName || `Leg ${conflict.legNumber}`}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd><ConflictStatusBadge status={conflict.status} /></dd>
          </div>
          <div>
            <dt>Phát hiện lúc</dt>
            <dd>{formatTime(conflict.detectedAt)}</dd>
          </div>
        </dl>
      </AdminModalSection>

      <AdminModalSection title="Mô tả">
        <p className="ref-conflict-desc">
          {conflict.description || "Có sai lệch kết quả giữa 2 trọng tài. Hệ thống đã tạm dừng race."}
        </p>
      </AdminModalSection>

      <AdminModalSection title="Kết quả của bạn (không thể sửa)">
        {conflict.refereeSubmission ? (
          <div className="ref-sub-results-mini">
            <div className="ref-sub-results-mini__row">
              <span>Cổng</span>
              <span>Ngựa</span>
              <span>Kỵ sĩ</span>
              <span>TT</span>
              <span>Hạng</span>
            </div>
            {(conflict.refereeSubmission.results || []).map((r, idx) => (
              <div key={`${r.horseId}-${idx}`} className="ref-sub-results-mini__row">
                <span className="ref-gate-mini">{r.gateNumber}</span>
                <span>{r.horseName || "Ngựa"}</span>
                <span>—</span>
                <span className={`ref-badge-mini ref-badge-mini--${r.status === "FINISHED" ? "ok" : r.status === "DQ" ? "danger" : "muted"}`}>
                  {r.status || "—"}
                </span>
                <span>{r.rank ? `#${r.rank}` : "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="ref-empty-text">Không có dữ liệu submission.</p>
        )}
      </AdminModalSection>

      {conflict.systemNote ? (
        <AdminModalSection title="Ghi chú hệ thống">
          <p className="ref-system-note">{conflict.systemNote}</p>
        </AdminModalSection>
      ) : null}

      {conflict.adminNote ? (
        <AdminModalSection title="Ghi chú Admin">
          <p className="ref-admin-note">{conflict.adminNote}</p>
        </AdminModalSection>
      ) : null}
    </AdminModal>
  );
}
