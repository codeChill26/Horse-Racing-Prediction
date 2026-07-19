/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RaceBetsTab — Tab "Cược & ví" của AdminRaceDetailPage.
 *
 * Hiển thị:
 *   - 2 summary cards: tổng bet amount, số spectators đã đặt.
 *   - Bảng danh sách predictions kèm thông tin spectator + entries.
 *   - Accordion mỗi row: lịch sử WalletTransaction của spectator đó.
 *   - Filter theo status, search theo tên/email.
 *   - Polling 30s + manual refresh button.
 *
 * Disable khi race đang mở cổng đăng ký (FE: registrationOpen=true).
 */

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search, Wallet, Users, AlertCircle } from "lucide-react";
import { adminRaceBetsService } from "../../../services/adminRaceBetsService";
import {
  formatDateTime,
  mapBetType,
  mapPredictionStatus,
  mapWalletTxType,
} from "../../../utils/formatter";
import "./RaceBetsTab.css";

const POLL_INTERVAL_MS = 30_000;
const STATUS_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "WON", label: "Thắng" },
  { value: "PARTIAL_WON", label: "Thắng một phần" },
  { value: "LOST", label: "Thua" },
  { value: "REFUNDED", label: "Hoàn tiền" },
];

function fmtNum(n) {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toLocaleString("vi-VN") : "0";
}

function statusBadgeClass(status) {
  switch (status) {
    case "WON":
      return "rbt-badge rbt-badge--won";
    case "PARTIAL_WON":
      return "rbt-badge rbt-badge--partial";
    case "PENDING":
      return "rbt-badge rbt-badge--pending";
    case "LOST":
      return "rbt-badge rbt-badge--lost";
    case "REFUNDED":
      return "rbt-badge rbt-badge--refunded";
    default:
      return "rbt-badge";
  }
}

function txAmountClass(amount) {
  return Number(amount) >= 0 ? "rbt-tx__amount--pos" : "rbt-tx__amount--neg";
}

export default function RaceBetsTab({ raceId, registrationOpen = false }) {
  const [predictions, setPredictions] = useState([]);
  const [race, setRace] = useState(null);
  const [walletSpectators, setWalletSpectators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expandedSpectatorId, setExpandedSpectatorId] = useState(null);
  const pollRef = useRef(null);

  const fetchAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const [predictionsResult, walletResult] = await Promise.all([
          adminRaceBetsService.getRacePredictions(raceId),
          adminRaceBetsService.getRaceWalletActivity(raceId),
        ]);
        setPredictions(predictionsResult.predictions ?? []);
        setRace(predictionsResult.race ?? walletResult.race ?? null);
        setWalletSpectators(walletResult.spectators ?? []);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err?.message || "Không tải được dữ liệu cược & ví");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [raceId]
  );

  useEffect(() => {
    if (!raceId) return undefined;
    fetchAll();
    pollRef.current = setInterval(() => {
      fetchAll({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [raceId, fetchAll]);

  const walletMap = useMemo(() => {
    const m = new Map();
    for (const s of walletSpectators) {
      m.set(s.spectatorId, s);
    }
    return m;
  }, [walletSpectators]);

  const filteredPredictions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return predictions.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${p.spectatorName ?? ""} ${p.spectatorEmail ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [predictions, statusFilter, search]);

  const totalBetAmount = useMemo(
    () => predictions.reduce((sum, p) => sum + Number(p.betAmount || 0), 0),
    [predictions]
  );
  const totalBettors = useMemo(
    () => new Set(predictions.map((p) => p.spectatorId)).size,
    [predictions]
  );

  if (registrationOpen) {
    return (
      <div className="rbt-locked" role="alert">
        <AlertCircle size={20} aria-hidden="true" />
        <div className="rbt-locked__body">
          <h3 className="rbt-locked__title">Tab đang bị khóa</h3>
          <p className="rbt-locked__desc">
            Vui lòng đóng cổng đăng ký trước khi xem danh sách spectators đã đặt cược.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rbt-tab">
      <header className="rbt-header">
        <div>
          <h3 className="rbt-title">Cược & ví của spectators</h3>
          <p className="rbt-subtitle">
            {race ? `Race: ${race.name}` : "Đang tải..."}
            {lastUpdated && (
              <span className="rbt-updated">
                Cập nhật lúc {formatDateTime(lastUpdated.toISOString())}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="rbt-refresh"
          onClick={() => fetchAll()}
          disabled={loading}
          aria-label="Làm mới"
        >
          <RefreshCw size={16} className={loading ? "rbt-refresh__icon--spin" : ""} />
          Làm mới
        </button>
      </header>

      {error && (
        <div className="rbt-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="rbt-summary">
        <div className="rbt-summary__card">
          <div className="rbt-summary__icon">
            <Wallet size={18} aria-hidden="true" />
          </div>
          <div className="rbt-summary__body">
            <span className="rbt-summary__label">Tổng điểm đã đặt</span>
            <span className="rbt-summary__value">{fmtNum(totalBetAmount)}</span>
          </div>
        </div>
        <div className="rbt-summary__card">
          <div className="rbt-summary__icon">
            <Users size={18} aria-hidden="true" />
          </div>
          <div className="rbt-summary__body">
            <span className="rbt-summary__label">Spectators đã đặt</span>
            <span className="rbt-summary__value">{totalBettors}</span>
          </div>
        </div>
      </div>

      <div className="rbt-controls">
        <div className="rbt-search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm spectator"
          />
        </div>
        <select
          className="rbt-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái cược"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading && predictions.length === 0 ? (
        <div className="rbt-skeleton" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rbt-skeleton__row" />
          ))}
        </div>
      ) : filteredPredictions.length === 0 ? (
        <div className="rbt-empty">
          <p>Chưa có đặt cược nào phù hợp.</p>
          {predictions.length === 0 && (
            <p className="rbt-empty__hint">
              Khi spectators đặt cược, danh sách sẽ xuất hiện tại đây.
            </p>
          )}
        </div>
      ) : (
        <div className="rbt-table-wrap">
          <table className="rbt-table">
            <thead>
              <tr>
                <th aria-label="Mở rộng" />
                <th>Spectator</th>
                <th>Loại cược</th>
                <th>Ngựa chọn</th>
                <th>Số điểm</th>
                <th>Odds</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.map((p) => {
                const isExpanded = expandedSpectatorId === p.spectatorId;
                const wallet = walletMap.get(p.spectatorId);
                return (
                  <Fragment key={p.predictionId}>
                    <tr
                      className={isExpanded ? "rbt-row rbt-row--expanded" : "rbt-row"}
                      onClick={() =>
                        setExpandedSpectatorId(isExpanded ? null : p.spectatorId)
                      }
                    >
                      <td className="rbt-row__chevron">
                        {isExpanded ? (
                          <ChevronDown size={16} aria-hidden="true" />
                        ) : (
                          <ChevronRight size={16} aria-hidden="true" />
                        )}
                      </td>
                      <td>
                        <div className="rbt-spectator">
                          <span className="rbt-spectator__name">
                            {p.spectatorName || `User #${p.spectatorId}`}
                          </span>
                          <span className="rbt-spectator__email">
                            {p.spectatorEmail || "—"}
                          </span>
                        </div>
                      </td>
                      <td>{mapBetType(p.betType)}</td>
                      <td>
                        {p.entry1Name}
                        {p.entry2Name ? ` → ${p.entry2Name}` : ""}
                      </td>
                      <td>{fmtNum(p.betAmount)}</td>
                      <td>{Number(p.lockedOdds ?? 0).toFixed(2)}</td>
                      <td>
                        <span className={statusBadgeClass(p.status)}>
                          {mapPredictionStatus(p.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(p.createdAt)}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="rbt-detail-row">
                        <td colSpan={8}>
                          <div className="rbt-detail">
                            <h4 className="rbt-detail__title">
                              Lịch sử ví — {p.spectatorName || `User #${p.spectatorId}`}
                            </h4>
                            {!wallet || wallet.transactions.length === 0 ? (
                              <p className="rbt-empty__hint">
                                Chưa có giao dịch ví nào liên quan tới race này.
                              </p>
                            ) : (
                              <table className="rbt-tx-table">
                                <thead>
                                  <tr>
                                    <th>Loại</th>
                                    <th>Số điểm</th>
                                    <th>Số dư sau</th>
                                    <th>Mô tả</th>
                                    <th>Thời gian</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {wallet.transactions.map((tx) => (
                                    <tr key={tx.transactionId}>
                                      <td>{mapWalletTxType(tx.type)}</td>
                                      <td className={txAmountClass(tx.amount)}>
                                        {Number(tx.amount) >= 0 ? "+" : ""}
                                        {fmtNum(tx.amount)}
                                      </td>
                                      <td>{fmtNum(tx.balanceAfter)}</td>
                                      <td className="rbt-tx__desc">
                                        {tx.description || "—"}
                                      </td>
                                      <td>{formatDateTime(tx.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}