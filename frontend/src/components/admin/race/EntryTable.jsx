/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EntryTable Component
 *
 * Component hiển thị danh sách entries của race.
 */

import { Crown, User, Home, Hash } from "lucide-react";

function EntryCard({ entry }) {
  return (
    <div className="et-card">
      <div className="et-card__header">
        <span className="et-card__gate">{entry.gate}</span>
        <div className="et-card__horse">
          <Crown size={14} />
          <span className="et-card__horse-name">{entry.horseName}</span>
        </div>
      </div>
      <div className="et-card__body">
        <div className="et-card__row">
          <User size={12} />
          <span className="et-card__label">Kỵ sĩ:</span>
          <span className="et-card__value">{entry.jockeyName}</span>
        </div>
        <div className="et-card__row">
          <Home size={12} />
          <span className="et-card__label">Chủ:</span>
          <span className="et-card__value">{entry.ownerName}</span>
        </div>
        <div className="et-card__row">
          <Hash size={12} />
          <span className="et-card__label">Odds:</span>
          <span className="et-card__value et-card__value--odds">{entry.odds?.toFixed(1) || "—"}</span>
        </div>
      </div>
    </div>
  );
}

function EntryTableSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="et-table__skeleton-row">
          <td><div className="et-skeleton et-skeleton--sm" /></td>
          <td>
            <div className="et-skeleton et-skeleton--md" />
            <div className="et-skeleton et-skeleton--xs" style={{ marginTop: "0.25rem" }} />
          </td>
          <td><div className="et-skeleton et-skeleton--md" /></td>
          <td><div className="et-skeleton et-skeleton--md" /></td>
          <td><div className="et-skeleton et-skeleton--sm" /></td>
        </tr>
      ))}
    </>
  );
}

export function EntryTable({ entries, loading }) {
  if (loading) {
    return (
      <div className="et-panel">
        <div className="et-table-wrap">
          <table className="et-table">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Ngựa</th>
                <th>Kỵ sĩ</th>
                <th>Chủ ngựa</th>
                <th>Odds</th>
              </tr>
            </thead>
            <tbody>
              <EntryTableSkeleton rows={5} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="et-panel">
        <div className="et-empty">
          <Crown size={40} />
          <p className="et-empty__title">Chưa có entry nào</p>
          <p className="et-empty__desc">Chưa có ngựa nào đăng ký tham gia chặng đua này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="et-panel">
      {/* Desktop Table */}
      <div className="et-table-wrap">
        <table className="et-table">
          <thead>
            <tr>
              <th>Gate</th>
              <th>Ngựa</th>
              <th>Kỵ sĩ</th>
              <th>Chủ ngựa</th>
              <th>Odds</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.entryId || entry.horseId}>
                <td>
                  <span className="et-gate">{entry.gate}</span>
                </td>
                <td>
                  <div className="et-horse">
                    <Crown size={14} className="et-horse__icon" />
                    <div>
                      <div className="et-horse__name">{entry.horseName}</div>
                      <div className="et-horse__meta">#{entry.horseId} • {entry.horseColor}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="et-person">
                    <div className="et-person__name">{entry.jockeyName}</div>
                    <div className="et-person__meta">{entry.jockeyColor}</div>
                  </div>
                </td>
                <td>
                  <div className="et-person">
                    <div className="et-person__name">{entry.ownerName}</div>
                  </div>
                </td>
                <td>
                  <span className="et-odds">{entry.odds?.toFixed(1) || "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="et-cards">
        {entries.map((entry) => (
          <EntryCard key={entry.entryId || entry.horseId} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export default EntryTable;
