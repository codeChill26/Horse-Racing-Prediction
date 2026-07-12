/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToastProvider — React provider quản lý toast queue + drain external queue.
 * Mount 1 lần ở App.jsx, bên trong <BrowserRouter>.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { ToastContext } from "./toastContext";
import { __registerToastListener } from "./showToast";

function generateId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function reducer(state, action) {
  switch (action.type) {
    case "add":
      return [...state, action.toast];
    case "remove":
      return state.filter((t) => t.id !== action.id);
    case "clear":
      return [];
    default:
      return state;
  }
}

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const push = useCallback((payload) => {
    const toast = {
      id: payload?.id || generateId(),
      type: payload?.type || "info",
      title: payload?.title || "",
      message: payload?.message || "",
      duration: typeof payload?.duration === "number" ? payload.duration : 4000,
    };
    dispatch({ type: "add", toast });
    if (toast.duration > 0) {
      setTimeout(() => {
        dispatch({ type: "remove", id: toast.id });
      }, toast.duration);
    }
    return toast.id;
  }, []);

  const dismiss = useCallback((id) => {
    dispatch({ type: "remove", id });
  }, []);

  // Bridge: lắng nghe external showToast()
  useEffect(() => {
    const unsubscribe = __registerToastListener((payload) => push(payload));
    return unsubscribe;
  }, [push]);

  const value = useMemo(
    () => ({ push, dismiss, toasts }),
    [push, dismiss, toasts]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}