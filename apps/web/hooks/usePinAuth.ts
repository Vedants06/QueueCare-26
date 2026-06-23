'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TypedSocket } from '@/lib/socket';
import type { QueueError } from '@shared/types';

const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 30_000; // 30 seconds

/**
 * Manages receptionist PIN authentication state.
 *
 * PIN is entered once on the lock screen.
 * Stored in React state only (cleared on tab close).
 * Sent with every destructive socket event.
 *
 * If server rejects with 'unauthorized':
 *   - attempts incremented
 *   - After 3 wrong: 30-second cooldown
 *   - After cooldown: attempts reset
 *
 * getPin() returns the stored PIN for socket event payloads.
 */
export function usePinAuth(socket: TypedSocket) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for unauthorized errors from server
  useEffect(() => {
    const onQueueError = (error: QueueError) => {
      if (error.code === 'unauthorized') {
        setAttempts((prev) => {
          const newAttempts = prev + 1;

          if (newAttempts >= MAX_ATTEMPTS) {
            // Start cooldown
            const cooldownEnd = Date.now() + COOLDOWN_MS;
            setCooldownUntil(cooldownEnd);
            setIsAuthenticated(false);
            setPin('');

            return 0; // Reset attempts for after cooldown
          }

          return newAttempts;
        });
      }
    };

    socket.on('queue-error', onQueueError);

    return () => {
      socket.off('queue-error', onQueueError);
    };
  }, [socket]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }

    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        setCooldownUntil(null);
        setCooldownSeconds(0);
        setAttempts(0);
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
      } else {
        setCooldownSeconds(Math.ceil(remaining / 1000));
      }
    };

    updateCooldown();
    cooldownIntervalRef.current = setInterval(updateCooldown, 1000);

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [cooldownUntil]);

  // Submit PIN — store it and mark as authenticated
  // Server will validate on first socket event
  const submitPin = useCallback(
    (enteredPin: string) => {
      if (cooldownUntil && Date.now() < cooldownUntil) {
        return false;
      }

      if (enteredPin.length !== 4) {
        return false;
      }

      setPin(enteredPin);
      setIsAuthenticated(true);
      return true;
    },
    [cooldownUntil]
  );

  // Get stored PIN for socket event payloads
  const getPin = useCallback((): string => {
    return pin;
  }, [pin]);

  // Clear PIN and reset auth state
  const clearAuth = useCallback(() => {
    setPin('');
    setIsAuthenticated(false);
    setAttempts(0);
    setCooldownUntil(null);
  }, []);

  // Check if in cooldown
  const isInCooldown = cooldownUntil !== null && Date.now() < cooldownUntil;

  return {
    isAuthenticated,
    attempts,
    isInCooldown,
    cooldownSeconds,
    submitPin,
    getPin,
    clearAuth,
  };
}