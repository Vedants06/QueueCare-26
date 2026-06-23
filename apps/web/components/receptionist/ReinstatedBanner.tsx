'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatToken } from '@/lib/formatters';
import type { TypedSocket } from '@/lib/socket';
import type { PatientReinstatedPayload } from '@shared/types';

interface ReinstatedBannerReceptionistProps {
  socket: TypedSocket;
  className?: string;
}

interface BannerData {
  token: number;
  name: string;
  position: 'front' | 'back';
}

export function ReinstatedBannerReceptionist({ socket, className }: ReinstatedBannerReceptionistProps) {
  const [banner, setBanner] = useState<BannerData | null>(null);

  useEffect(() => {
    const onReinstated = (payload: PatientReinstatedPayload) => {
      setBanner({
        token: payload.token,
        name: payload.name,
        position: payload.position,
      });

      // Auto-dismiss after 4 seconds
      setTimeout(() => setBanner(null), 4000);
    };

    socket.on('patient-reinstated', onReinstated);
    return () => {
      socket.off('patient-reinstated', onReinstated);
    };
  }, [socket]);

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'fixed top-4 right-4 z-30 max-w-sm',
            'rounded-lg border border-pulse-green-200 bg-pulse-green-50 p-4 shadow-lg',
            className
          )}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">✓</span>
            <div>
              <p className="text-sm font-medium text-pulse-green-700">
                Patient reinstated
              </p>
              <p className="text-xs text-pulse-green-600 mt-0.5">
                Token #{formatToken(banner.token)} — {banner.name} returned
                to {banner.position === 'front' ? 'front' : 'back'} of queue
              </p>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="shrink-0 text-pulse-green-400 hover:text-pulse-green-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}