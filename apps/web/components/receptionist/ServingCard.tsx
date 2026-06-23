'use client';

import { cn } from '@/lib/utils';
import { TokenDisplay } from '@/components/shared/TokenDisplay';
import { useStopwatch } from '@/hooks/useStopwatch';
import type { Patient } from '@shared/types';
import type { TypedSocket } from '@/lib/socket';

interface ServingCardProps {
  patient: Patient | null;
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  className?: string;
}

export function ServingCard({ patient, socket, clinicId, getPin, className }: ServingCardProps) {
  // Only show stopwatch for actively serving patient
  const activePatient = patient?.status === 'serving' ? patient : null;
  const { formatted: elapsed } = useStopwatch(activePatient?.calledAt);

  if (!activePatient) {
    return (
      <div className={cn('qc-card text-center', className)}>
        <p className="text-sm text-text-muted">
          No patient currently being served
        </p>
        <p className="text-xs text-text-muted mt-1">
          Click &quot;Call Next&quot; to begin
        </p>
      </div>
    );
  }

  const handleMarkDone = () => {
    socket.emit('mark-done', {
      clinicId,
      token: activePatient.token,
      receptionistPin: getPin(),
    });
  };

  const handleMarkAbsent = () => {
    socket.emit('mark-absent', {
      clinicId,
      token: activePatient.token,
      receptionistPin: getPin(),
    });
  };

  const handleRecall = () => {
    socket.emit('recall-token', {
      clinicId,
      receptionistPin: getPin(),
    });
  };

  return (
    <div className={cn('qc-card border-pulse-green', className)}>
      <p className="text-xs font-medium text-pulse-green-600 uppercase tracking-wide mb-2">
        Now Serving
      </p>

      <div className="flex items-center justify-between mb-3">
        <div>
          <TokenDisplay token={activePatient.token} size="md" />
          <p className="text-sm font-medium text-charcoal mt-1">{activePatient.name}</p>
          {activePatient.phone && (
            <p className="text-xs text-text-muted">{activePatient.phone}</p>
          )}
        </div>

        {/* Stopwatch */}
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-charcoal">
            {elapsed}
          </p>
          <p className="text-xs text-text-muted">elapsed</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleMarkDone}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors',
            'bg-pulse-green hover:bg-pulse-green-600 active:bg-pulse-green-700'
          )}
        >
          Mark as Done
        </button>
        <button
          onClick={handleMarkAbsent}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'bg-amber-alert-50 text-amber-alert-700 border border-amber-alert-200',
            'hover:bg-amber-alert-100 active:bg-amber-alert-200'
          )}
        >
          Absent
        </button>
        <button
          onClick={handleRecall}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'bg-gray-100 text-charcoal border border-gray-200',
            'hover:bg-gray-200 active:bg-gray-300'
          )}
        >
          Recall
        </button>
      </div>
    </div>
  );
}