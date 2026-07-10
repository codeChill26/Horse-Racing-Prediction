/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConfirmModal — Shared confirmation dialog.
 *
 * FIX BUG-7.17: thay thế `window.confirm()` native (vi phạm a11y). Modal này có:
 *  - role="dialog" + aria-modal + aria-labelledby + aria-describedby
 *  - ESC đóng (khi không busy)
 *  - Focus trap không cần (modal đơn giản 1 hành động)
 *  - `busy` prop để disable nút confirm → chặn double-click
 *  - Slot `message` có thể là string hoặc ReactNode
 *
 * Sử dụng:
 *   <ConfirmModal
 *     open={open}
 *     title="Hủy vé cược #123?"
 *     message="Vé cược sẽ được hoàn 100% về ví."
 *     confirmLabel="Xác nhận hủy"
 *     confirmTone="danger"
 *     busy={cancelling}
 *     onConfirm={handleConfirm}
 *     onClose={() => setOpen(false)}
 *   />
 */

import { useEffect, useId, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import './ConfirmModal.css'

/**
 * @param {object} props
 * @param {boolean}        props.open        - render modal khi true
 * @param {string}         props.title       - tiêu đề modal
 * @param {string|Node}    props.message     - nội dung (string hoặc ReactNode)
 * @param {string}         [props.confirmLabel='Xác nhận']
 * @param {string}         [props.cancelLabel='Hủy']
 * @param {'primary'|'danger'} [props.confirmTone='primary']
 * @param {boolean}        [props.busy=false]
 * @param {string}         [props.error='']
 * @param {function}       [props.onConfirm] - async handler; modal chờ promise resolve mới đóng
 * @param {function}       [props.onClose]
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  confirmTone = 'primary',
  busy = false,
  error = '',
  onConfirm,
  onClose,
}) {
  const confirmRef = useRef(null)
  const reactId = useId()
  const titleId = `cm-title-${reactId}`
  const descId  = `cm-desc-${reactId}`

  // Auto-focus confirm button when modal opens
  useEffect(() => {
    if (open && confirmRef.current) {
      // Đợi 1 frame để DOM render xong mới focus.
      const t = setTimeout(() => confirmRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open])

  // ESC đóng (khi không busy)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const handleBackdropClick = (e) => {
    if (busy) return
    if (e.target === e.currentTarget) onClose?.()
  }

  const handleConfirm = async () => {
    if (busy) return
    try {
      await onConfirm?.()
      // Parent quyết định khi nào đóng (sau khi promise resolve).
    } catch (_e) {
      // Parent xử lý error qua prop `error`.
    }
  }

  return (
    <div
      className="cm-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="cm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="cm-modal__bar" />

        <header className="cm-modal__header">
          <div
            className={`cm-modal__icon cm-modal__icon--${confirmTone === 'danger' ? 'danger' : 'primary'}`}
            aria-hidden="true"
          >
            <AlertTriangle size={20} />
          </div>
          <div className="cm-modal__heading">
            <h2 id={titleId} className="cm-modal__title">{title}</h2>
          </div>
          <button
            type="button"
            className="cm-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="cm-modal__body">
          {typeof message === 'string' ? (
            <p id={descId} className="cm-modal__message">{message}</p>
          ) : (
            <div id={descId} className="cm-modal__message">{message}</div>
          )}

          {error && (
            <div className="cm-modal__alert" role="alert">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="cm-modal__footer">
          <button
            type="button"
            className="cm-btn cm-btn--ghost"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`cm-btn cm-btn--${confirmTone === 'danger' ? 'danger' : 'primary'}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
