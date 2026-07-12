/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToastContainer — UI render cho toast stack.
 * Mount 1 lần ở App.jsx.
 */

import { useContext } from "react";
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from "lucide-react";
import { ToastContext } from "./toastContext";
import "./useToast.css";

const META = {
  success: { Icon: CheckCircle2 },
  error: { Icon: AlertCircle },
  warn: { Icon: AlertTriangle },
  info: { Icon: Info },
};

export function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => {
        const meta = META[t.type] || META.info;
        const Icon = meta.Icon;
        return (
          <div
            key={t.id}
            className={`toast toast--${t.type}`}
            role={t.type === "error" ? "alert" : "status"}
          >
            <div className="toast__icon">
              <Icon size={18} />
            </div>
            <div className="toast__body">
              {t.title ? <div className="toast__title">{t.title}</div> : null}
              {t.message ? (
                <div className="toast__msg">{t.message}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(t.id)}
              aria-label="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}