'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TypedSocket } from '@/lib/socket';

interface UndoBannerProps {
  isVisible: boolean;
  calledToken: number | null;
  calledName: string;
  secondsRemaining: number;
  progress: number;
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  onDismiss: () => void;
  className?: string;
}

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

export function UndoBanner({
  isVisible,
  calledToken,
  calledName,
  secondsRemaining,
  progress,
  socket,
  clinicId,
  getPin,
  onDismiss,
  className,
}: UndoBannerProps) {
  const handleUndo = () => {
    socket.emit('undo-call', { clinicId, receptionistPin: getPin() });
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && calledToken !== null && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={cn(
            'rounded-2xl border border-pulse-green-700/30 bg-pulse-green-50 p-3',
            className
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-pulse-green-800">
              <span className="font-semibold">↩ Undo</span>{' '}
              — Called #{formatToken(calledToken)} {calledName}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-pulse-green-700 font-mono font-semibold">
                {secondsRemaining}s
              </span>
              <button
                onClick={handleUndo}
                className="rounded-full px-3 py-1 text-xs font-semibold bg-pulse-green-800 text-white hover:bg-pulse-green-900 transition-colors"
              >
                Undo
              </button>
            </div>
          </div>

          <div className="h-1 w-full rounded-full bg-pulse-green-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-pulse-green-700 transition-all duration-100 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}