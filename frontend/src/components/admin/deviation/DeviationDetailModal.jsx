/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DeviationDetailModal Component
 *
 * Modal hiển thị chi tiết đầy đủ của một deviation.
 */

import { X, Clock, User, AlertTriangle, FileText, History } from "lucide-react";
import { SeverityBadge } from "../../ui/Badges";
import { DeviationStatusBadge } from "./DeviationStatusBadge";
import { formatDate } from "../../../utils/formatter";

function HistoryItem({ item, index }) {
  const actionLabels = {
    CREATED: "Được tạo",
    REVIEWING: "Đang xem xét",
    RESOLVED: "Đã xử lý",
    REJECTED: "Bị bác bỏ",
  };

  return (
    <div className="dev-history-item">
      <div className="dev-history-item__marker">
        <div className="dev-history-item__dot" />
        {index < 1 && <div className="dev-history-item__line" />}
      </div>
      <div className="dev-history-item__content">
        <div className="dev-history-item__header">
          <span className="dev-history-item__action">
            {actionLabels[item.action] || item.action}
          </span>
          <span className="dev-history-item__time">
            <Clock size={10} />
            {formatDate(item.at)}
          </span>
        </div>
        <div className="dev-history-item__by">
          <User size={10} />
          {item.performedBy}
        </div>
        {item.note && <p className="dev-history-item__note">{item.note}</p>}
      </div>
    </div>
  );
}

export function DeviationDetailModal({ deviation, onClose }) {
  if (!deviation) return null;

  return (
    <div className="dev-modal-overlay" onClick={onClose}>
      <div className="dev-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dev-modal__header">
          <div className="dev-modal__title-wrap">
            <div className="dev-modal__id">{deviation.id}</div>
            <h2 className="dev-modal__title">{deviation.type}</h2>
            <div className="dev-modal__badges">
              <SeverityBadge severity={deviation.severity} />
              <DeviationStatusBadge status={deviation.status} />
            </div>
          </div>
          <button type="button" className="dev-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="dev-modal__body">
          {/* Description Section */}
          <section className="dev-modal__section">
            <div className="dev-modal__section-header">
              <FileText size={14} />
              <h3>Mô tả</h3>
            </div>
            <div className="dev-modal__description">
              {deviation.description}
            </div>
          </section>

          {/* Info Grid */}
          <section className="dev-modal__section">
            <div className="dev-modal__section-header">
              <AlertTriangle size={14} />
              <h3>Thông tin</h3>
            </div>
            <div className="dev-modal__info-grid">
              <div className="dev-modal__info-item">
                <span className="dev-modal__info-label">Chặng</span>
                <span className="dev-modal__info-value">
                  {deviation.raceName}
                  <span className="dev-modal__info-id">#{deviation.raceId}</span>
                </span>
              </div>
              <div className="dev-modal__info-item">
                <span className="dev-modal__info-label">Người báo cáo</span>
                <span className="dev-modal__info-value">{deviation.reporter}</span>
              </div>
              <div className="dev-modal__info-item">
                <span className="dev-modal__info-label">Ngày tạo</span>
                <span className="dev-modal__info-value">{formatDate(deviation.createdAt)}</span>
              </div>
              <div className="dev-modal__info-item">
                <span className="dev-modal__info-label">Mức độ</span>
                <span className="dev-modal__info-value">
                  <SeverityBadge severity={deviation.severity} />
                </span>
              </div>
            </div>
          </section>

          {/* Admin Note */}
          {deviation.adminNote && (
            <section className="dev-modal__section">
              <div className="dev-modal__section-header">
                <FileText size={14} />
                <h3>Ghi chú quản trị</h3>
              </div>
              <div className="dev-modal__admin-note">
                {deviation.adminNote}
              </div>
            </section>
          )}

          {/* History */}
          {deviation.history && deviation.history.length > 0 && (
            <section className="dev-modal__section">
              <div className="dev-modal__section-header">
                <History size={14} />
                <h3>Lịch sử xử lý</h3>
              </div>
              <div className="dev-modal__history">
                {deviation.history.map((item, index) => (
                  <HistoryItem key={index} item={item} index={index} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="dev-modal__footer">
          <button type="button" className="dev-modal__btn dev-modal__btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeviationDetailModal;
