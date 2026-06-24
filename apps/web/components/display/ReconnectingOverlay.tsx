'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ReconnectingOverlayProps {
  isDisconnected: boolean;
}

export function ReconnectingOverlay({ isDisconnected }: ReconnectingOverlayProps) {
  return (
    <AnimatePresence>
      {isDisconnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#F2EFE8]/95 backdrop-blur-sm"
        >
          <div className="text-center">
            <div className="mb-6 inline-block">
              <div className="h-12 w-12 rounded-full border-4 border-charcoal/15 border-t-pulse-green-700 animate-spin" />
            </div>
            <p className="text-xl font-medium text-charcoal/70">
              Reconnecting...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}