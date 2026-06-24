'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TypedSocket } from '@/lib/socket';
import type { VerifyPinResultPayload } from '@shared/types';

const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 30_000;

type Role = 'receptionist' | 'doctor';

export function usePinAuth(socket: TypedSocket, role: Role = 'receptionist', clinicId = 'default') {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPinRef = useRef<string>('');

  // Listen for verify-pin-result
  useEffect(() => {
    const onResult = (payload: VerifyPinResultPayload) => {
      if (payload.role !== role) return;

      if (payload.valid) {
        setPin(pendingPinRef.current);
        setIsAuthenticated(true);
        setAttempts(0);
        pendingPinRef.current = '';
      } else {
        pendingPinRef.current = '';
        setAttempts((prev) => {
          const newAttempts = prev + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            setCooldownUntil(Date.now() + COOLDOWN_MS);
            setIsAuthenticated(false);
            setPin('');
            return 0;
          }
          return newAttempts;
        });
      }
    };

    socket.on('verify-pin-result', onResult);
    return () => {
      socket.off('verify-pin-result', onResult);
    };
  }, [socket, role]);

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

  const submitPin = useCallback(
    (enteredPin: string) => {
      if (cooldownUntil && Date.now() < cooldownUntil) return false;
      if (enteredPin.length !== 4) return false;

      // Send to server for verification
      pendingPinRef.current = enteredPin;
      socket.emit('verify-pin', { clinicId, pin: enteredPin, role });
      return true;
    },
    [cooldownUntil, socket, clinicId, role]
  );

  const getPin = useCallback((): string => pin, [pin]);

  const clearAuth = useCallback(() => {
    setPin('');
    setIsAuthenticated(false);
    setAttempts(0);
    setCooldownUntil(null);
  }, []);

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