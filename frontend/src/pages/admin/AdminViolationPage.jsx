/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AdminViolationPage
 *
 * Trang quản lý vi phạm (Violation) cho Admin.
 * Cho phép xem danh sách, lọc, xem chi tiết, xử lý và bỏ qua vi phạm.
 *
 * Route: /admin/violations
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { violationService } from "../../services/violationService";
import { ViolationFilter } from "../../components/admin/violation/ViolationFilter";
import { ViolationTable } from "../../components/admin/violation/ViolationTable";
import { ViolationDetailModal } from "../../components/admin/violation/ViolationDetailModal";
import { ViolationActionModal } from "../../components/admin/violation/ViolationActionModal";
import "./AdminViolationPage.css";

export default function AdminViolationPage() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Modals
  const [detail, setDetail] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { violation, actionType }

  const loadViolations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await violationService.getViolations();
      setViolations(data);
    } catch (e) {
      setError(e.message || "Không tải được danh sách vi phạm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  // === SOCKET / REALTIME NOTE ===
  // Khi backend tích hợp socket.io, có thể:
  //   socket.on('violation:created', (v) => setViolations((prev) => [v, ...prev]));
  //   socket.on('violation:statusChanged', (updated) => {
  //     setViolations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  //   });

  const filtered = useMemo(() => {
    let list = violations;

    if (statusFilter !== "ALL") {
      list = list.filter((v) => v.status === statusFilter);
    }

    if (severityFilter !== "ALL") {
      list = list.filter((v) => v.severity === severityFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.id.toLowerCase().includes(q) ||
          v.subject.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q) ||
          (v.raceName ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [violations, statusFilter, severityFilter, search]);

  const stats = useMemo(() => {
    return {
      total: violations.length,
      open: violations.filter((v) => v.status === "OPEN").length,
      severe: violations.filter((v) => v.severity === "SEVERE").length,
      totalPenalty: violations.reduce((sum, v) => sum + (v.penalty || 0), 0),
    };
  }, [violations]);

  const updateViolation = (updated) => {
    setViolations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleView = (violation) => setDetail(violation);

  const handleStartReview = async (violation) => {
    setBusyId(violation.id);
    try {
      const updated = await violationService.startReview(violation.id);
      updateViolation(updated);
    } catch (e) {
      setError(e.message || "Không thể bắt đầu xem xét");
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = (violation) => setActionModal({ violation, actionType: "RESOLVED" });
  const handleDismiss = (violation) => setActionModal({ violation, actionType: "DISMISSED" });

  const handleActionSubmit = async (note) => {
    if (!actionModal) return;

    const { violation, actionType } = actionModal;
    setBusyId(violation.id);

    try {
      let updated;
      if (actionType === "RESOLVED") {
        updated = await violationService.resolveViolation(violation.id, note);
      } else {
        updated = await violationService.dismissViolation(violation.id, note);
      }
      updateViolation(updated);
      setActionModal(null);
    } catch (e) {
      throw e; // Let modal handle error
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="avp-page">
      {/* Header */}
      <header className="avp-page__header">
        <div>
          <h1 className="avp-page__title">Vi phạm kỷ luật</h1>
          <p className="avp-page__desc">
            Theo dõi, điều tra và ra quyết định xử lý các vi phạm trong thi đấu.
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="avp-stats">
        <div className="avp-stat">
          <div className="avp-stat__label">Tổng vi phạm</div>
          <div className="avp-stat__value">{stats.total}</div>
        </div>
        <div className="avp-stat">
          <div className="avp-stat__label">Đang mở</div>
          <div className="avp-stat__value avp-stat__value--warn">{stats.open}</div>
        </div>
        <div className="avp-stat">
          <div className="avp-stat__label">Nghiêm trọng</div>
          <div className="avp-stat__value avp-stat__value--err">{stats.severe}</div>
        </div>
        <div className="avp-stat">
          <div className="avp-stat__label">Tổng phạt</div>
          <div className="avp-stat__value avp-stat__value--gold">
            {stats.totalPenalty.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter */}
      <ViolationFilter
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        onRefresh={loadViolations}
        loading={loading}
      />

      {/* Error Banner */}
      {error && !loading && <div className="avp-alert avp-alert--error">{error}</div>}

      {/* Mock Banner */}
      <div className="avp-mock-banner">
        Dữ liệu đang hiển thị từ mock. Backend chưa cung cấp API cho vi phạm.
      </div>

      {/* Table */}
      <ViolationTable
        violations={filtered}
        loading={loading}
        busyId={busyId}
        onView={handleView}
        onStartReview={handleStartReview}
        onResolve={handleResolve}
        onDismiss={handleDismiss}
      />

      {/* Detail Modal */}
      {detail && (
        <ViolationDetailModal violation={detail} onClose={() => setDetail(null)} />
      )}

      {/* Action Modal */}
      {actionModal && (
        <ViolationActionModal
          violation={actionModal.violation}
          actionType={actionModal.actionType}
          onSubmit={handleActionSubmit}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}
