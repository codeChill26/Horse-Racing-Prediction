/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Spectator Socket Hook — manages Socket.IO connection for spectator notifications.
 * Listens to WALLET_UPDATED (BET_WON / BET_LOST / BET_WIN_REVERSAL),
 * RACE_FINISHED, RACE_UNPUBLISHED from the /notifications namespace.
 */

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { spectatorNotificationCenter } from '../services/spectatorNotificationCenter';

/**
 * React hook that manages the Socket.IO connection for spectator notifications.
 * Call once at the top of the SpectatorLayout tree.
 *
 * @param {{ token: string }} opts
 * @returns {{ isConnected: boolean }}
 */
export function useSpectatorSocket({ token }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io('/notifications', {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    // BET_WON / BET_LOST / BET_WIN_REVERSAL all arrive as 'WALLET_UPDATED'
    socket.on('WALLET_UPDATED', (payload) => {
      if (payload && typeof payload === 'object') {
        spectatorNotificationCenter.addFromSocket('WALLET_UPDATED', payload);
      }
    });

    socket.on('RACE_FINISHED', (payload) => {
      if (payload && typeof payload === 'object') {
        spectatorNotificationCenter.addFromSocket('RACE_FINISHED', payload);
      }
    });

    socket.on('RACE_UNPUBLISHED', (payload) => {
      if (payload && typeof payload === 'object') {
        spectatorNotificationCenter.addFromSocket('RACE_UNPUBLISHED', payload);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('WALLET_UPDATED');
      socket.off('RACE_FINISHED');
      socket.off('RACE_UNPUBLISHED');
      socket.disconnect();
    };
  }, [token]);

  return { isConnected };
}
