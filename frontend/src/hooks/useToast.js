/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useToast — React hook trả về helper { success, error, info, warn, push, dismiss, toasts }.
 *
 * Tách riêng để react-refresh/only-export-components không cảnh báo
 * khi file cùng export ToastProvider component.
 */

import { useCallback, useContext, useMemo } from "react";
import { ToastContext } from "./toastContext";
import { showToast } from "./showToast";

const NOOP = () => {};

function buildHelpers(push) {
  return {
    success: (message, title) => push({ type: "success", message: message ?? "", title }),
    error: (message, title) => push({ type: "error", message: message ?? "", title }),
    info: (message, title) => push({ type: "info", message: message ?? "", title }),
    warn: (message, title) => push({ type: "warn", message: message ?? "", title }),
  };
}

export function useToast() {
  const ctx = useContext(ToastContext);
  const basePush = ctx?.push ?? showToast;
  const baseDismiss = ctx?.dismiss ?? NOOP;
  const baseToasts = useMemo(() => ctx?.toasts ?? [], [ctx?.toasts]);

  const helpers = useMemo(
    () => buildHelpers(basePush),
    [basePush],
  );

  const dismiss = useCallback(
    (id) => baseDismiss(id),
    [baseDismiss],
  );

  return useMemo(
    () => ({
      push: basePush,
      dismiss,
      toasts: baseToasts,
      ...helpers,
    }),
    [basePush, baseToasts, dismiss, helpers],
  );
}