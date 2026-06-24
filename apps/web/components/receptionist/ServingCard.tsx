'use client';

import { cn } from '@/lib/utils';
import { useStopwatch } from '@/hooks/useStopwatch';
import type { Patient } from '@shared/types';
import type { TypedSocket } from '@/lib/socket';

interface ServingCardProps {
  patient: Patient | null;
  currentToken: number | null;
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  className?: string;
}

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

export function ServingCard({
  patient,
  currentToken,
  socket,
  clinicId,
  getPin,
  className,
}: ServingCardProps) {
  // Triple guard: must have currentToken AND patient AND patient must be serving
  const isActivelyServing =
    currentToken !== null &&
    patient !== null &&
    patient.status === 'serving' &&
    patient.token === currentToken;

  const { formatted: elapsed } = useStopwatch(
    isActivelyServing ? patient.calledAt : undefined
  );

  if (!isActivelyServing) {
    return (
      <div
        className={cn(
          'rounded-2xl bg-white/60 border border-charcoal/10 p-6 text-center',
          className
        )}
      >
        <p className="text-sm text-charcoal/55">
          No patient currently being served
        </p>
        <p className="text-xs text-charcoal/40 mt-1">
          Click &quot;Call Next&quot; to begin
        </p>
      </div>
    );
  }

  const handleMarkDone = () => {
    socket.emit('mark-done', {
      clinicId,
      token: patient.token,
      receptionistPin: getPin(),
    });
  };

  const handleMarkAbsent = () => {
    socket.emit('mark-absent', {
      clinicId,
      token: patient.token,
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
    <div
      className={cn(
        'rounded-2xl bg-white/80 border-2 border-pulse-green-700/30 p-6',
        className
      )}
    >
      <p className="text-xs font-semibold text-pulse-green-800 uppercase tracking-[0.18em] mb-4">
        Now Serving
      </p>

      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-mono text-3xl font-bold text-charcoal leading-none">
            #{formatToken(patient.token)}
          </p>
          <p className="text-base font-medium text-charcoal mt-2">
            {patient.name}
          </p>
          {patient.phone && (
            <p className="text-xs text-charcoal/55 mt-0.5">{patient.phone}</p>
          )}
        </div>

        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-charcoal">
            {elapsed}
          </p>
          <p className="text-xs text-charcoal/55">elapsed</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleMarkDone}
          className={cn(
            'flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors',
            'bg-pulse-green-800 hover:bg-pulse-green-900'
          )}
        >
          Mark as Done
        </button>
        <button
          onClick={handleMarkAbsent}
          className={cn(
            'rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
            'bg-amber-alert-50 text-amber-alert-700 border border-amber-alert-200',
            'hover:bg-amber-alert-100'
          )}
        >
          Absent
        </button>
        <button
          onClick={handleRecall}
          className={cn(
            'rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
            'bg-white text-charcoal border border-charcoal/15',
            'hover:border-charcoal/30'
          )}
        >
          Recall
        </button>
      </div>
    </div>
  );
}