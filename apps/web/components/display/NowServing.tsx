'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NowServingProps {
  currentToken: number | null;
  currentName?: string;
  className?: string;
}

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

export function NowServing({ currentToken, currentName, className }: NowServingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <p className="text-base md:text-lg uppercase tracking-[0.3em] text-pulse-green-800 mb-6 font-semibold">
        Now Serving
      </p>

      <AnimatePresence mode="wait">
        {currentToken !== null ? (
          <motion.div
            key={currentToken}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="flex flex-col items-center"
          >
            <span className="font-mono text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold leading-none tracking-tight text-charcoal">
              {formatToken(currentToken)}
            </span>
            {currentName && (
              <p className="text-3xl md:text-4xl lg:text-5xl font-medium text-charcoal/70 mt-4">
                {currentName}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <p className="text-3xl md:text-4xl text-charcoal/40 font-medium">
              Queue is clear
            </p>
            <p className="text-base text-charcoal/30 mt-3">
              All patients have been seen
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}