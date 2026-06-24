'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PinGateProps {
  isAuthenticated: boolean;
  isInCooldown: boolean;
  cooldownSeconds: number;
  attempts: number;
  onSubmit: (pin: string) => boolean;
  children: React.ReactNode;
  demoPin?: string;
  roleName?: string;
}

export function PinGate({
  isAuthenticated,
  isInCooldown,
  cooldownSeconds,
  attempts,
  onSubmit,
  children,
  demoPin = '1234',
  roleName = 'Receptionist',
}: PinGateProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [isShaking, setIsShaking] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isAuthenticated && !isInCooldown) {
      inputRefs.current[0]?.focus();
    }
  }, [isAuthenticated, isInCooldown]);

  useEffect(() => {
    if (isAuthenticated) {
      setShowUnlock(true);
    }
  }, [isAuthenticated]);

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

      const digit = value.replace(/\D/g, '').slice(-1);
      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);

      if (digit && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }

      if (digit && index === 3) {
        const pin = newDigits.join('');
        if (pin.length === 4) {
          onSubmit(pin);
        }
      }
    },
    [digits, isInCooldown, onSubmit]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
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
        setDigits(pasted.split(''));
        onSubmit(pasted);
      }
    },
    [onSubmit]
  );

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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F2EFE8]"
        >
          <Image
            src="/QueueCureLogo.png"
            alt="QueueCure"
            width={48}
            height={48}
            className="h-12 w-12 mb-3"
          />
          <span className="text-xl font-semibold text-charcoal mb-3">QueueCure</span>
          <p className="text-pulse-green-800 font-semibold flex items-center gap-2">
            <span className="text-lg">✓</span>
            Unlocked
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="lock"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F2EFE8] px-6"
        >
          <div className="rounded-2xl bg-white border border-charcoal/10 p-8 max-w-sm w-full">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Image
                src="/QueueCureLogo.png"
                alt="QueueCure"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-semibold text-charcoal">QueueCure</span>
            </div>

            <h2 className="text-base font-semibold text-charcoal text-center mb-6">
              Enter {roleName} PIN
            </h2>

            {isInCooldown ? (
              <div className="text-center">
                <p className="text-signal-red font-semibold mb-2">
                  Too many attempts
                </p>
                <p className="text-4xl font-mono font-bold text-charcoal mb-2">
                  {cooldownSeconds}s
                </p>
                <p className="text-xs text-charcoal/55">
                  Try again after cooldown
                </p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'flex justify-center gap-3 mb-4',
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
                        'h-14 w-14 rounded-lg border-2 bg-white text-center text-2xl font-mono font-bold',
                        'focus:outline-none transition-colors',
                        isShaking
                          ? 'border-signal-red'
                          : 'border-charcoal/15 focus:border-pulse-green-700'
                      )}
                      disabled={isInCooldown}
                    />
                  ))}
                </div>

                {attempts > 0 && (
                  <p className="text-sm text-signal-red text-center mb-3">
                    Incorrect PIN — {3 - attempts} attempt
                    {3 - attempts !== 1 ? 's' : ''} remaining
                  </p>
                )}

                <p className="text-xs text-charcoal/55 text-center">
                  Enter your 4-digit PIN to access the dashboard
                </p>

                {/* Demo PIN hint */}
                <div className="mt-6 pt-4 border-t border-charcoal/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 text-center mb-1">
                    Demo
                  </p>
                  <p className="text-sm text-center text-charcoal/65">
                    PIN ·{' '}
                    <span className="font-mono font-bold text-charcoal">{demoPin}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}