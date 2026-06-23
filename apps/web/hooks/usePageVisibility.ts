'use client';

import { useEffect, useRef } from 'react';

/**
 * Fires a callback when the browser tab becomes visible again.
 *
 * Critical for:
 *   - Display TV screen (runs unattended all day, Chrome throttles background tabs)
 *   - Patient mobile screen (phone locks, then unlocks)
 *
 * On visibility → visible: callback is called.
 * Typical usage: re-emit join-clinic to force state-sync.
 */
export function usePageVisibility(onVisible: () => void): void {
  const callbackRef = useRef(onVisible);

  // Keep the ref current without triggering effect re-run
  useEffect(() => {
    callbackRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}