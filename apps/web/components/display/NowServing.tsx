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
      <p className="text-base md:text-lg uppercase tracking-[0.3em] text-pulse-green-800 mb-8 font-semibold">
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
            {/* Token number in elegant serif */}
            <span className="font-serif text-[14rem] md:text-[18rem] lg:text-[22rem] font-bold leading-[0.85] tracking-tight text-charcoal">
              {formatToken(currentToken)}
            </span>

            {/* Patient name in matching serif */}
            {currentName && (
              <p className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium italic text-pulse-green-800 mt-6">
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
            <p className="font-serif text-4xl md:text-5xl text-charcoal/40 font-medium italic">
              Queue is clear
            </p>
            <p className="text-base text-charcoal/30 mt-4">
              All patients have been seen
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}