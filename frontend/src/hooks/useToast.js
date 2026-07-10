/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useToast — React hook trả về { push, dismiss, toasts }.
 *
 * Tách riêng để react-refresh/only-export-components không cảnh báo
 * khi file cùng export ToastProvider component.
 */

import { useContext } from "react";
import { ToastContext } from "./toastContext";
import { showToast } from "./showToast";

const FALLBACK_TOAST = { push: showToast, dismiss: () => {}, toasts: [] };

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return FALLBACK_TOAST;
  return ctx;
}