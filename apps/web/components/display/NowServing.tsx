'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TokenDisplay } from '@/components/shared/TokenDisplay';

interface NowServingProps {
  currentToken: number | null;
  className?: string;
}

export function NowServing({ currentToken, className }: NowServingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        className
      )}
    >
      <p className="text-lg uppercase tracking-[0.3em] text-gray-400 mb-4 font-medium">
        Now Serving
      </p>

      <AnimatePresence mode="wait">
        {currentToken !== null ? (
          <motion.div
            key={currentToken}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -200, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <TokenDisplay token={currentToken} size="display" className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-2xl text-gray-500 font-medium">
              Queue is clear
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}