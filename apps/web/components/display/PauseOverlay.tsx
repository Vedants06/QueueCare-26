'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PauseOverlayProps {
  isPaused: boolean;
}

export function PauseOverlay({ isPaused }: PauseOverlayProps) {
  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#F2EFE8]/95 backdrop-blur-sm"
        >
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-amber-alert-50 border-2 border-amber-alert-200 mb-6">
              <span className="text-4xl">⏸</span>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-charcoal mb-3">
              Queue Paused
            </p>
            <p className="text-lg text-charcoal/60">
              Please wait
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}