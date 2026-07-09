/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ViolationDetailModal Component
 *
 * Modal hiển thị chi tiết đầy đủ của một violation.
 */

import React from "react";
import { X, Clock, User, AlertTriangle, FileText, History, Ban } from "lucide-react";
import { SeverityBadge, RoleBadge } from "../../ui/Badges";
import { ViolationStatusBadge } from "./ViolationStatusBadge";
import { formatDate, formatPoints } from "../../../utils/formatter";

function HistoryItem({ item, index }) {
  const actionLabels = {
    CREATED: "Được tạo",
    REVIEWING: "Đang xem xét",
    RESOLVED: "Đã xử lý",
    DISMISSED: "Bị bỏ qua",
  };

  return (
    <div className="vio-history-item">
      <div className="vio-history-item__marker">
        <div className="vio-history-item__dot" />
        {index < 1 && <div className="vio-history-item__line" />}
      </div>
      <div className="vio-history-item__content">
        <div className="vio-history-item__header">
          <span className="vio-history-item__action">
            {actionLabels[item.action] || item.action}
          </span>
          <span className="vio-history-item__time">
            <Clock size={10} />
            {formatDate(item.at)}
          </span>
        </div>
        <div className="vio-history-item__by">
          <User size={10} />
          {item.performedBy}
        </div>
        {item.note && <p className="vio-history-item__note">{item.note}</p>}
      </div>
    </div>
  );
}

export function ViolationDetailModal({ violation, onClose }) {
  if (!violation) return null;

  return (
    <div className="vio-modal-overlay" onClick={onClose}>
      <div className="vio-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vio-modal__header">
          <div className="vio-modal__title-wrap">
            <div className="vio-modal__id">{violation.id}</div>
            <h2 className="vio-modal__title">{violation.type}</h2>
            <div className="vio-modal__badges">
              <SeverityBadge severity={violation.severity} />
              <ViolationStatusBadge status={violation.status} />
            </div>
          </div>
          <button type="button" className="vio-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="vio-modal__body">
          {/* Description Section */}
          <section className="vio-modal__section">
            <div className="vio-modal__section-header">
              <FileText size={14} />
              <h3>Mô tả vi phạm</h3>
            </div>
            <div className="vio-modal__description">{violation.description}</div>
          </section>

          {/* Subject Info */}
          <section className="vio-modal__section">
            <div className="vio-modal__section-header">
              <User size={14} />
              <h3>Đối tượng vi phạm</h3>
            </div>
            <div className="vio-modal__info-grid">
              <div className="vio-modal__info-item">
                <span className="vio-modal__info-label">Tên</span>
                <span className="vio-modal__info-value">{violation.subject}</span>
              </div>
              <div className="vio-modal__info-item">
                <span className="vio-modal__info-label">Vai trò</span>
                <span className="vio-modal__info-value">
                  <RoleBadge role={violation.subjectRole} />
                </span>
              </div>
            </div>
          </section>

          {/* Race & Reporter Info */}
          <section className="vio-modal__section">
            <div className="vio-modal__section-header">
              <AlertTriangle size={14} />
              <h3>Thông tin bổ sung</h3>
            </div>
            <div className="vio-modal__info-grid">
              <div className="vio-modal__info-item">
                <span className="vio-modal__info-label">Chặng</span>
                <span className="vio-modal__info-value">
                  {violation.raceName || "N/A"}
                  {violation.raceId && (
                    <span className="vio-modal__info-id">#{violation.raceId}</span>
                  )}
                </span>
              </div>
              <div className="vio-modal__info-item">
                <span className="vio-modal__info-label">Người ghi nhận</span>
                <span className="vio-modal__info-value">{violation.recordedBy}</span>
              </div>
              <div className="vio-modal__info-item">
                <span className="vio-modal__info-label">Ngày ghi nhận</span>
                <span className="vio-modal__info-value">{formatDate(violation.recordedAt)}</span>
              </div>
              <div className="vio-modal__info-item">
                <span className="vio-modal__info-label">Điểm phạt</span>
                <span className="vio-modal__info-value">
                  {violation.penalty > 0 ? (
                    <span className="vio-modal__penalty">-{formatPoints(violation.penalty)} điểm</span>
                  ) : (
                    "Không phạt"
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* Resolution Note */}
          {violation.resolutionNote && (
            <section className="vio-modal__section">
              <div className="vio-modal__section-header">
                <FileText size={14} />
                <h3>Biên bản xử lý</h3>
              </div>
              <div className="vio-modal__resolution-note">{violation.resolutionNote}</div>
            </section>
          )}

          {/* History */}
          {violation.history && violation.history.length > 0 && (
            <section className="vio-modal__section">
              <div className="vio-modal__section-header">
                <History size={14} />
                <h3>Lịch sử xử lý</h3>
              </div>
              <div className="vio-modal__history">
                {violation.history.map((item, index) => (
                  <HistoryItem key={index} item={item} index={index} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="vio-modal__footer">
          <button type="button" className="vio-modal__btn vio-modal__btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViolationDetailModal;
