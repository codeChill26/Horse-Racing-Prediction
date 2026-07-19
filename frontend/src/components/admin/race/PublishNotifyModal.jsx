/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PublishNotifyModal
 *
 * Modal xác nhận "Gửi kết quả cược cho spectators" (Flow 8 + Option B).
 * Hiển thị preview breakdown per-spectator (won/lost/payout dự kiến) trước
 * khi admin commit settlement — giảm rủi ro publish nhầm.
 *
 * Data shape từ `GET /api/admin/settlement/:raceId/preview-publish`:
 *   {
 *     raceId, raceName, tournamentName, raceStatus,
 *     totalPool, houseMargin, netPool, totalPayout, treasureBalanceChange,
 *     spectatorCount, winnerCount, loserCount,
 *     topThree: { rank1: { entryId, horseName }, rank2, rank3 },
 *     spectatorBreakdown: [{
 *       spectatorId, fullName, email,
 *       totalBetAmount, won, payout, betCount, wonBetCount,
 *       currentBalance, balanceAfter
 *     }, ...]
 *   }
 *
 * Luồng:
 *   1. Mount → tự gọi API preview.
 *   2. Loading → skeleton.
 *   3. Error → hiển thị message + retry.
 *   4. OK → render Top 3 + summary cards + danh sách spectator.
 *   5. Admin bấm "Gửi kết quả & Quyết toán" → onConfirm() (parent sẽ gọi
 *      publishRace) → đóng modal.
 */

import { useEffect, useId, useState } from "react";
import { Send, AlertTriangle, Trophy, Wallet, Users, TrendingUp, TrendingDown } from "lucide-react";
import { settlementService } from "../../../services/settlementService";
import { formatPoints, formatDateTime } from "../../../utils/formatter";
import { ModalShell } from "./AdminRaceDetailModals";
import "./PublishNotifyModal.css";

function PreviewSkeleton() {
  return (
    <div className="ard-pnm-skeleton">
      <div className="ard-pnm-skeleton__row" />
      <div className="ard-pnm-skeleton__row" />
      <div className="ard-pnm-skeleton__row" />
      <div className="ard-pnm-skeleton__list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ard-pnm-skeleton__item" />
        ))}
      </div>
    </div>
  );
}

function SpectatorRow({ row }) {
  const isWinner = row.won;
  const stake = Number(row.totalBetAmount || 0);
  const gross = Number(row.payout || 0);                  // GROSS = tổng trả thưởng (stake + lãi)
  const profit = Math.max(0, gross - stake);               // phần lãi (chỉ để hiển thị breakdown)
  return (
    <div className={`ard-pnm-row ard-pnm-row--${isWinner ? "win" : "lose"}`}>
      <div className="ard-pnm-row__name">
        <span className="ard-pnm-row__fullname">{row.fullName}</span>
        <span className="ard-pnm-row__email">{row.email || `User #${row.spectatorId}`}</span>
      </div>
      <div className="ard-pnm-row__bets">
        <span className="ard-pnm-row__betcount">{row.betCount} vé</span>
        <span className="ard-pnm-row__betamount" title="Tổng stake đã đặt (KHÔNG hoàn lại khi thua)">
          {formatPoints(stake)}
        </span>
      </div>
      <div className="ard-pnm-row__payout">
        {isWinner ? (
          <>
            <TrendingUp size={14} />
            <div className="ard-pnm-row__payout-stack">
              <span
                className="ard-pnm-row__payout-value ard-pnm-row__payout-value--win"
                title={`GROSS = cộng vào ví = ${formatPoints(stake)} gốc + ${formatPoints(profit)} lãi`}
              >
                +{formatPoints(gross)}
              </span>
              <span className="ard-pnm-row__payout-profit" title={`Phân tách: ${formatPoints(stake)} gốc + ${formatPoints(profit)} lãi`}>
                {formatPoints(stake)} gốc + {formatPoints(profit)} lãi
              </span>
            </div>
          </>
        ) : (
          <>
            <TrendingDown size={14} />
            <span
              className="ard-pnm-row__payout-value ard-pnm-row__payout-value--lose"
              title="Không nhận thưởng (stake đã mất khi đặt cược)"
            >
              0
            </span>
          </>
        )}
      </div>
      <div className="ard-pnm-row__balance">
        <span className="ard-pnm-row__balance-label" title="Số dư ví SAU KHI cộng gross payout">
          Sau GD
        </span>
        <span className="ard-pnm-row__balance-value">
          {formatPoints(row.balanceAfter)}
        </span>
      </div>
    </div>
  );
}

export function PublishNotifyModal({ raceId, raceName, onConfirm, onClose, busy = false }) {
  const baseId = useId();
  const id = `pnm-${baseId.replace(/:/g, "")}`;
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPreview = async () => {
    if (!raceId) return;
    setLoading(true);
    setError("");
    try {
      const data = await settlementService.previewPublish(raceId);
      setPreview(data);
    } catch (e) {
      setError(e?.message || "Không tải được preview kết quả.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId]);

  return (
    <ModalShell
      className="ard-pnm-modal"
      onClose={onClose}
      busy={busy}
      labelId={`${id}-title`}
      descId={`${id}-desc`}
    >
      <div className="ard-pnm-modal__bar" />
      <div className="ard-pnm-modal__header">
        <Send size={24} className="ard-pnm-modal__icon" />
        <div>
          <h2 id={`${id}-title`} className="ard-pnm-modal__title">
            Gửi kết quả cược cho spectators
          </h2>
          <p className="ard-pnm-modal__subtitle">{raceName || "Chặng đua"}</p>
        </div>
      </div>

      <div id={`${id}-desc`} className="ard-pnm-modal__body">
        {loading && <PreviewSkeleton />}

        {!loading && error && (
          <div className="ard-alert ard-alert--error">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button
              type="button"
              className="ard-alert__retry"
              onClick={loadPreview}
              disabled={busy}
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && preview && (
          <>
            <div className="ard-alert ard-alert--info" role="status">
              <strong>Xác nhận trước khi gửi:</strong> Hệ thống sẽ settle toàn bộ
              vé cược, cộng/trừ điểm vào ví spectators, ghi lịch sử giao dịch và
              gửi thông báo realtime (socket + notification bell).
              <br />
              <span style={{ fontSize: 11, opacity: 0.9 }}>
                💡 Mô hình <strong>GROSS</strong>: stake đã trừ lúc đặt cược, người
                thắng nhận <strong>tổng trả thưởng</strong> (gồm cả gốc + lãi). Đặt {formatPoints(1000)}
                × odd 1,93 → nhận <strong>+1.930</strong> (1.000 gốc + 930 lãi).
              </span>
            </div>

            {/* Top 3 podium preview */}
            <div className="ard-pnm-podium">
              <div className="ard-pnm-podium__slot ard-pnm-podium__slot--gold">
                <Trophy size={14} />
                <span className="ard-pnm-podium__rank">1</span>
                <span className="ard-pnm-podium__horse">
                  {preview.topThree?.rank1?.horseName || `#${preview.topThree?.rank1?.entryId}`}
                </span>
              </div>
              <div className="ard-pnm-podium__slot ard-pnm-podium__slot--silver">
                <span className="ard-pnm-podium__rank">2</span>
                <span className="ard-pnm-podium__horse">
                  {preview.topThree?.rank2?.horseName || `#${preview.topThree?.rank2?.entryId}`}
                </span>
              </div>
              <div className="ard-pnm-podium__slot ard-pnm-podium__slot--bronze">
                <span className="ard-pnm-podium__rank">3</span>
                <span className="ard-pnm-podium__horse">
                  {preview.topThree?.rank3?.horseName || `#${preview.topThree?.rank3?.entryId}`}
                </span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="ard-pnm-stats">
              <div className="ard-pnm-stat">
                <span className="ard-pnm-stat__label" title="Tổng stake spectator đã đặt (đã trừ vào ví lúc đặt)">
                  Tổng quỹ cược
                </span>
                <span className="ard-pnm-stat__value">
                  {formatPoints(preview.totalPool)}
                </span>
              </div>
              <div className="ard-pnm-stat">
                <span className="ard-pnm-stat__label" title="10% phí vận hành sàn — trích từ pool">
                  Phí sàn (10%)
                </span>
                <span className="ard-pnm-stat__value">
                  -{formatPoints(preview.houseMargin)}
                </span>
              </div>
              <div className="ard-pnm-stat ard-pnm-stat--highlight">
                <span className="ard-pnm-stat__label" title="Mô hình GROSS: tổng cộng vào ví các vé thắng (= sum(stake × odds)). Prediction.payout lưu gross.">
                  Tổng gross trả thưởng
                </span>
                <span className="ard-pnm-stat__value">
                  +{formatPoints(preview.totalPayout)}
                </span>
              </div>
              <div className="ard-pnm-stat">
                <span className="ard-pnm-stat__label">
                  <Users size={12} />
                  Spectators
                </span>
                <span className="ard-pnm-stat__value">
                  {preview.spectatorCount} ({preview.winnerCount} thắng ·{" "}
                  {preview.loserCount} thua)
                </span>
              </div>
            </div>

            {/* Per-spectator breakdown */}
            <div className="ard-pnm-section__title">
              <Wallet size={14} />
              Chi tiết từng spectator ({preview.spectatorBreakdown.length})
            </div>

            {preview.spectatorBreakdown.length === 0 ? (
              <div className="ard-pnm-empty">
                Không có ai đặt cược chặng đua này.
              </div>
            ) : (
              <div className="ard-pnm-list">
                {preview.spectatorBreakdown.map((row) => (
                  <SpectatorRow key={row.spectatorId} row={row} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="ard-pnm-modal__footer">
        <button
          type="button"
          className="ard-btn ard-btn--ghost"
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="ard-btn ard-btn--primary"
          onClick={() => onConfirm?.()}
          disabled={busy || loading || !!error || !preview}
        >
          {busy ? "Đang gửi…" : "Gửi kết quả & Quyết toán"}
        </button>
      </div>
    </ModalShell>
  );
}

export default PublishNotifyModal;
