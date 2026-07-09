/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RaceStatisticsCard Component
 *
 * Component hiển thị thống kê của race.
 */

import React from "react";
import { Users, DollarSign, TrendingUp, Star } from "lucide-react";

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

export function RaceStatisticsCard({ statistics, loading }) {
  if (loading) {
    return <StatisticsSkeleton />;
  }

  if (!statistics) {
    return (
      <div className="rsc-card">
        <div className="rsc-empty">Không có thống kê</div>
      </div>
    );
  }

  const entriesPercent = statistics.maxEntries
    ? Math.round((statistics.totalEntries / statistics.maxEntries) * 100)
    : 0;

  return (
    <div className="rsc-card">
      <div className="rsc-card__header">
        <h3 className="rsc-card__title">Thống kê</h3>
      </div>

      <div className="rsc-card__body">
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
      </div>
    </div>
  );
}

export default RaceStatisticsCard;
