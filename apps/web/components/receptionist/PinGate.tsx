'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';

interface PinGateProps {
  isAuthenticated: boolean;
  isInCooldown: boolean;
  cooldownSeconds: number;
  attempts: number;
  onSubmit: (pin: string) => boolean;
  children: React.ReactNode;
}

export function PinGate({
  isAuthenticated,
  isInCooldown,
  cooldownSeconds,
  attempts,
  onSubmit,
  children,
}: PinGateProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [isShaking, setIsShaking] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (!isAuthenticated && !isInCooldown) {
      inputRefs.current[0]?.focus();
    }
  }, [isAuthenticated, isInCooldown]);

  // Shake on failed attempt
  useEffect(() => {
    if (attempts > 0) {
      setIsShaking(true);
      setDigits(['', '', '', '']);
      const timer = setTimeout(() => {
        setIsShaking(false);
        inputRefs.current[0]?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [attempts]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (isInCooldown) return;

      // Only allow single digits
      const digit = value.replace(/\D/g, '').slice(-1);

      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);

      if (digit && index < 3) {
        // Auto-advance to next input
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 4 digits entered
      if (digit && index === 3) {
        const pin = newDigits.join('');
        if (pin.length === 4) {
          const success = onSubmit(pin);
          if (success) {
            setShowUnlock(true);
          }
        }
      }
    },
    [digits, isInCooldown, onSubmit]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        // Go back to previous input on backspace
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
      if (pasted.length === 4) {
        const newDigits = pasted.split('');
        setDigits(newDigits);
        const success = onSubmit(pasted);
        if (success) {
          setShowUnlock(true);
        }
      }
    },
    [onSubmit]
  );

  // Show children when authenticated
  if (isAuthenticated && !showUnlock) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      {showUnlock ? (
        <motion.div
          key="unlock"
          initial={{ y: 0 }}
          animate={{ y: '-100vh' }}
          transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.2 }}
          onAnimationComplete={() => setShowUnlock(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
        >
          <Logo size="lg" className="mb-4" />
          <p className="text-pulse-green font-medium">✓ Unlocked</p>
        </motion.div>
      ) : (
        <motion.div
          key="lock"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
        >
          <Logo size="lg" className="mb-8" />

          <h2 className="text-lg font-semibold text-charcoal mb-6">
            Enter Receptionist PIN
          </h2>

          {/* Cooldown state */}
          {isInCooldown ? (
            <div className="text-center">
              <p className="text-signal-red font-medium mb-2">
                Too many attempts
              </p>
              <p className="text-3xl font-mono font-bold text-charcoal mb-2">
                {cooldownSeconds}s
              </p>
              <p className="text-sm text-text-muted">
                Try again after cooldown
              </p>
            </div>
          ) : (
            <>
              {/* PIN input boxes */}
              <div
                className={cn(
                  'flex gap-3 mb-4',
                  isShaking && 'animate-shake'
                )}
                onPaste={handlePaste}
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cn(
                      'h-14 w-14 rounded-xl border-2 bg-white text-center text-2xl font-mono font-bold',
                      'focus:outline-none focus:ring-2 transition-colors',
                      isShaking
                        ? 'border-signal-red focus:ring-signal-red/30'
                        : 'border-gray-200 focus:border-clinic-blue focus:ring-clinic-blue/30'
                    )}
                    disabled={isInCooldown}
                  />
                ))}
              </div>

              {/* Attempt counter */}
              {attempts > 0 && (
                <p className="text-sm text-signal-red mb-2">
                  Incorrect PIN — {3 - attempts} attempt{3 - attempts !== 1 ? 's' : ''} remaining
                </p>
              )}

              <p className="text-xs text-text-muted">
                Enter your 4-digit PIN to access the dashboard
              </p>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}