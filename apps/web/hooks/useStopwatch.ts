'use client';

import { useState, useEffect, useRef } from 'react';
import { formatElapsed } from '@/lib/formatters';

/**
 * Live stopwatch that displays elapsed time since calledAt.
 *
 * CRITICAL: Initializes elapsed from calledAt, NOT from 0.
 * This ensures the stopwatch shows correct time even after:
 *   - Page refresh
 *   - Socket reconnection
 *   - Server restart (calledAt is preserved in state)
 *
 * Returns formatted string "MM:SS" and raw elapsed ms.
 */
export function useStopwatch(calledAt: number | undefined) {
  const [elapsedMs, setElapsedMs] = useState<number>(() => {
    if (!calledAt) return 0;
    return Math.max(0, Date.now() - calledAt);
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!calledAt) {
      setElapsedMs(0);
      return;
    }

    // Initialize from calledAt immediately
    setElapsedMs(Math.max(0, Date.now() - calledAt));

    // Update every second
    intervalRef.current = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - calledAt));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [calledAt]);

  return {
    elapsedMs,
    formatted: formatElapsed(elapsedMs),
  };
}