'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatToken } from '@/lib/formatters';
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
    socket.emit('undo-call', {
      clinicId,
      receptionistPin: getPin(),
    });
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
            'rounded-lg border border-clinic-blue-200 bg-clinic-blue-50 p-3',
            className
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-clinic-blue-700">
              <span className="font-medium">↩ Undo</span>{' '}
              — Called #{formatToken(calledToken)} {calledName}
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-clinic-blue-500 font-mono">
                {secondsRemaining}s
              </span>
              <button
                onClick={handleUndo}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  'bg-clinic-blue text-white hover:bg-clinic-blue-600'
                )}
              >
                Undo
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full rounded-full bg-clinic-blue-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-clinic-blue transition-all duration-100 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}