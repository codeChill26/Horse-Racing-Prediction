/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JockeyInvitationInbox — Flow 2 (Jockey nhận và phản hồi invitation)
 *
 * Hiển thị danh sách lời mời từ chủ ngựa. Jockey có thể:
 *  - Xem chi tiết lời mời
 *  - Accept (POST /api/invitations/:id/respond { status: 'ACCEPTED' })
 *  - Decline (POST /api/invitations/:id/respond { status: 'DECLINED', declineReason })
 *
 * Endpoint (theo mainflow.md):
 *  - GET  /api/invitations?status=...
 *  - POST /api/invitations/:id/respond
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Inbox,
  Calendar,
  Hash,
  Flag,
  User as UserIcon,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { invitationService } from "../../services/invitationService";
import { useSocket } from "../../hooks/useSocket";
import { onSocketEvent } from "../../utils/socket";
import { useToast } from "../../hooks/useToast";
import { getAccessToken } from "../../utils/token";
import ConfirmModal from "../ui/ConfirmModal";
import "./JockeyInvitationInbox.css";

const STATUS_FILTER_OPTIONS = [
  { value: "PENDING", label: "Đang chờ" },
  { value: "ACCEPTED", label: "Đã chấp nhận" },
  { value: "DECLINED", label: "Đã từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "ALL", label: "Tất cả" },
];

const STATUS_BADGE = {
  PENDING: "jii-badge jii-badge--pending",
  ACCEPTED: "jii-badge jii-badge--ok",
  DECLINED: "jii-badge jii-badge--err",
  CANCELLED: "jii-badge jii-badge--muted",
  EXPIRED: "jii-badge jii-badge--muted",
};

const STATUS_LABEL = {
  PENDING: "Đang chờ",
  ACCEPTED: "Đã chấp nhận",
  DECLINED: "Đã từ chối",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

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

function InvitationCard({ invitation, busy, onAccept, onDecline }) {
  const isPending = invitation.status === "PENDING";
  return (
    <article className="jii-card">
      <div className="jii-card__head">
        <span className={STATUS_BADGE[invitation.status] || "jii-badge"}>
          {STATUS_LABEL[invitation.status] || invitation.status}
        </span>
        <span className="jii-card__id">#{invitation.invitationId || invitation.id}</span>
      </div>

      <div className="jii-card__body">
        <div className="jii-row">
          <Flag size={13} />
          <span className="jii-label">Chặng đua</span>
          <span className="jii-value">
            {invitation.race?.name || invitation.raceName || "—"}
          </span>
        </div>
        <div className="jii-row">
          <Hash size={13} />
          <span className="jii-label">Ngựa</span>
          <span className="jii-value">
            {invitation.horse?.name || invitation.horseName || "—"}
          </span>
        </div>
        <div className="jii-row">
          <UserIcon size={13} />
          <span className="jii-label">Chủ ngựa</span>
          <span className="jii-value">
            {invitation.owner?.fullName || invitation.ownerName || "—"}
          </span>
        </div>
        {invitation.message ? (
          <div className="jii-message">
            <Send size={12} />
            <span>{invitation.message}</span>
          </div>
        ) : null}
        {invitation.declineReason ? (
          <div className="jii-decline">
            <XCircle size={12} />
            <span>Lý do từ chối: {invitation.declineReason}</span>
          </div>
        ) : null}
        <div className="jii-row jii-row--meta">
          <Calendar size={12} />
          <span>Nhận: {formatDateTime(invitation.createdAt)}</span>
        </div>
      </div>

      {isPending ? (
        <div className="jii-card__actions">
          <button
            type="button"
            className="jii-btn jii-btn--ok"
            disabled={busy}
            onClick={() => onAccept(invitation)}
          >
            <CheckCircle2 size={14} /> Chấp nhận
          </button>
          <button
            type="button"
            className="jii-btn jii-btn--err"
            disabled={busy}
            onClick={() => onDecline(invitation)}
          >
            <XCircle size={14} /> Từ chối
          </button>
        </div>
      ) : null}
    </article>
  );
}

function DeclineModal({ invitation, busy, error, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setReason("");
    setLocalError("");
  }, [invitation?.invitationId]);

  if (!invitation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setLocalError("Vui lòng nhập lý do từ chối");
      return;
    }
    if (trimmed.length < 5) {
      setLocalError("Lý do phải có ít nhất 5 ký tự");
      return;
    }
    setLocalError("");
    try {
      await onConfirm({ declineReason: trimmed });
    } catch (_err) {
      // error truyền qua prop
    }
  };

  return (
    <div
      className="jii-modal-backdrop"
      onClick={() => {
        if (!busy) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="jii-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="jii-modal__bar" />
        <header className="jii-modal__header">
          <div className="jii-modal__icon">
            <XCircle size={22} />
          </div>
          <div className="jii-modal__heading">
            <h2 className="jii-modal__title">Từ chối lời mời</h2>
            <p className="jii-modal__subtitle">
              {invitation.race?.name || invitation.raceName || "Chặng đua"}
              {invitation.horse?.name ? ` · ${invitation.horse.name}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="jii-modal__close"
            onClick={() => onClose?.()}
            disabled={busy}
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>
        <div className="jii-modal__body">
          <p className="jii-modal__desc">
            Lý do từ chối sẽ được gửi về cho chủ ngựa để họ có thể chọn kỵ sĩ khác.
          </p>
          <label className="jii-modal__field">
            <span className="jii-modal__label">Lý do *</span>
            <textarea
              className="jii-modal__textarea"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus
              disabled={busy}
              required
              placeholder="VD: Bận lịch thi đấu khác / Chấn thương / Cân nặng không phù hợp…"
            />
            <span className="jii-modal__counter">{reason.length}/500</span>
          </label>
          {localError ? (
            <p className="jii-modal__alert" role="alert">{localError}</p>
          ) : null}
          {error ? (
            <p className="jii-modal__alert" role="alert">{error}</p>
          ) : null}
        </div>
        <footer className="jii-modal__footer">
          <button
            type="button"
            className="jii-btn jii-btn--ghost"
            onClick={() => onClose?.()}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="jii-btn jii-btn--err"
            disabled={busy || !reason.trim()}
          >
            {busy ? "Đang xử lý…" : "Xác nhận từ chối"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function JockeyInvitationInbox() {
  const token = getAccessToken();
  const { connected } = useSocket(token);
  const toast = useToast();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");

  const [busyId, setBusyId] = useState(null);
  const [declineModal, setDeclineModal] = useState(null);
  const [declineError, setDeclineError] = useState("");
  const [acceptConfirmModal, setAcceptConfirmModal] = useState(null);

  // Luôn load TẤT CẢ invitation (status=ALL) để tab-count stats phản ánh đúng.
  // Trước đây filter server-side theo statusFilter nên tab-counts sai lệch:
  // accept/decline xong → invitation rời khỏi list → counts bằng 0 vĩnh viễn.
  const loadInvitations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const list = await invitationService.listInvitations(undefined);
      setInvitations(Array.isArray(list) ? list : []);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message || "Không tải được danh sách lời mời");
      setInvitations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // === Socket real-time: auto-refresh + toast khi owner tạo / confirm ===
  useEffect(() => {
    if (!token) return undefined;

    const refresh = () => {
      // Gọi lại đúng filter hiện tại
      loadInvitations(true);
    };

    const offReceived = onSocketEvent("invitation:received", (payload) => {
      refresh();
      const inv = payload?.invitation;
      const where = inv?.race?.name || inv?.raceName || "một chặng đua";
      toast?.info?.(
        inv?.horse?.name
          ? `Có lời mời mới cưỡi "${inv.horse.name}" tại "${where}".`
          : `Có lời mời mới tại "${where}".`,
        "Lời mời mới"
      );
    });
    const offConfirmed = onSocketEvent("invitation:confirmed", () => {
      refresh();
      toast?.success?.(
        "Chủ ngựa đã chốt lời mời của bạn — entry đã được tạo!",
        "Lời mời được chốt"
      );
    });

    return () => {
      offReceived();
      offConfirmed();
    };
  }, [token, loadInvitations, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invitations;
    return invitations.filter((i) => {
      const haystack = [
        i.race?.name,
        i.raceName,
        i.horse?.name,
        i.horseName,
        i.owner?.fullName,
        i.ownerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [invitations, search]);

  const stats = useMemo(() => {
    return {
      total: invitations.length,
      pending: invitations.filter((i) => i.status === "PENDING").length,
      accepted: invitations.filter((i) => i.status === "ACCEPTED").length,
      declined: invitations.filter((i) => i.status === "DECLINED").length,
    };
  }, [invitations]);

  const replaceInvitation = (updated) => {
    if (!updated) return;
    const id = updated.invitationId || updated.id;
    setInvitations((prev) =>
      prev.map((i) => (i.invitationId === id || i.id === id ? updated : i))
    );
  };

  const handleAccept = async (inv) => {
    setAcceptConfirmModal(inv);
  };

  const handleConfirmAccept = async () => {
    const inv = acceptConfirmModal;
    if (!inv) return;
    setAcceptConfirmModal(null);
    setBusyId(inv.invitationId || inv.id);
    try {
      const updated = await invitationService.acceptInvitation(
        inv.invitationId || inv.id
      );
      replaceInvitation(updated);
    } catch (e) {
      window.alert(e.message || "Không chấp nhận được lời mời");
    } finally {
      setBusyId(null);
    }
  };

  const handleAskDecline = (inv) => {
    setDeclineError("");
    setDeclineModal(inv);
  };

  const handleCloseDecline = () => {
    if (busyId) return;
    setDeclineModal(null);
    setDeclineError("");
  };

  const handleConfirmDecline = async ({ declineReason }) => {
    if (!declineModal) return;
    setDeclineError("");
    setBusyId(declineModal.invitationId || declineModal.id);
    try {
      const updated = await invitationService.declineInvitation(
        declineModal.invitationId || declineModal.id,
        declineReason
      );
      replaceInvitation(updated);
      setDeclineModal(null);
    } catch (e) {
      setDeclineError(e.message || "Không từ chối được lời mời");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="jii-inbox">
      <header className="jii-inbox__head">
        <div>
          <div className="jii-head-row">
            <h3 className="jii-inbox__title">Hộp thư lời mời</h3>
            <span
              className={`jii-conn ${connected ? "jii-conn--ok" : "jii-conn--off"}`}
              title={connected ? "Đã kết nối realtime" : "Mất kết nối realtime"}
            >
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{connected ? "Realtime" : "Offline"}</span>
            </span>
          </div>
          <p className="jii-inbox__desc">
            Xem và phản hồi các lời mời từ chủ ngựa.
            {lastUpdate
              ? ` Cập nhật lần cuối: ${lastUpdate.toLocaleTimeString("vi-VN")}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className="jii-btn jii-btn--ghost"
          onClick={() => loadInvitations(true)}
          disabled={refreshing}
          aria-label="Làm mới"
        >
          <RefreshCw size={14} className={refreshing ? "jii-spin" : ""} />
        </button>
      </header>

      <div className="jii-stats">
        <div className="jii-stat">
          <span className="jii-stat__label">Đang chờ</span>
          <span className="jii-stat__value jii-stat__value--warn">{stats.pending}</span>
        </div>
        <div className="jii-stat">
          <span className="jii-stat__label">Đã chấp nhận</span>
          <span className="jii-stat__value jii-stat__value--ok">{stats.accepted}</span>
        </div>
        <div className="jii-stat">
          <span className="jii-stat__label">Đã từ chối</span>
          <span className="jii-stat__value jii-stat__value--err">{stats.declined}</span>
        </div>
        <div className="jii-stat">
          <span className="jii-stat__label">Tổng</span>
          <span className="jii-stat__value">{stats.total}</span>
        </div>
      </div>

      <div className="jii-toolbar">
        <div className="jii-search-wrap">
          <Search size={14} className="jii-search-icon" />
          <input
            type="search"
            className="jii-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên chặng, ngựa, chủ ngựa…"
          />
        </div>
        <select
          className="jii-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="jii-alert" role="alert">{error}</div> : null}

      {loading ? (
        <div className="jii-loading">
          <div className="jii-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="jii-empty">
          <Inbox size={36} style={{ opacity: 0.4, marginBottom: "0.4rem" }} />
          <p>
            {search
              ? "Không có lời mời nào khớp với bộ lọc."
              : statusFilter === "PENDING"
                ? "Bạn không có lời mời nào đang chờ."
                : "Không có lời mời nào."}
          </p>
        </div>
      ) : (
        <div className="jii-grid">
          {filtered.map((inv) => (
            <InvitationCard
              key={inv.invitationId || inv.id}
              invitation={inv}
              busy={busyId === (inv.invitationId || inv.id)}
              onAccept={handleAccept}
              onDecline={handleAskDecline}
            />
          ))}
        </div>
      )}

      {declineModal ? (
        <DeclineModal
          invitation={declineModal}
          busy={busyId === (declineModal.invitationId || declineModal.id)}
          error={declineError}
          onClose={handleCloseDecline}
          onConfirm={handleConfirmDecline}
        />
      ) : null}

      {acceptConfirmModal && (
        <ConfirmModal
          key={`accept-inv-${acceptConfirmModal.invitationId ?? acceptConfirmModal.id}`}
          open={true}
          title="Chấp nhận lời mời"
          message={`Chấp nhận lời mời cưỡi ngựa "${acceptConfirmModal.horse?.name || acceptConfirmModal.horseName}" tại chặng "${
            acceptConfirmModal.race?.name || acceptConfirmModal.raceName
          }"?`}
          confirmLabel="Chấp nhận"
          confirmTone="primary"
          busy={!!busyId}
          onConfirm={handleConfirmAccept}
          onClose={() => setAcceptConfirmModal(null)}
        />
      )}
    </div>
  );
}