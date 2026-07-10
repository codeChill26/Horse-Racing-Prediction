/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RaceStatisticsCard Component
 *
 * Component hiển thị thống kê của race.
 *
 * G6 (FLOW 8): Thêm section "Settlement" khi race đã FINISHED hoặc BE trả về
 * settlement summary. Hiển thị:
 *   - Tổng Pool (cược)
 *   - House margin (10%)
 *   - Net pool
 *   - Tổng payout thực tế (đã trả cho spectators thắng)
 *   - Treasure pool change (dương = thặng dư, âm = bù lỗ)
 *   - Đếm predictions theo status
 *
 * BUG-8.07: khi `statistics=null` (BE 404 / timeout) nhưng `settlement` có dữ liệu,
 * vẫn render settlement section thay vì early return "Không có thống kê".
 */

import { Users, DollarSign, TrendingUp, Star, Wallet, ScrollText } from "lucide-react";

function StatCard({ icon: Icon, label, value, subValue, variant }) {
  return (
    <div className={`rsc-stat ${variant ? `rsc-stat--${variant}` : ""}`}>
      <div className="rsc-stat__icon">
        <Icon size={18} />
      </div>
      <div className="rsc-stat__content">
        <span className="rsc-stat__label">{label}</span>
        <span className="rsc-stat__value">{value}</span>
        {subValue && <span className="rsc-stat__sub">{subValue}</span>}
      </div>
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="rsc-card">
      <div className="rsc-card__header">
        <div className="rsc-skeleton rsc-skeleton--title" />
      </div>
      <div className="rsc-card__body">
        <div className="rsc-stats-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rsc-stat">
              <div className="rsc-skeleton rsc-skeleton--icon" />
              <div className="rsc-stat__content">
                <div className="rsc-skeleton rsc-skeleton--label" />
                <div className="rsc-skeleton rsc-skeleton--value" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Format 12345.6 → "12,346" */
function fmtNum(n) {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toLocaleString("vi-VN") : "0";
}

/**
 * SettlementPanel — Sub-component riêng cho settlement summary.
 * Tách ra để có thể render độc lập khi statistics=null (BUG-8.07).
 */
function SettlementPanel({ settlement }) {
  if (!settlement) return null;
  return (
      <div className="rsc-settlement" role="region" aria-label="Settlement summary">
      <div className="rsc-settlement__title">
        <ScrollText size={14} aria-hidden="true" />
        <span>Settlement</span>
        <span className="rsc-settlement__badge">FINISHED</span>
      </div>

      <div className="rsc-settlement__grid">
        <div className="rsc-settlement__cell">
          <span className="rsc-settlement__label">Tổng Pool</span>
          <span className="rsc-settlement__value">
            {fmtNum(settlement.totalPool)}
          </span>
          <span className="rsc-settlement__sub">điểm cược</span>
        </div>
        <div className="rsc-settlement__cell">
          <span className="rsc-settlement__label">House Margin (10%)</span>
          <span className="rsc-settlement__value rsc-settlement__value--ok">
            +{fmtNum(settlement.houseMargin)}
          </span>
          <span className="rsc-settlement__sub">phí vận hành</span>
        </div>
        <div className="rsc-settlement__cell">
          <span className="rsc-settlement__label">Net Pool</span>
          <span className="rsc-settlement__value">
            {fmtNum(settlement.netPool ?? ((settlement.totalPool ?? 0) - (settlement.houseMargin ?? 0)))}
          </span>
          <span className="rsc-settlement__sub">để trả thưởng</span>
        </div>
        <div className="rsc-settlement__cell">
          <span className="rsc-settlement__label">Tổng Payout</span>
          <span className="rsc-settlement__value">
            {fmtNum(settlement.actualTotalPayout)}
          </span>
          <span className="rsc-settlement__sub">đã trả spectators</span>
        </div>
        <div className="rsc-settlement__cell">
          <span className="rsc-settlement__label">
            <Wallet size={11} aria-hidden="true" /> Quỹ Treasure
          </span>
          <span
            className={`rsc-settlement__value ${
              Number(settlement.treasureBalanceChange ?? 0) >= 0
                ? "rsc-settlement__value--ok"
                : "rsc-settlement__value--err"
            }`}
          >
            {Number(settlement.treasureBalanceChange ?? 0) >= 0 ? "+" : ""}
            {fmtNum(settlement.treasureBalanceChange)}
          </span>
          <span className="rsc-settlement__sub">
            {Number(settlement.treasureBalanceChange ?? 0) >= 0
              ? "thặng dư → cộng vào"
              : "bù lỗ → rút từ"}
          </span>
        </div>
        <div className="rsc-settlement__cell">
          <span className="rsc-settlement__label">Settled</span>
          <span className="rsc-settlement__value">
            {fmtNum(settlement.settledCount)}
          </span>
          <span className="rsc-settlement__sub">
            W:{fmtNum(settlement.wonCount)} · L:{fmtNum(settlement.lostCount)}
          </span>
        </div>
      </div>

      {settlement.publishedAt && (
        <div className="rsc-settlement__meta">
          Đã publish lúc{" "}
          <time dateTime={settlement.publishedAt}>
            {new Date(settlement.publishedAt).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      )}
    </div>
  );
}

export function RaceStatisticsCard({ statistics, settlement, loading }) {
  if (loading) {
    return <StatisticsSkeleton />;
  }

  // BUG-8.07: render riêng settlement section khi statistics=null
  // để không che mất dữ liệu quan trọng (audit, payout, won/lost count).
  if (!statistics && !settlement) {
    return (
      <div className="rsc-card">
        <div className="rsc-empty">Không có thống kê</div>
      </div>
    );
  }

  return (
    <div className="rsc-card">
      {statistics ? (
        <>
          <div className="rsc-card__header">
            <h3 className="rsc-card__title">Thống kê</h3>
          </div>

          <div className="rsc-card__body">
            {(() => {
              const entriesPercent = statistics.maxEntries
                ? Math.round((statistics.totalEntries / statistics.maxEntries) * 100)
                : 0;

              return (
                <>
                  <div className="rsc-stats-grid">
                    <StatCard
                      icon={Users}
                      label="Tổng Entries"
                      value={statistics.totalEntries}
                      subValue={`/ ${statistics.maxEntries} slots (${entriesPercent}%)`}
                      variant={entriesPercent >= 100 ? "warn" : "ok"}
                    />

                    <StatCard
                      icon={DollarSign}
                      label="Volume Cược"
                      value={`$${(statistics.bettingVolume / 1000000).toFixed(2)}M`}
                      subValue={`${statistics.totalBets?.toLocaleString() || 0} cược`}
                      variant="primary"
                    />

                    <StatCard
                      icon={TrendingUp}
                      label="Hoàn thành"
                      value={`${statistics.completionRate || 0}%`}
                      variant="info"
                    />

                    <StatCard
                      icon={Star}
                      label="Độ nổi tiếng"
                      value={statistics.favoriteHorse || "—"}
                      subValue="Ngựa được yêu thích nhất"
                      variant="warn"
                    />
                  </div>

                  {/* Progress Bar */}
                  <div className="rsc-progress">
                    <div className="rsc-progress__header">
                      <span className="rsc-progress__label">Slots đã điền</span>
                      <span className="rsc-progress__value">
                        {statistics.totalEntries}/{statistics.maxEntries}
                      </span>
                    </div>
                    <div className="rsc-progress__bar">
                      <div
                        className={`rsc-progress__fill ${entriesPercent >= 100 ? "rsc-progress__fill--full" : ""}`}
                        style={{ width: `${entriesPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="rsc-additional">
                    <div className="rsc-additional__item">
                      <span className="rsc-additional__label">Entries đã xác nhận</span>
                      <span className="rsc-additional__value">{statistics.confirmedEntries || 0}</span>
                    </div>
                    <div className="rsc-additional__item">
                      <span className="rsc-additional__label">Entries đang chờ</span>
                      <span className="rsc-additional__value">{statistics.pendingEntries || 0}</span>
                    </div>
                    <div className="rsc-additional__item">
                      <span className="rsc-additional__label">Odds trung bình</span>
                      <span className="rsc-additional__value">
                        {statistics.averageOdds?.toFixed(2) || "—"}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* ============= FLOW 8: Settlement section ============= */}
            <SettlementPanel settlement={settlement} />
          </div>
        </>
      ) : (
        // statistics=null nhưng có settlement → chỉ render settlement
        <div className="rsc-card__body">
          <SettlementPanel settlement={settlement} />
        </div>
      )}
    </div>
  );
}

export default RaceStatisticsCard;
