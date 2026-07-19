/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AdminRaceDetailPage
 *
 * Trang chi tiết chặng đua cho Admin.
 * Route: /admin/races/:raceId
 *
 * Refactor (Flow 8 patch):
 *   - Modals tách sang `components/admin/race/AdminRaceDetailModals.jsx`.
 *   - Publish/rollback logic tách sang `hooks/useSettlementActions.js`.
 *   - ConfirmModal nhận `busy` để chống double-click (BUG-8.01).
 *   - Parent guard khi `race` null để tránh crash (BUG-8.02).
 *   - ConfirmModal đóng modal SAU KHI onConfirm resolve → không nuốt lỗi (BUG-8.03).
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, XCircle, Sparkles, SlidersHorizontal } from "lucide-react";
import { raceDetailService } from "../../services/raceDetailService";
import { raceEntryService } from "../../services/raceEntryService";
import { settlementService } from "../../services/settlementService";
import { RaceInfoCard } from "../../components/admin/race/RaceInfoCard";
import { EntryReviewTable } from "../../components/admin/race/EntryReviewTable";
import EntryRejectModal from "../../components/admin/race/EntryRejectModal";
import { RaceStatisticsCard } from "../../components/admin/race/RaceStatisticsCard";
import { RaceActionBar } from "../../components/admin/race/RaceActionBar";
import {
  ConfirmModal,
  CancelReasonModal,
  RollbackReasonModal,
} from "../../components/admin/race/AdminRaceDetailModals";
import AiAdvisoryModal from "../../components/admin/race/AiAdvisoryModal";
import ManualOddsModal from "../../components/admin/race/ManualOddsModal";
import { useSettlementActions } from "../../hooks/useSettlementActions";
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

export default function AdminRaceDetailPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();

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
  const [rollbackModal, setRollbackModal] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [oddsModalOpen, setOddsModalOpen] = useState(false);
  const [entryBusyId, setEntryBusyId] = useState(null);
  const [entryError, setEntryError] = useState("");
  const [approveConfirmModal, setApproveConfirmModal] = useState(null);

  // Filter entries theo status
  const [entryStatusFilter, setEntryStatusFilter] = useState("ALL");

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // === Flow 8: settlement hook (encapsulates publish/rollback + settlement state) ===
  const onRaceUpdated = useCallback((patch) => {
    setRace((prev) => (prev ? { ...prev, ...patch } : patch));
  }, []);

  const {
    publishBusy,
    rollbackBusy,
    settlement,
    setSettlement,
    publishRace,
    unpublishRace,
  } = useSettlementActions({ raceId, onRaceUpdated });

  const closeConfirmModal = useCallback(() => setConfirmModal(null), []);
  const closeRollbackModal = useCallback(() => setRollbackModal(false), []);

  const loadData = useCallback(async () => {
    if (!raceId) {
      setError("Thiếu ID chặng đua trong URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      // allSettled: /statistics chưa có trên BE (404 luôn) — không được để nó
      // kéo sập race/entries (Promise.all fail-fast sẽ hủy cả 2 cái đã tải được).
      const [raceResult, entriesResult, statsResult] = await Promise.allSettled([
        raceDetailService.getRaceDetail(raceId),
        raceDetailService.getEntries(raceId),
        raceDetailService.getStatistics(raceId),
      ]);

      if (raceResult.status === "rejected") throw raceResult.reason;

      const raceData = raceResult.value;
      setRace(raceData);
      setEntries(entriesResult.status === "fulfilled" ? entriesResult.value : []);
      setStatistics(statsResult.status === "fulfilled" ? statsResult.value : null);

      if (String(raceData?.status || "").toUpperCase() === "FINISHED") {
        try {
          const summary = await settlementService.getSettlement(raceId);
          setSettlement(summary);
        } catch (_e) {
          setSettlement(null);
        }
      } else {
        setSettlement(null);
      }
    } catch (e) {
      setError(e.message || "Không tải được chi tiết chặng đua");
    } finally {
      setLoading(false);
    }
  }, [raceId, setSettlement]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === Action handlers (Flow 2/3/8) ===

  const openRegistrationConfirm = () => {
    setConfirmModal({
      title: "Mở cổng đăng ký",
      message: `Bạn có muốn mở cổng đăng ký cho chặng "${race?.name}"?`,
      confirmText: "Mở cổng",
      variant: "ok",
    });
  };

  const closeRegistrationConfirm = () => {
    setConfirmModal({
      title: "Đóng cổng đăng ký",
      message: `Bạn có muốn đóng cổng đăng ký cho chặng "${race?.name}"?`,
      confirmText: "Đóng cổng",
      variant: "warn",
    });
  };

  const handleConfirmModalAction = async () => {
    if (!confirmModal) return;
    setBusy(true);
    try {
      let updated;
      if (confirmModal.variant === "ok") {
        updated = await raceDetailService.openRegistration(raceId);
        showToast("Đã mở cổng đăng ký", "success");
      } else if (confirmModal.variant === "warn") {
        updated = await raceDetailService.closeRegistration(raceId);
        showToast("Đã đóng cổng đăng ký", "success");
      } else {
        return;
      }
      onRaceUpdated(updated);
    } catch (e) {
      const fallback =
        confirmModal.variant === "ok"
          ? "Không thể mở cổng đăng ký"
          : "Không thể đóng cổng đăng ký";
      showToast(e.message || fallback, "error");
    } finally {
      setBusy(false);
      closeConfirmModal();
    }
  };

  const handleCancel = () => {
    setCancelModal(true);
  };

  const handleCancelConfirm = async (reason) => {
    setBusy(true);
    try {
      const updated = await raceDetailService.cancelRace(raceId, reason);
      onRaceUpdated(updated);
      showToast("Đã hủy chặng đua", "success");
      setCancelModal(false);
    } catch (e) {
      showToast(e.message || "Không thể hủy chặng đua", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = () => {
    showToast("Chức năng đang phát triển", "info");
  };

  // === Flow 8: Publish (settle bets) ===
  const askPublish = () => {
    setConfirmModal({
      title: "Publish kết quả chặng đua",
      message: (
        <>
          Publish sẽ <strong>settle tất cả bets</strong> của spectators theo kết quả
          chính thức, cộng tiền thưởng vào ví và chuyển race sang trạng thái{" "}
          <strong>FINISHED</strong>.
          <br />
          <br />
          Race <strong>{race?.name}</strong> sẽ được xuất bản với Top 3 hiện tại.{" "}
          Bạn có chắc đã kiểm tra kỹ thứ hạng?
        </>
      ),
      confirmText: "Publish & Settle",
      variant: "primary",
      flow: "publish",
    });
  };

  const handlePublishFromConfirm = async () => {
    if (!confirmModal || confirmModal.flow !== "publish") return;
    setBusy(true);
    try {
      await publishRace(true);
      closeConfirmModal();
    } catch (_e) {
      // publishRace already shows toast on error
    } finally {
      setBusy(false);
    }
  };

  // === Flow 8: Unpublish / Rollback ===
  const askRollback = () => {
    setRollbackModal(true);
  };

  const handleRollback = async (reason) => {
    const ok = await unpublishRace(reason);
    if (ok) {
      setRollbackModal(false);
    }
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
    setApproveConfirmModal(entry);
  };

  const handleConfirmApproveEntry = async () => {
    const entry = approveConfirmModal;
    if (!entry) return;
    setApproveConfirmModal(null);
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

  // === BUG-8.02: parent-level guard tránh crash khi race null ===
  // RaceActionBar vẫn render skeleton qua prop `loading`,
  // và chỉ truyền onPublish/onUnpublish khi service cho phép.
  const canPublish = settlementService.canPublish(race);
  const canUnpublish = settlementService.canUnpublish(race);
  const raceStatus = String(race?.status || "").toUpperCase();
  const isRaceCancellable = raceStatus !== "CANCELLED" && raceStatus !== "FINISHED";

  return (
    <div className="ard-page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

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

      {error && !loading && (
        <div className="ard-alert ard-alert--error">
          <AlertTriangle size={16} />
          {error}
          <button type="button" className="ard-alert__retry" onClick={loadData}>
            Thử lại
          </button>
        </div>
      )}

      <RaceActionBar
        race={race}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onOpenRegistration={openRegistrationConfirm}
        onCloseRegistration={closeRegistrationConfirm}
        onPublish={canPublish ? askPublish : undefined}
        onUnpublish={canUnpublish ? askRollback : undefined}
        onRefresh={loadData}
        loading={loading}
        busy={busy || publishBusy || rollbackBusy}
      />

      <div className="ard-content">
        <div className="ard-content__main">
          <section className="ard-section">
            <h2 className="ard-section__title">Thông tin chặng đua</h2>
            <RaceInfoCard race={race} loading={loading} />
          </section>

          <section className="ard-section">
            <div className="ard-section__head">
              <h2 className="ard-section__title">
                Đơn đăng ký (Entries)
                {!loading && entries.length > 0 && (
                  <span className="ard-section__count">{entries.length}</span>
                )}
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

        <div className="ard-content__sidebar">
          <section className="ard-section">
            <h2 className="ard-section__title">Thống kê</h2>
            <RaceStatisticsCard
              statistics={statistics}
              settlement={settlement}
              loading={loading}
            />
          </section>

          <section className="ard-section">
            <h2 className="ard-section__title">Thao tác nhanh</h2>
            <div className="ard-quick-actions">
              <button
                type="button"
                className="ard-quick-btn"
                onClick={() => setAiModalOpen(true)}
                disabled={busy || loading}
              >
                <Sparkles size={16} />
                Gợi ý AI
              </button>
              <button
                type="button"
                className="ard-quick-btn"
                onClick={() => setOddsModalOpen(true)}
                disabled={busy || loading}
              >
                <SlidersHorizontal size={16} />
                Chỉnh odds
              </button>
              {isRaceCancellable && (
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

      {/* Confirm Modal (registration open/close + publish) */}
      {confirmModal && (
        <ConfirmModal
          key={confirmModal.title}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          variant={confirmModal.variant}
          onConfirm={
            confirmModal.flow === "publish"
              ? handlePublishFromConfirm
              : handleConfirmModalAction
          }
          onClose={closeConfirmModal}
          busy={busy || publishBusy}
        />
      )}

      {/* Cancel Reason Modal */}
      {cancelModal && (
        <CancelReasonModal
          key={`cancel-${race?.raceId ?? "x"}`}
          raceName={race?.name}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelModal(false)}
          busy={busy}
        />
      )}

      {/* FLOW 8: Rollback Reason Modal */}
      {rollbackModal && (
        <RollbackReasonModal
          key={`rollback-${race?.raceId ?? "x"}`}
          raceName={race?.name}
          onConfirm={handleRollback}
          onClose={closeRollbackModal}
          busy={rollbackBusy}
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

      {/* AI Advisory Modal — gợi ý odds + đánh giá rủi ro */}
      {aiModalOpen && (
        <AiAdvisoryModal race={race} onClose={() => setAiModalOpen(false)} />
      )}

      {/* Manual Odds Modal — chỉnh odds thủ công (độc lập AI) */}
      {oddsModalOpen && (
        <ManualOddsModal
          race={race}
          onClose={() => setOddsModalOpen(false)}
          onSaved={loadData}
        />
      )}

      {/* Confirm Modal: approve entry */}
      {approveConfirmModal ? (
        <ConfirmModal
          key={`approve-${approveConfirmModal.entryId ?? approveConfirmModal.id}`}
          title="Xác nhận duyệt entry"
          message={`Duyệt đơn đăng ký của ngựa "${approveConfirmModal.horseName}"?`}
          confirmText="Duyệt"
          variant="primary"
          onConfirm={handleConfirmApproveEntry}
          onClose={() => setApproveConfirmModal(null)}
          busy={!!entryBusyId}
        />
      ) : null}
    </div>
  );
}
