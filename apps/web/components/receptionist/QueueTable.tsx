'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TokenDisplay } from '@/components/shared/TokenDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { formatWaitRange } from '@/lib/waitTime';
import type { Patient, WaitEstimate } from '@shared/types';
import type { TypedSocket } from '@/lib/socket';

interface QueueTableProps {
  queue: Patient[];
  getWaitEstimate: (token: number) => WaitEstimate | null;
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  className?: string;
}

export function QueueTable({
  queue,
  getWaitEstimate,
  socket,
  clinicId,
  getPin,
  className,
}: QueueTableProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  // Split queue into active and completed
  const activePatients = queue.filter(
    (p) => p.status === 'waiting' || p.status === 'serving'
  );
  const completedPatients = queue.filter(
    (p) => p.status === 'done' || p.status === 'skipped'
  );

  const handleSkip = (token: number) => {
    socket.emit('skip-token', {
      clinicId,
      token,
      receptionistPin: getPin(),
    });
  };

  if (activePatients.length === 0 && completedPatients.length === 0) {
    return (
      <div className={cn('qc-card text-center py-8', className)}>
        <p className="text-lg text-text-muted mb-1">No patients yet</p>
        <p className="text-sm text-text-muted">
          Add the first patient using the form
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Active patients table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-text-muted text-xs uppercase tracking-wide">Token</th>
              <th className="text-left py-2 px-2 font-medium text-text-muted text-xs uppercase tracking-wide">Name</th>
              <th className="text-left py-2 px-2 font-medium text-text-muted text-xs uppercase tracking-wide hidden sm:table-cell">Phone</th>
              <th className="text-left py-2 px-2 font-medium text-text-muted text-xs uppercase tracking-wide">Status</th>
              <th className="text-left py-2 px-2 font-medium text-text-muted text-xs uppercase tracking-wide hidden md:table-cell">Wait</th>
              <th className="text-right py-2 px-2 font-medium text-text-muted text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activePatients.map((patient) => {
              const waitEstimate =
                patient.status === 'waiting'
                  ? getWaitEstimate(patient.token)
                  : null;

              return (
                <tr
                  key={patient.token}
                  className={cn(
                    'border-b border-gray-100 transition-colors',
                    patient.status === 'serving' && 'bg-pulse-green-50 border-l-2 border-l-pulse-green',
                    patient.status === 'waiting' && patient.priority && 'border-l-2 border-l-amber-alert'
                  )}
                >
                  {/* Token */}
                  <td className="py-2.5 px-2">
                    <TokenDisplay token={patient.token} size="sm" />
                  </td>

                  {/* Name + Priority */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-charcoal">{patient.name}</span>
                      {patient.priority && <PriorityBadge />}
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-2.5 px-2 text-text-muted hidden sm:table-cell">
                    {patient.phone || '—'}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-2">
                    <StatusBadge status={patient.status} />
                  </td>

                  {/* Wait estimate */}
                  <td className="py-2.5 px-2 text-text-muted hidden md:table-cell">
                    {waitEstimate ? formatWaitRange(waitEstimate) : '—'}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-2 text-right">
                    {patient.status === 'waiting' && (
                      <button
                        onClick={() => handleSkip(patient.token)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          'text-text-muted hover:text-signal-red hover:bg-signal-red-50'
                        )}
                      >
                        Skip
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Completed patients (collapsible) */}
      {completedPatients.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-text-muted hover:text-charcoal transition-colors py-1"
          >
            {showCompleted ? '▾ Hide' : '▸ Show'} {completedPatients.length} completed patient{completedPatients.length !== 1 ? 's' : ''}
          </button>

          {showCompleted && (
            <div className="overflow-x-auto mt-1">
              <table className="w-full text-sm opacity-60">
                <tbody>
                  {completedPatients.map((patient) => (
                    <tr
                      key={patient.token}
                      className="border-b border-gray-50"
                    >
                      <td className="py-1.5 px-2">
                        <TokenDisplay token={patient.token} size="sm" />
                      </td>
                      <td className="py-1.5 px-2 text-text-muted">
                        {patient.name}
                      </td>
                      <td className="py-1.5 px-2 hidden sm:table-cell text-text-muted">
                        {patient.phone || '—'}
                      </td>
                      <td className="py-1.5 px-2">
                        <StatusBadge status={patient.status} />
                      </td>
                      <td className="py-1.5 px-2 text-text-muted hidden md:table-cell">—</td>
                      <td className="py-1.5 px-2 text-right">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}