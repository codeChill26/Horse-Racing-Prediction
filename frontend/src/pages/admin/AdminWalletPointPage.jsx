/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  Plus,
  Minus,
  History,
  Wallet as WalletIcon
} from "lucide-react";
import { adminWalletService } from "../../services/adminWalletService";
import { roleLabelVi } from "../../utils/roleLabels";
import { formatDate, formatPoints } from "../../utils/formatter";
import {
  AdminModal,
  AdminModalSection,
  AdminModalField,
  AdminModalAlert,
} from "../../components/ui/AdminModal";
import "./AdminWalletPointPage.css";

const TX_TYPE_OPTIONS = [
  { value: "ALL", label: "Tất cả loại GD" },
  { value: "DEPOSIT", label: "Nạp điểm" },
  { value: "BET_PLACED", label: "Đặt cược" },
  { value: "BET_WIN", label: "Thắng cược" },
  { value: "BET_REFUND", label: "Hoàn cược" },
  { value: "ADMIN_ADJUSTMENT", label: "Admin điều chỉnh" },
  { value: "WEEKLY_BONUS", label: "Thưởng tuần" },
  { value: "INITIAL_BONUS", label: "Thưởng khởi tạo" },
];

function txTypeClass(type) {
  switch (type) {
    case "DEPOSIT":
    case "BET_WIN":
    case "WEEKLY_BONUS":
    case "INITIAL_BONUS":
      return "awp-badge awp-badge--plus";
    case "BET_PLACED":
    case "BET_WIN_REVERSAL":
      return "awp-badge awp-badge--minus";
    case "ADMIN_ADJUSTMENT":
      return "awp-badge awp-badge--admin";
    case "BET_REFUND":
      return "awp-badge awp-badge--refund";
    default:
      return "awp-badge";
  }
}

function txTypeLabel(type) {
  return TX_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type ?? "—";
}

export default function AdminWalletPointPage() {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("wallets"); // 'wallets' | 'transactions'
  const [search, setSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [wList, txList] = await Promise.all([
        adminWalletService.getAllWallets().catch(() => []),
        adminWalletService.getTransactions().catch(() => []),
      ]);
      setWallets(Array.isArray(wList) ? wList : []);
      setTransactions(Array.isArray(txList) ? txList : []);
    } catch (e) {
      setError(e.message || "Không tải được dữ liệu ví");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss toast sau 5s
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // === SOCKET / REALTIME NOTE (tiếng Việt) ===
  // Khu vực dành cho realtime: cập nhật số dư ví và giao dịch theo
  // thời gian thực (đặc biệt khi có đặt cược hoặc trả thưởng).
  // Khi backend tích hợp socket.io, có thể:
  //   socket.on('wallet:transaction', (tx) => setTransactions((prev) => [tx, ...prev]));
  //   socket.on('wallet:balanceChanged', ({userId, balance}) => updateBalance(userId, balance));
  useEffect(() => {
    const interval = setInterval(() => {
      adminWalletService
        .getTransactions()
        .then((list) => setTransactions(Array.isArray(list) ? list : []))
        .catch(() => {});
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const filteredWallets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wallets;
    return wallets.filter(
      (w) =>
        String(w.userId).includes(q) ||
        (w.fullName ?? "").toLowerCase().includes(q) ||
        (w.email ?? "").toLowerCase().includes(q)
    );
  }, [wallets, search]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (txTypeFilter !== "ALL") {
      list = list.filter((t) => t.type === txTypeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          String(t.transactionId ?? t.id ?? "").toLowerCase().includes(q) ||
          (t.type ?? "").toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.pointWallet?.user?.fullName ?? "").toLowerCase().includes(q) ||
          (t.pointWallet?.user?.email ?? "").toLowerCase().includes(q) ||
          String(t.pointWallet?.userId ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, txTypeFilter, search]);

  const stats = useMemo(() => {
    const totalPoints = wallets.reduce(
      (sum, w) => sum + (w.wallet?.balance ?? 0),
      0
    );
    const plusTx = transactions
      .filter((t) => (t.amount ?? 0) > 0)
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
    const minusTx = transactions
      .filter((t) => (t.amount ?? 0) < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0);
    return {
      wallets: wallets.length,
      totalPoints,
      plusTx,
      minusTx,
    };
  }, [wallets, transactions]);

  const handleAdjust = async ({ userId, amount, reason }) => {
    try {
      await adminWalletService.adjustPoints({ userId, amount, reason });
      // Reload list để cập nhật số dư
      await loadData();
      setToast({
        type: "success",
        text:
          amount > 0
            ? `Đã cộng ${amount.toLocaleString("vi-VN")} điểm cho người dùng #${userId}.`
            : `Đã trừ ${Math.abs(amount).toLocaleString("vi-VN")} điểm của người dùng #${userId}.`,
      });
      return true;
    } catch (e) {
      setToast({
        type: "error",
        text: e.message || "Điều chỉnh thất bại",
      });
      throw e;
    }
  };

  return (
    <div className="awp-page">
      <header className="awp-page__header">
        <div>
          <h1 className="awp-page__title">Quản lý ví điểm</h1>
          <p className="awp-page__desc">
            Theo dõi số dư, cộng/trừ điểm và lịch sử giao dịch của toàn hệ thống.
          </p>
        </div>
      </header>

      {/* Toast / banner feedback */}
      {toast && (
        <div className={`awp-toast awp-toast--${toast.type}`} role="status">
          <span>{toast.text}</span>
          <button
            type="button"
            className="awp-toast__close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      <div className="awp-stats">
        <div className="awp-stat">
          <div className="awp-stat__label">Tổng số ví</div>
          <div className="awp-stat__value">{stats.wallets}</div>
        </div>
        <div className="awp-stat">
          <div className="awp-stat__label">Tổng điểm hệ thống</div>
          <div className="awp-stat__value awp-stat__value--gold">
            {formatPoints(stats.totalPoints)}
          </div>
        </div>
        <div className="awp-stat">
          <div className="awp-stat__label">Tổng điểm cộng</div>
          <div className="awp-stat__value awp-stat__value--ok">
            +{formatPoints(stats.plusTx)}
          </div>
        </div>
        <div className="awp-stat">
          <div className="awp-stat__label">Tổng điểm trừ</div>
          <div className="awp-stat__value awp-stat__value--err">
            −{formatPoints(stats.minusTx)}
          </div>
        </div>
      </div>

      <div className="awp-tabs">
        <button
          type="button"
          className={`awp-tab ${tab === "wallets" ? "awp-tab--active" : ""}`}
          onClick={() => setTab("wallets")}
        >
          <WalletIcon size={14} />
          Danh sách ví
        </button>
        <button
          type="button"
          className={`awp-tab ${
            tab === "transactions" ? "awp-tab--active" : ""
          }`}
          onClick={() => setTab("transactions")}
        >
          <History size={14} />
          Lịch sử giao dịch
        </button>
      </div>

      <div className="awp-toolbar">
        <div className="awp-search-wrap">
          <Search className="awp-search-icon" size={14} />
          <input
            className="awp-search"
            type="search"
            placeholder={
              tab === "wallets"
                ? "Tìm theo tên, email, ID..."
                : "Tìm theo mã GD, tên/email người dùng, mô tả..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab === "transactions" && (
          <select
            className="awp-select"
            value={txTypeFilter}
            onChange={(e) => setTxTypeFilter(e.target.value)}
          >
            {TX_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="awp-btn awp-btn--ghost"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && !loading && <div className="awp-alert--error">{error}</div>}

      {tab === "wallets" ? (
        <div className="awp-panel">
          {loading ? (
            <div className="awp-loading">
              <div className="awp-spinner" />
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="awp-empty">Không có ví nào phù hợp bộ lọc.</div>
          ) : (
            <div className="awp-table-wrap">
              <table className="awp-table">
                <thead>
                  <tr>
                    <th>Mã ví</th>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Số dư</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWallets.map((w) => (
                    <tr key={w.userId}>
                      <td>
                        <span className="awp-code">#WLT-{w.userId}</span>
                      </td>
                      <td>
                        <div className="awp-name">{w.fullName}</div>
                        <div className="awp-meta">{w.email}</div>
                      </td>
                      <td>
                        <span className="awp-badge">
                          {roleLabelVi(w.role)}
                        </span>
                      </td>
                      <td>
                        <div className="awp-balance">
                          {formatPoints(w.wallet?.balance ?? 0)}{" "}
                          <span className="awp-balance__unit">PTS</span>
                        </div>
                      </td>
                      <td>
                        {w.wallet?.isFrozen ? (
                          <span className="awp-badge awp-badge--frozen">
                            Đã đóng băng
                          </span>
                        ) : w.isActive === false ? (
                          <span className="awp-badge awp-badge--inactive">
                            Ngừng hoạt động
                          </span>
                        ) : (
                          <span className="awp-badge awp-badge--active">
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td>{formatDate(w.wallet?.updatedAt)}</td>
                      <td>
                        <div className="awp-actions">
                          <button
                            type="button"
                            className="awp-icon-btn awp-icon-btn--ok"
                            title="Cộng điểm"
                            onClick={() =>
                              setAdjustModal({ wallet: w, mode: "add" })
                            }
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            className="awp-icon-btn awp-icon-btn--err"
                            title="Trừ điểm"
                            onClick={() =>
                              setAdjustModal({ wallet: w, mode: "sub" })
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            type="button"
                            className="awp-icon-btn"
                            title="Xem chi tiết"
                            onClick={() => setDetail(w)}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="awp-panel">
          {loading ? (
            <div className="awp-loading">
              <div className="awp-spinner" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="awp-empty">
              Chưa có giao dịch nào phù hợp bộ lọc.
            </div>
          ) : (
            <div className="awp-table-wrap">
              <table className="awp-table">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Người dùng</th>
                    <th>Loại</th>
                    <th>Số điểm</th>
                    <th>Mô tả</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t, idx) => (
                    <tr key={t.transactionId ?? t.id ?? idx}>
                      <td>
                        <span className="awp-code">
                          #{t.transactionId ?? t.id ?? idx}
                        </span>
                      </td>
                      <td>
                        <div className="awp-name">
                          {t.pointWallet?.user?.fullName ?? "—"}
                        </div>
                        <div className="awp-meta">
                          {t.pointWallet?.user?.email
                            ? `${t.pointWallet.user.email} • #${t.pointWallet?.userId ?? "—"}`
                            : `#${t.pointWallet?.userId ?? "—"}`}
                        </div>
                      </td>
                      <td>
                        <span className={txTypeClass(t.type)}>
                          {txTypeLabel(t.type)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            (t.amount ?? 0) >= 0
                              ? "awp-amount awp-amount--plus"
                              : "awp-amount awp-amount--minus"
                          }
                        >
                          {(t.amount ?? 0) >= 0 ? "+" : "−"}
                          {formatPoints(Math.abs(t.amount ?? 0))}
                        </span>
                      </td>
                      <td>
                        <div className="awp-desc">
                          {t.description || "—"}
                        </div>
                      </td>
                      <td>{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {detail && (
        <div className="awp-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="awp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="awp-modal__bar" />
            <div className="awp-modal__header">
              <div>
                <h2 className="awp-modal__title">
                  Ví của {detail.fullName}
                </h2>
                <p className="awp-modal__subtitle">Mã ví: #WLT-{detail.userId}</p>
              </div>
              <button
                type="button"
                className="awp-modal__close"
                onClick={() => setDetail(null)}
              >
                ✕
              </button>
            </div>
            <div className="awp-modal__body">
              <DetailRow label="Họ tên" value={detail.fullName} />
              <DetailRow label="Email" value={detail.email} />
              <DetailRow label="Vai trò" value={roleLabelVi(detail.role)} />
              <DetailRow
                label="Số dư hiện tại"
                value={
                  <span className="awp-balance">
                    {formatPoints(detail.wallet?.balance ?? 0)}{" "}
                    <span className="awp-balance__unit">PTS</span>
                  </span>
                }
              />
              <DetailRow
                label="Trạng thái ví"
                value={
                  detail.wallet?.isFrozen
                    ? "Đã đóng băng"
                    : detail.isActive === false
                    ? "Ngừng hoạt động (user)"
                    : "Hoạt động"
                }
              />
              <DetailRow
                label="Cập nhật"
                value={formatDate(detail.wallet?.updatedAt)}
              />
            </div>
            <div className="awp-modal__footer">
              <button
                type="button"
                className="awp-btn awp-btn--ghost"
                onClick={() => setDetail(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="awp-btn awp-btn--ok"
                onClick={() => {
                  setDetail(null);
                  setAdjustModal({ wallet: detail, mode: "add" });
                }}
              >
                <Plus size={14} />
                Cộng điểm
              </button>
              <button
                type="button"
                className="awp-btn awp-btn--danger"
                onClick={() => {
                  setDetail(null);
                  setAdjustModal({ wallet: detail, mode: "sub" });
                }}
              >
                <Minus size={14} />
                Trừ điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustModal && (
        <AdjustModal
          data={adjustModal}
          onCancel={() => setAdjustModal(null)}
          onSubmit={async (payload) => {
            try {
              await handleAdjust(payload);
              setAdjustModal(null);
            } catch {
              // Toast đã hiển thị trong handleAdjust, giữ modal mở.
            }
          }}
        />
      )}
    </div>
  );
}

function AdjustModal({ data, onCancel, onSubmit }) {
  const { wallet, mode } = data;
  const isAdd = mode === "add";
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const value = parseInt(amount, 10);
  const valueOk = Number.isFinite(value) && value > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!valueOk) {
      setError("Số điểm phải là số nguyên dương.");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do điều chỉnh.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        userId: wallet.userId,
        amount: isAdd ? value : -value,
        reason,
      });
    } catch (err) {
      setError(err.message || "Điều chỉnh thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      size="sm"
      accent={isAdd ? "primary" : "danger"}
      title={isAdd ? "Cộng điểm" : "Trừ điểm"}
      subtitle={`${wallet.fullName} (#${wallet.userId}) • ${wallet.email}`}
      onClose={submitting ? undefined : onCancel}
    >
      <form id="awp-adjust-form" onSubmit={handleSubmit}>
        {error && <AdminModalAlert type="error">{error}</AdminModalAlert>}

        <AdminModalSection
          title="Thông tin điều chỉnh"
          description={
            isAdd
              ? "Số dư người dùng sẽ được cộng thêm và ghi nhận vào lịch sử."
              : "Số dư người dùng sẽ bị trừ và ghi nhận vào lịch sử. Không thể trừ quá số dư hiện tại."
          }
        >
          <div className="awp-adjust-current">
            <span className="awp-adjust-current__label">Số dư hiện tại</span>
            <span className="awp-adjust-current__value">
              {formatPoints(wallet.wallet?.balance ?? 0)}{" "}
              <span className="awp-balance__unit">PTS</span>
            </span>
          </div>

          <div className="gs-modal-section gs-modal-section--grid">
            <AdminModalField
              label={isAdd ? "Số điểm cộng" : "Số điểm trừ"}
              required
            >
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ví dụ: 5000"
                disabled={submitting}
              />
            </AdminModalField>

            <AdminModalField label="Loại thao tác">
              <input
                type="text"
                value={isAdd ? "CỘNG ĐIỂM" : "TRỪ ĐIỂM"}
                disabled
              />
            </AdminModalField>
          </div>

          <AdminModalField
            label="Lý do điều chỉnh"
            required
            hint="Bắt buộc - phục vụ kiểm toán."
          >
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do để lưu vết kiểm toán..."
              disabled={submitting}
            />
          </AdminModalField>
        </AdminModalSection>

        <footer className="awp-modal__footer">
          <button
            type="button"
            className="awp-btn awp-btn--ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="awp-adjust-form"
            className={`awp-btn ${isAdd ? "awp-btn--ok" : "awp-btn--danger"}`}
            disabled={submitting || !valueOk || !reason.trim()}
          >
            {submitting
              ? "Đang xử lý..."
              : isAdd
              ? "Xác nhận cộng điểm"
              : "Xác nhận trừ điểm"}
          </button>
        </footer>
      </form>
    </AdminModal>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="awp-detail-row">
      <span className="awp-detail-row__label">{label}</span>
      <span className="awp-detail-row__value">{value || "—"}</span>
    </div>
  );
}
