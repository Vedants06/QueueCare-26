'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

/**
 * Manages Socket.IO connection lifecycle.
 *
 * Connects on mount, disconnects on unmount.
 * On connect: joins the clinic room.
 * On reconnect: re-joins the room to get a fresh state-sync.
 * Tracks connection status and last updated timestamp.
 */
export function useSocket(clinicId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const socketRef = useRef(getSocket());

  const updateTimestamp = useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join-clinic', { clinicId });
      updateTimestamp();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onReconnect = () => {
      // Re-join clinic room after reconnection to get state-sync
      socket.emit('join-clinic', { clinicId });
      updateTimestamp();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect', onReconnect);

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      // Already connected (e.g., hot reload) — join room
      socket.emit('join-clinic', { clinicId });
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect', onReconnect);
      socket.disconnect();
    };
  }, [clinicId, updateTimestamp]);

  return {
    socket: socketRef.current,
    isConnected,
    lastUpdated,
    updateTimestamp,
  };
}