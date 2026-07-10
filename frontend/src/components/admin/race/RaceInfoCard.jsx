/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RaceInfoCard Component
 *
 * Component hiển thị thông tin cơ bản của race.
 */

import { MapPin, Calendar, Flag, Trophy, Clock } from "lucide-react";
import { formatDate } from "../../../utils/formatter";
import { mapStatusToVietnamese } from "../../../utils/formatter";

function statusBadgeClass(status) {
  switch (status) {
    case "SCHEDULED":
      return "ric-badge ric-badge--scheduled";
    case "ONGOING":
      return "ric-badge ric-badge--ongoing";
    case "FINISHED":
      return "ric-badge ric-badge--finished";
    case "CANCELLED":
      return "ric-badge ric-badge--cancelled";
    default:
      return "ric-badge";
  }
}

export function RaceInfoCard({ race, loading }) {
  if (loading) {
    return (
      <div className="ric-card">
        <div className="ric-card__header">
          <div className="ric-skeleton ric-skeleton--title" />
        </div>
        <div className="ric-card__body">
          <div className="ric-skeleton ric-skeleton--text" />
          <div className="ric-skeleton ric-skeleton--text" />
          <div className="ric-skeleton ric-skeleton--text" />
          <div className="ric-skeleton ric-skeleton--text" />
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="ric-card">
        <div className="ric-empty">Không có thông tin chặng đua</div>
      </div>
    );
  }

  return (
    <div className="ric-card">
      <div className="ric-card__header">
        <h2 className="ric-card__title">{race.name}</h2>
        <span className={statusBadgeClass(race.status)}>
          {mapStatusToVietnamese(race.status) || race.status}
        </span>
      </div>

      <div className="ric-card__body">
        <div className="ric-info-row">
          <div className="ric-info-row__icon">
            <MapPin size={16} />
          </div>
          <div className="ric-info-row__content">
            <span className="ric-info-row__label">Địa điểm</span>
            <span className="ric-info-row__value">{race.location || "—"}</span>
          </div>
        </div>

        <div className="ric-info-row">
          <div className="ric-info-row__icon">
            <Calendar size={16} />
          </div>
          <div className="ric-info-row__content">
            <span className="ric-info-row__label">Ngày đua</span>
            <span className="ric-info-row__value">{formatDate(race.date) || formatDate(race.scheduledAt) || "—"}</span>
          </div>
        </div>

        <div className="ric-info-row">
          <div className="ric-info-row__icon">
            <Flag size={16} />
          </div>
          <div className="ric-info-row__content">
            <span className="ric-info-row__label">Khoảng cách</span>
            <span className="ric-info-row__value">
              {race.distance ? `${race.distance.toLocaleString()}m` : "—"}
            </span>
          </div>
        </div>

        <div className="ric-info-row">
          <div className="ric-info-row__icon">
            <Trophy size={16} />
          </div>
          <div className="ric-info-row__content">
            <span className="ric-info-row__label">Giải thưởng</span>
            <span className="ric-info-row__value">
              {race.prize ? `$${race.prize.toLocaleString()}` : "—"}
            </span>
          </div>
        </div>

        {race.registrationDeadline && (
          <div className="ric-info-row">
            <div className="ric-info-row__icon">
              <Clock size={16} />
            </div>
            <div className="ric-info-row__content">
              <span className="ric-info-row__label">Hạn đăng ký</span>
              <span className="ric-info-row__value">{formatDate(race.registrationDeadline)}</span>
            </div>
          </div>
        )}

        {race.description && (
          <div className="ric-info-row ric-info-row--full">
            <span className="ric-info-row__label">Mô tả</span>
            <p className="ric-info-row__description">{race.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RaceInfoCard;
