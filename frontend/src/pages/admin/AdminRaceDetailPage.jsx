/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AdminRaceDetailPage
 *
 * Trang chi tiết chặng đua cho Admin.
 * Route: /admin/races/:raceId
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Edit, XCircle, Wifi, WifiOff } from "lucide-react";
import { raceDetailService } from "../../services/raceDetailService";
import { raceEntryService } from "../../services/raceEntryService";
import { RaceInfoCard } from "../../components/admin/race/RaceInfoCard";
import { EntryReviewTable } from "../../components/admin/race/EntryReviewTable";
import EntryRejectModal from "../../components/admin/race/EntryRejectModal";
import { RaceStatisticsCard } from "../../components/admin/race/RaceStatisticsCard";
import { RaceActionBar } from "../../components/admin/race/RaceActionBar";
import { useSocket } from "../../hooks/useSocket";
import {
  getSocket,
  onSocketEvent,
  onSocketStatus,
  subscribeRace,
  unsubscribeRace,
} from "../../utils/socket";
import { useToast } from "../../hooks/useToast";
import { getAccessToken } from "../../utils/token";
import "./AdminRaceDetailPage.css";

// Toast Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`ard-toast ard-toast--${type}`}>
      <span>{message}</span>
      <button type="button" className="ard-toast__close" onClick={onClose}>×</button>
    </div>
  );
}

// Confirm Modal
function ConfirmModal({ title, message, confirmText, onConfirm, onClose, variant = "primary" }) {
  return (
    <div className="ard-modal-overlay" onClick={onClose}>
      <div className="ard-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`ard-confirm-modal__bar ard-confirm-modal__bar--${variant}`} />
        <div className="ard-confirm-modal__header">
          <AlertTriangle size={24} className={`ard-confirm-modal__icon ard-confirm-modal__icon--${variant}`} />
          <div>
            <h2 className="ard-confirm-modal__title">{title}</h2>
          </div>
        </div>
        <div className="ard-confirm-modal__body">
          <p className="ard-confirm-modal__message">{message}</p>
        </div>
        <div className="ard-confirm-modal__footer">
          <button type="button" className="ard-btn ard-btn--ghost" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className={`ard-btn ard-btn--${variant}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Cancel Reason Modal
function CancelReasonModal({ raceName, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hủy chặng đua.");
      return;
    }
    onConfirm(reason.trim());
    onClose();
  };

  return (
    <div className="ard-modal-overlay" onClick={onClose}>
      <div className="ard-reason-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ard-reason-modal__bar" />
        <div className="ard-reason-modal__header">
          <AlertTriangle size={24} className="ard-reason-modal__icon" />
          <div>
            <h2 className="ard-reason-modal__title">Hủy chặng đua</h2>
            <p className="ard-reason-modal__subtitle">{raceName}</p>
          </div>
        </div>
        <div className="ard-reason-modal__body">
          {error && <div className="ard-alert ard-alert--error">{error}</div>}
          <p className="ard-reason-modal__label">Lý do hủy chặng đua:</p>
          <textarea
            className="ard-reason-modal__textarea"
            rows={4}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="Nhập lý do hủy chặng đua..."
          />
        </div>
        <div className="ard-reason-modal__footer">
          <button type="button" className="ard-btn ard-btn--ghost" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="ard-btn ard-btn--danger"
            onClick={handleSubmit}
          >
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRaceDetailPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();

  const token = getAccessToken();
  const { connected } = useSocket(token);
  const toastify = useToast();

  const [race, setRace] = useState(null);
  const [entries, setEntries] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modals
  const [confirmModal, setConfirmModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [rejectEntryModal, setRejectEntryModal] = useState(null);
  const [entryBusyId, setEntryBusyId] = useState(null);
  const [entryError, setEntryError] = useState("");

  // Filter entries theo status
  const [entryStatusFilter, setEntryStatusFilter] = useState("ALL");

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [raceData, entriesData, statsData] = await Promise.all([
        raceDetailService.getRaceDetail(raceId),
        raceDetailService.getEntries(raceId),
        raceDetailService.getStatistics(raceId),
      ]);
      setRace(raceData);
      setEntries(entriesData);
      setStatistics(statsData);
    } catch (e) {
      setError(e.message || "Không tải được chi tiết chặng đua");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === Socket realtime ===
  useEffect(() => {
    if (!token) return undefined;

    // entry:created → owner vừa submit entry trực tiếp
    const offCreated = onSocketEvent("entry:created", (payload) => {
      const incoming = payload?.entry;
      if (!incoming) return;
      const incomingRaceId = String(incoming.raceId ?? "");
      if (incomingRaceId && incomingRaceId !== String(raceId)) return;
      raceEntryService
        .getEntriesByRace(raceId)
        .then((list) => {
          if (Array.isArray(list)) setEntries(list);
        })
        .catch(() => {});
      toastify?.info?.(
        `Có entry mới: ${incoming.horseName || `#${incoming.horseId || ""}`} vừa được đăng ký.`,
        "Entry mới"
      );
    });

    // entry:status_changed → admin vừa duyệt/từ chối → cập nhật lại bảng entries
    const offEntryStatus = onSocketEvent("entry:status_changed", (payload) => {
      const incoming = payload?.entry;
      if (!incoming) return;
      const incomingRaceId = String(incoming.raceId ?? "");
      if (incomingRaceId && incomingRaceId !== String(raceId)) return;
      raceEntryService
        .getEntriesByRace(raceId)
        .then((list) => {
          if (Array.isArray(list)) setEntries(list);
        })
        .catch(() => {});
    });

    // odds:updated → BE recalc odds → reload race detail + stats
    const offOdds = onSocketEvent("odds:updated", (payload) => {
      const incomingRaceId = String(payload?.raceId ?? "");
      if (incomingRaceId && incomingRaceId !== String(raceId)) return;
      raceDetailService
        .getStatistics(raceId)
        .then((stats) => {
          if (stats) setStatistics(stats);
        })
        .catch(() => {});
      // Cập nhật lại odds trong bảng entries (EntryReviewTable đang hiển thị odds)
      raceEntryService
        .getEntriesByRace(raceId)
        .then((list) => {
          if (Array.isArray(list)) setEntries(list);
        })
        .catch(() => {});
    });

    // Subscribe room race:${raceId} để server gửi odds:updated về.
    // Mỗi lần socket reconnect, BE sẽ drop room → cần subscribe lại.
    const sock = getSocket(token);
    if (sock && sock.connected) {
      subscribeRace(raceId);
    }
    const offStatus = onSocketStatus(({ socket: s }) => {
      if (s && s.connected) {
        subscribeRace(raceId);
      }
    });

    return () => {
      offCreated();
      offEntryStatus();
      offOdds();
      offStatus();
      try {
        unsubscribeRace(raceId);
      } catch {
        /* noop */
      }
    };
  }, [token, raceId, toastify]);

  const updateRace = (updated) => {
    setRace((prev) => (prev ? { ...prev, ...updated } : updated));
  };

  const handleOpenRegistration = () => {
    setConfirmModal({
      title: "Mở cổng đăng ký",
      message: `Bạn có muốn mở cổng đăng ký cho chặng "${race?.name}"?`,
      confirmText: "Mở cổng",
      variant: "ok",
      onConfirm: async () => {
        setBusy(true);
        try {
          const updated = await raceDetailService.openRegistration(raceId);
          updateRace(updated);
          showToast("Đã mở cổng đăng ký", "success");
        } catch (e) {
          showToast(e.message || "Không thể mở cổng đăng ký", "error");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const handleCloseRegistration = () => {
    setConfirmModal({
      title: "Đóng cổng đăng ký",
      message: `Bạn có muốn đóng cổng đăng ký cho chặng "${race?.name}"?`,
      confirmText: "Đóng cổng",
      variant: "warn",
      onConfirm: async () => {
        setBusy(true);
        try {
          const updated = await raceDetailService.closeRegistration(raceId);
          updateRace(updated);
          showToast("Đã đóng cổng đăng ký", "success");
        } catch (e) {
          showToast(e.message || "Không thể đóng cổng đăng ký", "error");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const handleCancel = () => {
    setCancelModal(true);
  };

  const handleCancelConfirm = async (reason) => {
    setBusy(true);
    try {
      const updated = await raceDetailService.cancelRace(raceId, reason);
      updateRace(updated);
      showToast("Đã hủy chặng đua", "success");
    } catch (e) {
      showToast(e.message || "Không thể hủy chặng đua", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = () => {
    // TODO: Navigate to edit page or open edit modal
    showToast("Chức năng đang phát triển", "info");
  };

  // === Flow 2: entry review ===
  const filteredEntries = (() => {
    if (entryStatusFilter === "ALL") return entries;
    return entries.filter(
      (e) => String(e.status || "").toUpperCase() === entryStatusFilter
    );
  })();

  const replaceEntry = (updated) => {
    if (!updated) return;
    const id = updated.entryId || updated.id;
    setEntries((prev) => prev.map((e) => (e.entryId === id || e.id === id ? updated : e)));
  };

  const handleApproveEntry = async (entry) => {
    const ok = window.confirm(
      `Duyệt đơn đăng ký của ngựa "${entry.horseName}"?`
    );
    if (!ok) return;
    setEntryError("");
    setEntryBusyId(entry.entryId || entry.id);
    try {
      const updated = await raceEntryService.approveEntry(raceId, entry.entryId || entry.id);
      replaceEntry(updated);
      showToast("Đã duyệt entry", "success");
    } catch (e) {
      showToast(e.message || "Không duyệt được entry", "error");
    } finally {
      setEntryBusyId(null);
    }
  };

  const handleAskRejectEntry = (entry) => {
    setEntryError("");
    setRejectEntryModal(entry);
  };

  const handleCloseRejectEntryModal = () => {
    if (entryBusyId) return;
    setRejectEntryModal(null);
    setEntryError("");
  };

  const handleConfirmRejectEntry = async ({ reason }) => {
    if (!rejectEntryModal) return;
    setEntryError("");
    setEntryBusyId(rejectEntryModal.entryId || rejectEntryModal.id);
    try {
      const updated = await raceEntryService.rejectEntry(
        raceId,
        rejectEntryModal.entryId || rejectEntryModal.id,
        reason
      );
      replaceEntry(updated);
      setRejectEntryModal(null);
      showToast("Đã từ chối entry", "success");
    } catch (e) {
      setEntryError(e.message || "Không từ chối được entry");
    } finally {
      setEntryBusyId(null);
    }
  };

  return (
    <div className="ard-page">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <header className="ard-page__header">
        <button
          type="button"
          className="ard-back-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Quay lại
        </button>
        <div className="ard-page__title-wrap">
          <h1 className="ard-page__title">
            Chi tiết chặng đua
            {raceId && <span className="ard-page__title-id">#{raceId}</span>}
          </h1>
          <p className="ard-page__desc">
            Quản lý thông tin, entries và thống kê của chặng đua.
          </p>
        </div>
      </header>

      {/* Error Banner */}
      {error && !loading && (
        <div className="ard-alert ard-alert--error">
          <AlertTriangle size={16} />
          {error}
          <button type="button" className="ard-alert__retry" onClick={loadData}>
            Thử lại
          </button>
        </div>
      )}

      {/* Action Bar */}
      <RaceActionBar
        race={race}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onOpenRegistration={handleOpenRegistration}
        onCloseRegistration={handleCloseRegistration}
        onRefresh={loadData}
        loading={loading}
        busy={busy}
      />

      {/* Content Grid */}
      <div className="ard-content">
        {/* Left Column */}
        <div className="ard-content__main">
          {/* Race Info */}
          <section className="ard-section">
            <h2 className="ard-section__title">Thông tin chặng đua</h2>
            <RaceInfoCard race={race} loading={loading} />
          </section>

          {/* Entries — Flow 2: admin review entries */}
          <section className="ard-section">
            <div className="ard-section__head">
              <h2 className="ard-section__title">
                Đơn đăng ký (Entries)
                {!loading && entries.length > 0 && (
                  <span className="ard-section__count">{entries.length}</span>
                )}
                <span
                  className={`ard-rt ${connected ? "ard-rt--ok" : "ard-rt--off"}`}
                  title={
                    connected
                      ? "Đang nhận cập nhật realtime"
                      : "Mất kết nối realtime"
                  }
                >
                  {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
                  <span>{connected ? "Realtime" : "Offline"}</span>
                </span>
              </h2>
              <select
                className="ard-select"
                value={entryStatusFilter}
                onChange={(e) => setEntryStatusFilter(e.target.value)}
                disabled={loading}
                aria-label="Lọc theo trạng thái entry"
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Bị từ chối</option>
              </select>
            </div>
            <EntryReviewTable
              entries={filteredEntries}
              loading={loading}
              busyEntryId={entryBusyId}
              onApprove={handleApproveEntry}
              onAskReject={handleAskRejectEntry}
            />
          </section>
        </div>

        {/* Right Column */}
        <div className="ard-content__sidebar">
          {/* Statistics */}
          <section className="ard-section">
            <h2 className="ard-section__title">Thống kê</h2>
            <RaceStatisticsCard statistics={statistics} loading={loading} />
          </section>

          {/* Quick Actions Card */}
          <section className="ard-section">
            <h2 className="ard-section__title">Thao tác nhanh</h2>
            <div className="ard-quick-actions">
              <button
                type="button"
                className="ard-quick-btn"
                onClick={handleEdit}
                disabled={busy}
              >
                <Edit size={16} />
                Chỉnh sửa thông tin
              </button>
              {race?.status !== "CANCELLED" && (
                <button
                  type="button"
                  className="ard-quick-btn ard-quick-btn--danger"
                  onClick={handleCancel}
                  disabled={busy}
                >
                  <XCircle size={16} />
                  Hủy chặng đua
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* Cancel Reason Modal */}
      {cancelModal && (
        <CancelReasonModal
          raceName={race?.name}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelModal(false)}
        />
      )}

      {/* Entry Reject Modal — Flow 2 */}
      {rejectEntryModal ? (
        <EntryRejectModal
          entry={rejectEntryModal}
          busy={!!entryBusyId}
          error={entryError}
          onClose={handleCloseRejectEntryModal}
          onConfirm={handleConfirmRejectEntry}
        />
      ) : null}
    </div>
  );
}
