'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatToken } from '@/lib/formatters';
import type { TypedSocket } from '@/lib/socket';
import type { ConsultationWarningPayload } from '@shared/types';

interface ConsultWarningProps {
  socket: TypedSocket;
  currentToken: number | null;
  className?: string;
}

interface WarningData {
  token: number;
  name: string;
  elapsedMinutes: number;
  avgMinutes: number;
}

export function ConsultWarning({ socket, currentToken, className }: ConsultWarningProps) {
  const [warning, setWarning] = useState<WarningData | null>(null);

  // Listen for consultation-warning events
  useEffect(() => {
    const onWarning = (payload: ConsultationWarningPayload) => {
      setWarning({
        token: payload.token,
        name: payload.name,
        elapsedMinutes: payload.elapsedMinutes,
        avgMinutes: payload.avgMinutes,
      });
    };

    socket.on('consultation-warning', onWarning);
    return () => {
      socket.off('consultation-warning', onWarning);
    };
  }, [socket]);

  // Auto-clear when Mark Done is clicked (currentToken becomes null)
  useEffect(() => {
    if (currentToken === null && warning) {
      setWarning(null);
    }
  }, [currentToken, warning]);

  return (
    <AnimatePresence>
      {warning && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'fixed top-4 right-4 z-30 max-w-sm',
            'rounded-lg border border-amber-alert-200 bg-amber-alert-50 p-4 shadow-lg',
            className
          )}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">⏱</span>
            <div>
              <p className="text-sm font-medium text-amber-alert-700">
                Long consultation
              </p>
              <p className="text-xs text-amber-alert-600 mt-0.5">
                Token #{formatToken(warning.token)} — {warning.name} has been in
                consultation for {warning.elapsedMinutes} min (avg: {warning.avgMinutes} min).
                Wait estimates may be higher than shown.
              </p>
            </div>
            <button
              onClick={() => setWarning(null)}
              className="shrink-0 text-amber-alert-400 hover:text-amber-alert-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}