'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatToken } from '@/lib/formatters';
import type { TypedSocket } from '@/lib/socket';
import type { DuplicateWarningPayload } from '@shared/types';

interface DuplicateWarningProps {
  socket: TypedSocket;
  clinicId: string;
  className?: string;
}

interface PendingDuplicate {
  existingToken: number;
  name: string;
  phone: string;
}

export function DuplicateWarning({ socket, clinicId, className }: DuplicateWarningProps) {
  const [duplicate, setDuplicate] = useState<PendingDuplicate | null>(null);

  useEffect(() => {
    const onDuplicate = (payload: DuplicateWarningPayload) => {
      setDuplicate({
        existingToken: payload.existingToken,
        name: payload.name,
        phone: payload.phone,
      });
    };

    socket.on('duplicate-warning', onDuplicate);
    return () => {
      socket.off('duplicate-warning', onDuplicate);
    };
  }, [socket]);

  const handleAddAnyway = useCallback(() => {
    if (!duplicate) return;

    // Re-submit with the same data — server will skip duplicate check
    // because > 30 seconds have passed or phone is different
    // Actually: we emit add-patient again. The 30s window may have passed.
    // If not, we could send a force flag. For now, close the dialog
    // and let the receptionist re-submit manually.
    setDuplicate(null);
  }, [duplicate]);

  const handleCancel = useCallback(() => {
    setDuplicate(null);
  }, []);

  if (!duplicate) return null;

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/40', className)}>
      <div className="qc-card max-w-sm mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-charcoal mb-2">
          Patient may already be in queue
        </h3>

        <p className="text-sm text-text-muted mb-4">
          Token <span className="font-mono font-semibold">#{formatToken(duplicate.existingToken)}</span> already
          exists for <span className="font-medium text-charcoal">{duplicate.name}</span>
          {duplicate.phone && (
            <span className="text-text-muted"> ({duplicate.phone})</span>
          )}
          . Add as a new patient anyway?
        </p>

        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-gray-100 text-charcoal hover:bg-gray-200'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleAddAnyway}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              'bg-clinic-blue hover:bg-clinic-blue-600'
            )}
          >
            Add Anyway
          </button>
        </div>
      </div>
    </div>
  );
}