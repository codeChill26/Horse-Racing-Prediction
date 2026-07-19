/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ChevronLeft, ChevronRight, Calendar, Clock, X } from "lucide-react";
import { format, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import "./AdminDateTimePicker.css";

/**
 * Parse a value like "2026-07-18T09:30" (what datetime-local emits) into a Date.
 * Returns null if the value is empty or invalid.
 */
function parseLocal(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date into the "YYYY-MM-DDTHH:mm" local-time string used by inputs.
 */
function formatLocal(d) {
  if (!d || !isValid(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Custom AdminDateTimePicker.
 *
 * Props:
 *  - name: input name (kept for form compatibility)
 *  - value: string in "YYYY-MM-DDTHH:mm" form (or "")
 *  - onChange: (eventLike) => void  where eventLike.target = { name, value }
 *  - placeholder, disabled, min, max
 */
export default function AdminDateTimePicker({
  name,
  value,
  onChange,
  placeholder = "Chọn ngày giờ",
  disabled = false,
  min,
  max,
  id,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selected = useMemo(() => parseLocal(value), [value]);

  // Initialize separate date / hour / minute states from the selected value.
  const [hour, setHour] = useState(selected ? selected.getHours() : 9);
  const [minute, setMinute] = useState(
    selected ? selected.getMinutes() : 0
  );

  // Keep hour/minute in sync when the parent value changes externally.
  useEffect(() => {
    if (selected) {
      setHour(selected.getHours());
      setMinute(selected.getMinutes());
    }
  }, [selected]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const wrapper = wrapperRef.current;
      if (wrapper && wrapper.contains(e.target)) return;
      const popover = document.querySelector(".adm-dtp__popover");
      if (popover && popover.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Compute popover position — uses a portal to <body> with position: fixed so
  // it can never be clipped by modal overflow. When opened, also scroll the
  // nearest scrollable ancestor (the modal body) so the trigger sits high
  // enough that the popover + Done button stay visible.
  const triggerRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState(null);
  useEffect(() => {
    if (!open) {
      setPopoverStyle(null);
      return;
    }

    // Compute the popover position ONCE when it opens. We deliberately do
    // NOT scroll the modal and do NOT recompute on every scroll/resize —
    // re-running while the user is interacting with the calendar caused
    // the modal scrollbar to jump up and down.
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const popWidth = Math.max(r.width, 340);
    const minLeft = 8;
    const maxLeft = window.innerWidth - popWidth - 8;
    const desiredLeft = r.left + r.width / 2 - popWidth / 2;
    const finalLeft = Math.max(minLeft, Math.min(desiredLeft, maxLeft));

    // Prefer rendering ABOVE the trigger (pop-up goes upward like a
    // tooltip). Fall back to below if there isn't enough room above.
    const POPOVER_HEIGHT = 380;
    const GAP = 6;
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    const placeAbove = spaceAbove >= POPOVER_HEIGHT || spaceAbove > spaceBelow;
    const top = placeAbove
      ? Math.max(8, r.top - POPOVER_HEIGHT - GAP)
      : r.bottom + GAP;

    setPopoverStyle({
      top,
      left: finalLeft,
      width: popWidth,
      placement: placeAbove ? "top" : "bottom",
    });
  }, [open]);

  const emit = (date) => {
    if (!date) {
      onChange?.({ target: { name, value: "" } });
      return;
    }
    const next = new Date(date);
    next.setHours(hour, minute, 0, 0);
    onChange?.({ target: { name, value: formatLocal(next) } });
  };

  const handleDaySelect = (date) => {
    if (!date) return;
    emit(date);
  };

  const handleTimeApply = () => {
    if (!selected) return;
    emit(selected);
  };

  const handleClear = () => {
    onChange?.({ target: { name, value: "" } });
    setOpen(false);
  };

  // Build min/max Date constraints from string inputs.
  const minDate = min ? parseLocal(min) : undefined;
  const maxDate = max ? parseLocal(max) : undefined;

  const formatted = selected
    ? format(selected, "EEEE, dd 'tháng' MM, yyyy • HH:mm", { locale: vi })
    : "";

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="adm-dtp" ref={wrapperRef}>
      <input type="hidden" name={name} value={value || ""} id={id} />

      <button
        type="button"
        ref={triggerRef}
        className={`adm-dtp__trigger ${selected ? "has-value" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Calendar size={16} className="adm-dtp__icon" />
        <span className="adm-dtp__text">
          {formatted || (
            <span className="adm-dtp__placeholder">{placeholder}</span>
          )}
        </span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={0}
            className="adm-dtp__clear"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }
            }}
            aria-label="Xóa"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {open && !disabled && popoverStyle && createPortal(
        <div
          className="adm-dtp__popover"
          role="dialog"
          data-placement={popoverStyle.placement}
          style={{
            position: "fixed",
            top: popoverStyle.top,
            left: popoverStyle.left,
            width: popoverStyle.width,
          }}
        >
          <div className="adm-dtp__calendar">
            <DayPicker
              mode="single"
              selected={selected || undefined}
              onSelect={handleDaySelect}
              locale={vi}
              showOutsideDays
              modifiersClassNames={{
                selected: "adm-dp__selected",
                today: "adm-dp__today",
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeft size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  ),
              }}
              fromMonth={minDate || undefined}
              toMonth={maxDate || undefined}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
            />
          </div>

          <div className="adm-dtp__time">
            <div className="adm-dtp__time-header">
              <Clock size={14} />
              <span>Giờ</span>
            </div>
            <div className="adm-dtp__time-row">
              <select
                className="adm-dtp__select"
                value={hour}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setHour(h);
                  if (selected) {
                    const next = new Date(selected);
                    next.setHours(h, minute, 0, 0);
                    onChange?.({
                      target: { name, value: formatLocal(next) },
                    });
                  }
                }}
                aria-label="Giờ"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="adm-dtp__time-sep">:</span>
              <select
                className="adm-dtp__select"
                value={minute}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setMinute(m);
                  if (selected) {
                    const next = new Date(selected);
                    next.setHours(hour, m, 0, 0);
                    onChange?.({
                      target: { name, value: formatLocal(next) },
                    });
                  }
                }}
                aria-label="Phút"
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div className="adm-dtp__time-preview">
                {format(selected, "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
              </div>
            )}

            <div className="adm-dtp__footer">
              <button
                type="button"
                className="adm-dtp__btn adm-dtp__btn--ghost"
                onClick={() => setOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="adm-dtp__btn adm-dtp__btn--primary"
                onClick={() => {
                  handleTimeApply();
                  setOpen(false);
                }}
                disabled={!selected}
              >
                Xong
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}