'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TypedSocket } from '@/lib/socket';

interface DangerZoneProps {
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  className?: string;
}

export function DangerZone({ socket, clinicId, getPin, className }: DangerZoneProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = useCallback(() => {
    socket.emit('reset-queue', { clinicId, receptionistPin: getPin() });
    setConfirming(false);
  }, [socket, clinicId, getPin]);

  return (
    <div className={cn('', className)}>
      <p className="text-xs text-charcoal/55 mb-4">
        Resetting clears the queue and the absent tray, and starts a new session.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold border border-signal-red text-signal-red hover:bg-signal-red-50 transition-colors"
        >
          Reset queue
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleConfirm}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-signal-red hover:bg-signal-red-600 transition-colors"
          >
            ⚠ Confirm reset
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}