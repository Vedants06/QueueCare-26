'use client';

import { cn } from '@/lib/utils';
import { useStopwatch } from '@/hooks/useStopwatch';
import { formatDateTime } from '@/lib/formatters';
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

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `•••• ${phone.slice(-4)}`;
}

export function ServingCard({
  patient,
  currentToken,
  socket,
  clinicId,
  getPin,
  className,
}: ServingCardProps) {
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
      <div className={cn('text-center py-6', className)}>
        <p className="text-sm text-charcoal/45">No active consultation</p>
        <p className="text-xs text-charcoal/35 mt-1">
          Click Call Next to begin
        </p>
      </div>
    );
  }

  const calledTime = patient.calledAt
    ? new Date(patient.calledAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

  return (
    <div className={cn('', className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
                    <p className="font-mono text-4xl font-bold text-charcoal leading-none">
            {formatToken(patient.token)}
          </p>
          <p className="text-sm font-semibold text-charcoal mt-3">
            {patient.name}
          </p>
          {patient.phone && (
            <p className="text-xs text-charcoal/55 mt-0.5">
              {maskPhone(patient.phone)} · since {calledTime}
            </p>
          )}
        </div>

        <p className="font-mono text-base font-semibold text-pulse-green-800 mt-2">
          {elapsed}
        </p>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() =>
            socket.emit('mark-done', {
              clinicId,
              token: patient.token,
              receptionistPin: getPin(),
            })
          }
          className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold bg-pulse-green-800 text-white hover:bg-pulse-green-900 transition-colors"
        >
          Mark done
        </button>
        <button
          onClick={() =>
            socket.emit('mark-absent', {
              clinicId,
              token: patient.token,
              receptionistPin: getPin(),
            })
          }
          className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold bg-amber-alert text-charcoal hover:bg-amber-alert-400 transition-colors"
        >
          Mark absent
        </button>
        <button
          onClick={() =>
            socket.emit('recall-token', {
              clinicId,
              receptionistPin: getPin(),
            })
          }
          className="rounded-lg px-3 py-2 text-sm font-medium bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30 transition-colors"
        >
          Recall
        </button>
      </div>
    </div>
  );
}