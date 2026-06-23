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
          className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/85"
        >
          <div className="text-center">
            <p className="text-5xl mb-4">⏸</p>
            <p className="text-3xl font-semibold text-white mb-2">
              Queue Paused
            </p>
            <p className="text-lg text-gray-400">
              Please wait
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}