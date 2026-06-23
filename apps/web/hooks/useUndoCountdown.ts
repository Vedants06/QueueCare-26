'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TypedSocket } from '@/lib/socket';
import type { TokenCalledPayload } from '@shared/types';

const UNDO_WINDOW_MS = 5000;
const TICK_INTERVAL_MS = 50; // Smooth progress bar updates

/**
 * Manages the 5-second undo countdown after call-next.
 *
 * Listens to 'token-called' event:
 *   - If isRecall: false → starts the 5s countdown
 *   - If isRecall: true → does NOT start (recall is not undoable)
 *
 * New token-called resets the countdown.
 *
 * Returns:
 *   isUndoAvailable — true during the 5-second window
 *   secondsRemaining — integer seconds left
 *   progress — 0 to 1 (1 = full, 0 = expired)
 *   calledToken — the token number that was called (for undo banner display)
 */
export function useUndoCountdown(socket: TypedSocket) {
  const [isUndoAvailable, setIsUndoAvailable] = useState(false);
  const [calledToken, setCalledToken] = useState<number | null>(null);
  const [calledName, setCalledName] = useState<string>('');
  const [progress, setProgress] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const expiresAtRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsUndoAvailable(false);
    setProgress(0);
    setSecondsRemaining(0);
    setCalledToken(null);
    setCalledName('');
  }, []);

  const startCountdown = useCallback(
    (token: number, name: string) => {
      // Clear any existing countdown
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const now = Date.now();
      expiresAtRef.current = now + UNDO_WINDOW_MS;

      setIsUndoAvailable(true);
      setCalledToken(token);
      setCalledName(name);
      setProgress(1);
      setSecondsRemaining(5);

      intervalRef.current = setInterval(() => {
        const remaining = expiresAtRef.current - Date.now();

        if (remaining <= 0) {
          clearCountdown();
          return;
        }

        setProgress(remaining / UNDO_WINDOW_MS);
        setSecondsRemaining(Math.ceil(remaining / 1000));
      }, TICK_INTERVAL_MS);
    },
    [clearCountdown]
  );

  useEffect(() => {
    const onTokenCalled = (payload: TokenCalledPayload) => {
      // Only start undo countdown for new calls, not recalls
      if (!payload.isRecall) {
        startCountdown(payload.token, payload.name);
      }
    };

    socket.on('token-called', onTokenCalled);

    return () => {
      socket.off('token-called', onTokenCalled);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [socket, startCountdown]);

  return {
    isUndoAvailable,
    calledToken,
    calledName,
    secondsRemaining,
    progress,
    clearCountdown,
  };
}