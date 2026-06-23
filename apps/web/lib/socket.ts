'use client';

import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

let socket: TypedSocket | null = null;

/**
 * Get or create the Socket.IO client singleton.
 * Prevents multiple connections on React re-renders.
 * autoConnect: false — we connect manually when a component mounts.
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
  }
  return socket;
}