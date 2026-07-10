/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AdminDeviationPage
 *
 * Trang quản lý sai lệch (Discrepancy/Deviation) cho Admin.
 * Cho phép xem danh sách, tìm kiếm, lọc, xem chi tiết, resolve và reject.
 *
 * Route: /admin/discrepancies
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { deviationService } from "../../services/deviationService";
import { DeviationFilter } from "../../components/admin/deviation/DeviationFilter";
import { DeviationTable } from "../../components/admin/deviation/DeviationTable";
import { DeviationDetailModal } from "../../components/admin/deviation/DeviationDetailModal";
import { DeviationActionModal } from "../../components/admin/deviation/DeviationActionModal";
import "./AdminDeviationPage.css";

export default function AdminDeviationPage() {
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Modals
  const [detail, setDetail] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { dev, actionType }

  const loadDeviations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await deviationService.getDeviations();
      setDeviations(data);
    } catch (e) {
      setError(e.message || "Không tải được danh sách sai lệch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeviations();
  }, [loadDeviations]);

  // === SOCKET / REALTIME NOTE ===
  // Khi backend tích hợp socket.io, có thể:
  //   socket.on('deviation:created', (dev) => setDeviations((prev) => [dev, ...prev]));
  //   socket.on('deviation:statusChanged', (updated) => {
  //     setDeviations((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  //   });

  const filtered = useMemo(() => {
    let list = deviations;

    if (statusFilter !== "ALL") {
      list = list.filter((d) => d.status === statusFilter);
    }

    if (severityFilter !== "ALL") {
      list = list.filter((d) => d.severity === severityFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          (d.raceName ?? "").toLowerCase().includes(q) ||
          (d.reporter ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [deviations, statusFilter, severityFilter, search]);

  const stats = useMemo(() => {
    return {
      total: deviations.length,
      pending: deviations.filter((d) => d.status === "PENDING").length,
      critical: deviations.filter((d) => d.severity === "CRITICAL").length,
      resolved: deviations.filter((d) => d.status === "RESOLVED").length,
    };
  }, [deviations]);

  const updateDeviation = (updated) => {
    setDeviations((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleView = (dev) => setDetail(dev);

  const handleStartReview = async (dev) => {
    setBusyId(dev.id);
    setError("");
    try {
      const updated = await deviationService.startReview(
        dev.id,
        dev.status
      );
      updateDeviation(updated);
    } catch (e) {
      setError(e.message || "Không thể bắt đầu xem xét");
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = (dev) => setActionModal({ dev, actionType: "RESOLVED" });

  const handleReject = (dev) => setActionModal({ dev, actionType: "REJECTED" });

  const handleActionSubmit = async (payload) => {
    if (!actionModal) return;

    const { dev, actionType } = actionModal;
    setBusyId(dev.id);

    try {
      let updated;
      if (actionType === "RESOLVED") {
        updated = await deviationService.resolveDeviation(dev.id, {
          source: payload.source,
          finalResults: payload.finalResults,
          reason: payload.reason,
          currentStatus: dev.status,
        });
      } else {
        updated = await deviationService.rejectDeviation(
          dev.id,
          payload,
          dev.status
        );
      }
      updateDeviation(updated);
      setActionModal(null);
    } catch (e) {
      setError(e.message || "Không thể xử lý sai lệch");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="adp-page">
      {/* Header */}
      <header className="adp-page__header">
        <div>
          <h1 className="adp-page__title">Xử lý sai lệch</h1>
          <p className="adp-page__desc">
            Theo dõi và phân xử các sai lệch phát sinh trong quá trình tổ chức giải.
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="adp-stats">
        <div className="adp-stat">
          <div className="adp-stat__label">Tổng sai lệch</div>
          <div className="adp-stat__value">{stats.total}</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat__label">Chờ xử lý</div>
          <div className="adp-stat__value adp-stat__value--warn">{stats.pending}</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat__label">Nghiêm trọng</div>
          <div className="adp-stat__value adp-stat__value--err">{stats.critical}</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat__label">Đã xử lý</div>
          <div className="adp-stat__value adp-stat__value--ok">{stats.resolved}</div>
        </div>
      </div>

      {/* Filter */}
      <DeviationFilter
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        onRefresh={loadDeviations}
        loading={loading}
      />

      {/* Error Banner */}
      {error && !loading && (
        <div className="adp-alert adp-alert--error" role="alert">
          {error}
        </div>
      )}

      {/* State hint: AdminDiscrepancyPage dùng graceful fallback khi BE chưa có.
          Xem deviationRepository.js với fallback logic. */}

      {/* Table */}
      <DeviationTable
        deviations={filtered}
        loading={loading}
        busyId={busyId}
        onView={handleView}
        onStartReview={handleStartReview}
        onResolve={handleResolve}
        onReject={handleReject}
      />

      {/* Detail Modal */}
      {detail && (
        <DeviationDetailModal
          deviation={detail}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Action Modal */}
      {actionModal && (
        <DeviationActionModal
          deviation={actionModal.dev}
          actionType={actionModal.actionType}
          onSubmit={handleActionSubmit}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}
