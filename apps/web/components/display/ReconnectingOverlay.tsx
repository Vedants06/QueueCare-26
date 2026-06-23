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
          className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/90"
        >
          <div className="text-center">
            {/* Spinner */}
            <div className="mb-4 inline-block">
              <div className="h-10 w-10 rounded-full border-4 border-gray-600 border-t-clinic-blue animate-spin" />
            </div>
            <p className="text-xl font-medium text-white">
              Reconnecting...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}