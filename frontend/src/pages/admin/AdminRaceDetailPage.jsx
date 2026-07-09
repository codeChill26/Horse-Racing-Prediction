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

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Edit, XCircle } from "lucide-react";
import { raceDetailService } from "../../services/raceDetailService";
import { RaceInfoCard } from "../../components/admin/race/RaceInfoCard";
import { EntryTable } from "../../components/admin/race/EntryTable";
import { RaceStatisticsCard } from "../../components/admin/race/RaceStatisticsCard";
import { RaceActionBar } from "../../components/admin/race/RaceActionBar";
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

  const [race, setRace] = useState(null);
  const [entries, setEntries] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modals
  const [confirmModal, setConfirmModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);

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

          {/* Entries */}
          <section className="ard-section">
            <h2 className="ard-section__title">
              Danh sách Entries
              {!loading && entries.length > 0 && (
                <span className="ard-section__count">{entries.length}</span>
              )}
            </h2>
            <EntryTable entries={entries} loading={loading} />
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
    </div>
  );
}
