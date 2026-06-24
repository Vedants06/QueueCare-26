'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReinstatedBannerProps {
  show: boolean;
  className?: string;
}

export function ReinstatedBanner({ show, className }: ReinstatedBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'rounded-xl border border-pulse-green-300 bg-pulse-green-50 p-4 text-center',
            className
          )}
        >
          <p className="text-sm font-semibold text-pulse-green-800">
            ✓ You have been returned to the queue.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}