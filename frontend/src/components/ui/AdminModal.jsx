/**
 * Shared modal components for the admin / management area.
 * - AdminModal: dark-themed modal with header bar, scrollable body, sticky footer.
 * - AdminModalSection: section block inside the body for form layout.
 * - AdminModalField: labelled form field with optional hint.
 */

import { X } from "lucide-react";
import "./AdminModal.css";

/**
 * @param {Object} props
 * @param {string} [props.title]        Main title (uppercase).
 * @param {string} [props.subtitle]     Subtitle shown under the title.
 * @param {string} [props.accent]       Accent color class: 'primary' | 'gold' | 'danger' | 'info' (default: 'primary').
 * @param {'sm'|'md'|'lg'|'xl'} [props.size]  Modal width. sm=520, md=720, lg=900, xl=1100.
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {() => void} props.onClose
 * @param {boolean} [props.bare]        If true, render only the body without header/footer (rare).
 */
export function AdminModal({
  title,
  subtitle,
  accent = "primary",
  size = "md",
  children,
  footer,
  onClose,
}) {
  return (
    <div
      className="gs-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`gs-modal gs-modal--${size} gs-modal--accent-${accent}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gs-modal__bar" />
        {title && (
          <header className="gs-modal__header">
            <div className="gs-modal__title-wrap">
              <h2 className="gs-modal__title">{title}</h2>
              {subtitle && (
                <p className="gs-modal__subtitle">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              className="gs-modal__close"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </header>
        )}
        <div className="gs-modal__body">{children}</div>
        {footer && <footer className="gs-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

/**
 * Section divider inside the modal body. Helps group related fields.
 */
export function AdminModalSection({ title, description, children, className = "" }) {
  return (
    <section className={`gs-modal-section ${className}`}>
      {title && <h3 className="gs-modal-section__title">{title}</h3>}
      {description && (
        <p className="gs-modal-section__desc">{description}</p>
      )}
      <div className="gs-modal-section__body">{children}</div>
    </section>
  );
}

/**
 * Labelled field with optional hint and required marker.
 */
export function AdminModalField({
  label,
  required,
  hint,
  error,
  children,
  className = "",
}) {
  return (
    <label className={`gs-field ${className}`}>
      {label && (
        <span className="gs-field__label">
          {label}
          {required && <span className="gs-field__required"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="gs-field__hint">{hint}</span>}
      {error && <span className="gs-field__error">{error}</span>}
    </label>
  );
}

export function AdminModalAlert({ type = "error", children }) {
  return <div className={`gs-modal-alert gs-modal-alert--${type}`}>{children}</div>;
}
