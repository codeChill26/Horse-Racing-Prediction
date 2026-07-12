/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToastContext — tách riêng để react-refresh/only-export-components không
 * cảnh báo khi 1 file export cả component lẫn context/function.
 */

import { createContext } from "react";

export const ToastContext = createContext(null);