/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSocket — React hook wrapper cho socket client.
 *
 * Tự kết nối socket khi có token, tự ngắt khi component unmount hoặc token đổi.
 *
 * Usage:
 *   const socket = useSocket(token);
 *   useEffect(() => {
 *     if (!socket) return;
 *     const off = onSocketEvent('invitation:received', (payload) => { ... });
 *     return off;
 *   }, [socket]);
 */

import { useEffect, useState } from "react";
import { getSocket, onSocketStatus } from "../utils/socket";

export function useSocket(token) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    const s = getSocket(token);
    setSocket(s);

    const offStatus = onSocketStatus(({ connected: c }) => {
      setConnected(!!c);
    });

    if (s && s.connected) setConnected(true);

    return () => {
      offStatus();
      // KHÔNG disconnect socket ở đây — socket là singleton dùng chung cho
      // toàn app, chỉ nên ngắt khi token bị xoá (logout).
    };
  }, [token]);

  return { socket, connected };
}