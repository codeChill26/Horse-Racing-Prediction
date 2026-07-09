/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ReportViolationModal — FLOW 5 Step 1.
 *
 * Modal để referee ghi nhận vi phạm cho 1 entry (horse/jockey) trong race.
 *
 * Endpoint:
 *  POST /api/referee/violations  { raceId, entryId, type, severity, description }
 *
 * Trả về violation đã tạo (status mặc định là OPEN).
 */

import { useEffect, useRef, useState } from "react";
import { X, AlertTriangle, Flag, ChevronDown } from "lucide-react";
import { violationService, VIOLATION_SEVERITY } from "../../services/violationService";
import "./ReportViolationModal.css";

const VIOLATION_TYPES = [
  { value: "WHIP_EXCESS", label: "Sử dụng roi quá số lần quy định" },
  { value: "INTERFERENCE", label: "Chạm rào gây ảnh hưởng ngựa khác" },
  { value: "FALSE_START", label: "Xuất phát sai quy trình" },
  { value: "DRUG_TEST", label: "Vi phạm quy định dược phẩm" },
  { value: "LATE_REGISTER", label: "Đăng ký trễ" },
  { value: "OTHER", label: "Khác (nhập mô tả chi tiết)" },
];

const SEVERITY_OPTIONS = VIOLATION_SEVERITY.filter((s) => s !== "ALL");

export default function ReportViolationModal({
  raceId,
  entry, // { entryId, horseName, jockeyName, gateNumber }
  busy = false,
  error = "",
  onClose,
  onSubmitted,
}) {
  const cancelRef = useRef(null);
  const [type, setType] = useState(VIOLATION_TYPES[0].value);
  const [customType, setCustomType] = useState("");
  const [severity, setSeverity] = useState("MINOR");
  const [description, setDescription] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cancelRef.current) cancelRef.current.focus();
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && !submitting && !busy) onClose?.();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [submitting, busy, onClose]);

  if (!entry) return null;

  const finalType = type === "OTHER" ? customType.trim() : type;
  const canSubmit =
    !submitting &&
    !busy &&
    !!finalType &&
    finalType.length <= 200 &&
    description.trim().length > 0 &&
    description.trim().length <= 2000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!finalType) {
      setLocalError("Vui lòng chọn hoặc nhập loại vi phạm.");
      return;
    }
    if (!description.trim()) {
      setLocalError("Mô tả vi phạm là bắt buộc.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await violationService.reportViolation({
        raceId,
        entryId: entry.entryId,
        type: finalType,
        severity,
        description: description.trim(),
      });
      onSubmitted?.(created);
      onClose?.();
    } catch (err) {
      setLocalError(err?.message || "Không thể ghi nhận vi phạm.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="rvm-backdrop"
      onClick={() => {
        if (!submitting && !busy) onClose?.();
      }}
      role="presentation"
    >
      <form
        className="rvm-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rvm-title"
        aria-describedby="rvm-desc"
      >
        <div className="rvm-modal__bar" />
        <header className="rvm-modal__header">
          <div className="rvm-modal__icon rvm-modal__icon--warn">
            <Flag size={22} aria-hidden="true" />
          </div>
          <div className="rvm-modal__heading">
            <h2 id="rvm-title" className="rvm-modal__title">
              Ghi nhận vi phạm
            </h2>
            <p id="rvm-desc" className="rvm-modal__subtitle">
              FLOW 5 · Step 1 — Race #{raceId}
            </p>
          </div>
          <button
            ref={cancelRef}
            type="button"
            className="rvm-modal__close"
            onClick={() => onClose?.()}
            disabled={submitting || busy}
            aria-label="Đóng"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="rvm-modal__body">
          {/* Subject summary */}
          <section className="rvm-subject">
            <div className="rvm-subject__label">Đối tượng</div>
            <div className="rvm-subject__content">
              <strong>Cổng {entry.gateNumber ?? "?"}</strong>
              {" — "}
              <span>{entry.horseName ?? "—"}</span>
              {entry.jockeyName ? (
                <span className="rvm-subject__jockey"> · {entry.jockeyName}</span>
              ) : null}
            </div>
          </section>

          {/* Type */}
          <div className="rvm-field">
            <label className="rvm-field__label" htmlFor="rvm-type">
              Loại vi phạm <span className="rvm-field__required" aria-hidden="true">*</span>
            </label>
            <div className="rvm-input-wrap">
              <select
                id="rvm-type"
                className="rvm-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={submitting || busy}
              >
                {VIOLATION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="rvm-input-icon" aria-hidden="true" />
            </div>
            {type === "OTHER" && (
              <input
                type="text"
                className="rvm-input rvm-input--custom"
                placeholder="Nhập loại vi phạm (tối đa 200 ký tự)"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                maxLength={200}
                disabled={submitting || busy}
              />
            )}
          </div>

          {/* Severity */}
          <div className="rvm-field">
            <label className="rvm-field__label" htmlFor="rvm-severity">
              Mức độ <span className="rvm-field__required" aria-hidden="true">*</span>
            </label>
            <div className="rvm-input-wrap">
              <select
                id="rvm-severity"
                className="rvm-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                disabled={submitting || busy}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="rvm-input-icon" aria-hidden="true" />
            </div>
          </div>

          {/* Description */}
          <div className="rvm-field">
            <label className="rvm-field__label" htmlFor="rvm-desc-input">
              Mô tả chi tiết <span className="rvm-field__required" aria-hidden="true">*</span>
            </label>
            <textarea
              id="rvm-desc-input"
              className="rvm-textarea"
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (localError) setLocalError("");
              }}
              maxLength={2000}
              placeholder="Mô tả chi tiết sự việc, kèm thời điểm, camera tower, chứng cứ..."
              disabled={submitting || busy}
              aria-describedby="rvm-desc-counter"
              required
            />
            <div className="rvm-field__meta">
              <span className="rvm-field__hint">Mô tả rõ ràng giúp Admin xử lý nhanh hơn.</span>
              <span id="rvm-desc-counter" className="rvm-field__counter">
                {description.length}/2000
              </span>
            </div>
          </div>

          {/* Errors */}
          {localError ? (
            <div className="rvm-alert" role="alert">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>{localError}</span>
            </div>
          ) : null}
          {error ? (
            <div className="rvm-alert" role="alert">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="rvm-warning">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>
              Vi phạm sẽ được Admin xem xét. Bạn không thể sửa sau khi gửi.
            </span>
          </div>
        </div>

        <footer className="rvm-modal__footer">
          <button
            type="button"
            className="rvm-btn rvm-btn--ghost"
            onClick={() => onClose?.()}
            disabled={submitting || busy}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="rvm-btn rvm-btn--submit"
            disabled={!canSubmit}
          >
            <Flag size={14} aria-hidden="true" />
            {submitting ? "Đang gửi..." : "Ghi nhận vi phạm"}
          </button>
        </footer>
      </form>
    </div>
  );
}
