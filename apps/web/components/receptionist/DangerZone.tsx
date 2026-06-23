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

type ResetState = 'idle' | 'confirming';

export function DangerZone({ socket, clinicId, getPin, className }: DangerZoneProps) {
  const [resetState, setResetState] = useState<ResetState>('idle');

  const handleFirstClick = useCallback(() => {
    setResetState('confirming');
  }, []);

  const handleConfirm = useCallback(() => {
    socket.emit('reset-queue', {
      clinicId,
      receptionistPin: getPin(),
    });
    setResetState('idle');
  }, [socket, clinicId, getPin]);

  const handleCancel = useCallback(() => {
    setResetState('idle');
  }, []);

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        resetState === 'confirming'
          ? 'border-signal-red bg-signal-red-50'
          : 'border-gray-200 bg-white',
        className
      )}
    >
      <h3 className="text-xs font-semibold text-signal-red uppercase tracking-wide mb-2">
        Danger Zone
      </h3>

      <p className="text-xs text-text-muted mb-3">
        This will clear all patients and restart token numbering from 1.
        Absent patients will be permanently skipped.
      </p>

      {resetState === 'idle' && (
        <button
          onClick={handleFirstClick}
          className={cn(
            'w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            'border border-signal-red text-signal-red',
            'hover:bg-signal-red-50 active:bg-signal-red-100'
          )}
        >
          Reset Queue &amp; Tokens
        </button>
      )}

      {resetState === 'confirming' && (
        <div className="space-y-2">
          <button
            onClick={handleConfirm}
            className={cn(
              'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
              'bg-signal-red hover:bg-signal-red-600 active:bg-signal-red-700'
            )}
          >
            ⚠️ Click again to confirm reset
          </button>
          <button
            onClick={handleCancel}
            className={cn(
              'w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-white text-charcoal border border-gray-200 hover:bg-gray-50'
            )}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}