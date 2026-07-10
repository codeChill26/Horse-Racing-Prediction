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

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { violationService } from "../../services/violationService";
import { showToast } from "../../hooks/showToast";
import {
  getSocket,
  onSocketEvent,
  onSocketStatus,
} from "../../utils/socket";
import { getAccessToken } from "../../utils/token";
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

  // BUG-V-07: pagination client-side để bảng render <100 rows
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

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
      const msg = e.message || "Không tải được danh sách vi phạm";
      setError(msg);
      // BUG-V-09: hiển thị toast kèm thông báo ngắn để user biết phải retry
      showToast.error(`${msg}. Vui lòng thử lại.`, "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  // FLOW 6 — Realtime: ref tới socket events để admin thấy ngay khi referee
  // tạo violation mới hoặc khi violation thay đổi trạng thái.
  // - violation:created  → prepend + toast
  // - violation:resolved → patch in-place + toast (status thành RESOLVED/DISMISSED)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;

    const offCreated = onSocketEvent("violation:created", (payload) => {
      const incoming = payload?.violation ?? payload;
      if (!incoming || incoming.id == null) return;
      setViolations((prev) => {
        const exists = prev.some((v) => v.id === incoming.id);
        if (exists) return prev;
        return [incoming, ...prev];
      });
      showToast.info(
        `Trọng tài vừa ghi nhận vi phạm #${incoming.id}.`,
        "Vi phạm mới"
      );
    });

    const offResolved = onSocketEvent("violation:resolved", (payload) => {
      const incoming = payload?.violation ?? payload;
      if (!incoming || incoming.id == null) return;
      setViolations((prev) =>
        prev.map((v) => (v.id === incoming.id ? { ...v, ...incoming } : v))
      );
      showToast.success(
        `Vi phạm #${incoming.id} đã xử lý.`,
        "Cập nhật"
      );
    });

    // Đảm bảo socket kết nối (idempotent)
    const sock = getSocket(token);
    void sock;
    const offStatus = onSocketStatus(() => {
      /* no-op: admin không cần re-subscribe room, /notifications đã route tới admin */
    });

    return () => {
      offCreated();
      offResolved();
      offStatus();
    };
  }, [loadViolations]);

  // === FALLBACK NOTE ===
  // violationRepository đã opt-in mock fallback (chỉ khi VITE_FALLBACK_TO_MOCK=true).
  // Mặc định BE phải có sẵn; nếu lỗi sẽ surface cho người dùng — không im lặng.
  // Xem violationRepository.js với VITE_FALLBACK_TO_MOCK pattern.

  const filtered = useMemo(() => {
    let list = violations;

    // G5 — normalize status/severity comparison đề phòng BE trả lowercase
    if (statusFilter !== "ALL") {
      list = list.filter((v) => String(v.status).toUpperCase() === statusFilter);
    }

    if (severityFilter !== "ALL") {
      list = list.filter((v) => String(v.severity).toUpperCase() === severityFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          String(v.id ?? "").toLowerCase().includes(q) ||
          String(v.subject ?? "").toLowerCase().includes(q) ||
          String(v.type ?? "").toLowerCase().includes(q) ||
          String(v.raceName ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [violations, statusFilter, severityFilter, search]);

  // BUG-V-07: slice theo page hiện tại (1-based).
  // Reset về trang 1 khi filters thay đổi.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, severityFilter, search]);

  const pagedViolations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize]
  );

  const stats = useMemo(() => {
    return {
      total: violations.length,
      open: violations.filter((v) => String(v.status).toUpperCase() === "OPEN").length,
      severe: violations.filter((v) => {
        const sev = String(v.severity).toUpperCase();
        return sev === "SEVERE" || sev === "CRITICAL";
      }).length,
      // BUG-V-12: chỉ tính penalty từ violation đã RESOLVED để tránh số ảo
      totalPenalty: violations
        .filter((v) => String(v.status).toUpperCase() === "RESOLVED")
        .reduce((sum, v) => sum + (v.penalty || 0), 0),
    };
  }, [violations]);

  const updateViolation = (updated) => {
    setViolations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleView = (violation) => setDetail(violation);

  // BUG-V-08: dùng `modalOpen` chặn double-click vào nút Resolve/Dismiss
  // tránh mở 2 modal chồng nhau.
  const [modalOpen, setModalOpen] = useState(false);

  const handleStartReview = async (violation) => {
    if (modalOpen) return;
    if (String(violation.status).toUpperCase() !== "OPEN") {
      setError("Chỉ có thể bắt đầu xem xét vi phạm ở trạng thái Mở.");
      return;
    }
    setBusyId(violation.id);
    setError("");
    try {
      const updated = await violationService.startReview(
        violation.id,
        violation.status
      );
      updateViolation(updated);
    } catch (e) {
      setError(e.message || "Không thể bắt đầu xem xét");
    } finally {
      setBusyId(null);
    }
  };

  const openActionModal = (violation, actionType) => {
    if (modalOpen) return;
    // Defensive guard: chỉ xử lý/bỏ qua nếu violation đang OPEN/REVIEWING
    const status = String(violation.status).toUpperCase();
    if (status !== "OPEN" && status !== "REVIEWING") {
      setError(`Không thể xử lý vi phạm ở trạng thái ${violation.status}.`);
      return;
    }
    setError("");
    setModalOpen(true);
    setActionModal({ violation, actionType });
  };
  const handleResolve = (violation) => openActionModal(violation, "RESOLVED");
  const handleDismiss = (violation) => openActionModal(violation, "DISMISSED");

  const closeActionModal = () => {
    setActionModal(null);
    setModalOpen(false);
  };

  const handleActionSubmit = async (payload) => {
    if (!actionModal) return;

    const { violation, actionType } = actionModal;
    setBusyId(violation.id);

    try {
      let updated;
      if (actionType === "RESOLVED") {
        // payload = { penalty, note }
        updated = await violationService.resolveViolation(
          violation.id,
          {
            penalty: payload.penalty,
            note: payload.note,
            currentStatus: violation.status,
          }
        );
      } else {
        // payload là string lý do
        updated = await violationService.dismissViolation(
          violation.id,
          payload,
          violation.status
        );
      }
      updateViolation(updated);
      closeActionModal();

      // BUG-V-06: refetch để đảm bảo dữ liệu đồng bộ với BE (tránh stale fields
      // như processedBy, processedAt, scoreAfter…). Không chặn UI đã đóng modal.
      loadViolations().catch(() => {
        /* fallback: in-place update vẫn giữ UI dùng được */
      });
    } catch (e) {
      setError(e.message || "Không thể xử lý vi phạm");
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
        <button
          type="button"
          className="avp-page__refresh"
          onClick={loadViolations}
          disabled={loading}
          aria-label="Làm mới danh sách vi phạm"
        >
          <RefreshCcw
            size={16}
            className={loading ? "avp-page__refresh-icon--spin" : ""}
            aria-hidden="true"
          />
          {loading ? "Đang tải…" : "Làm mới"}
        </button>
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
      {error && !loading && (
        <div className="avp-alert avp-alert--error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="avp-alert__retry"
            onClick={loadViolations}
            disabled={loading}
            aria-label="Thử lại"
          >
            <RefreshCcw size={14} aria-hidden="true" />
            Thử lại
          </button>
        </div>
      )}

      {/* Penalty legend — chỉ hiển thị khi có violations cần xử lý */}
      {stats.open > 0 && (
        <div className="avp-penalty-legend">
          <span className="avp-penalty-legend__label">
            Loại phạt khi xử lý (RESOLVED):
          </span>
          <span className="avp-penalty-chip avp-penalty-chip--warning">
            Cảnh báo
          </span>
          <span className="avp-penalty-chip avp-penalty-chip--deduct">
            Trừ điểm
          </span>
          <span className="avp-penalty-chip avp-penalty-chip--dq">DQ</span>
        </div>
      )}

      {/* Table */}
      <ViolationTable
        violations={pagedViolations}
        loading={loading}
        busyId={busyId}
        onView={handleView}
        onStartReview={handleStartReview}
        onResolve={handleResolve}
        onDismiss={handleDismiss}
      />

      {/* BUG-V-07: Pagination controls */}
      {filtered.length > pageSize && (
        <nav className="avp-pagination" aria-label="Phân trang vi phạm">
          <button
            type="button"
            className="avp-pagination__btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Trang trước"
          >
            ‹ Trước
          </button>
          <span className="avp-pagination__info" aria-live="polite">
            Trang {page} / {totalPages} ({filtered.length} vi phạm)
          </span>
          <button
            type="button"
            className="avp-pagination__btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Trang sau"
          >
            Sau ›
          </button>
        </nav>
      )}

      {/* Detail Modal */}
      {detail && (
        <ViolationDetailModal
          violation={detail}
          onStartReview={(v) => {
            setDetail(null);
            handleStartReview(v);
          }}
          onResolve={(v) => {
            setDetail(null);
            handleResolve(v);
          }}
          onDismiss={(v) => {
            setDetail(null);
            handleDismiss(v);
          }}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Action Modal */}
      {actionModal && (
        <ViolationActionModal
          violation={actionModal.violation}
          actionType={actionModal.actionType}
          busy={busyId === actionModal.violation?.id}
          onSubmit={handleActionSubmit}
          onClose={closeActionModal}
        />
      )}
    </div>
  );
}
