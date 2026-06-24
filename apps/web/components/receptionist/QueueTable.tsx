'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
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

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `•••• ${phone.slice(-4)}`;
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

  const active = queue.filter((p) => p.status === 'waiting' || p.status === 'serving');
  const completed = queue.filter((p) => p.status === 'done' || p.status === 'skipped');

  if (active.length === 0) {
    return (
      <div className={cn('text-center py-16', className)}>
        <p className="text-sm text-charcoal/45 mb-1">No patients in queue</p>
        <p className="text-xs text-charcoal/35">
          Add a patient using the form on the left
        </p>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-charcoal/10">
            <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 w-16">Token</th>
            <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">Patient</th>
            <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 hidden sm:table-cell">Phone</th>
            <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">Wait</th>
            <th className="text-right py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">Actions</th>
          </tr>
        </thead>
        <tbody>
          {active.map((patient) => {
            const wait = patient.status === 'waiting' ? getWaitEstimate(patient.token) : null;
            const isServing = patient.status === 'serving';

            return (
              <tr
                key={patient.token}
                className={cn(
                  'border-b border-charcoal/5',
                  isServing && 'bg-amber-alert-50/60'
                )}
              >
                <td className="py-3">
                  <span className="font-mono text-sm font-semibold text-charcoal">
                    {formatToken(patient.token)}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-charcoal">{patient.name}</span>
                    {isServing && (
                      <span className="rounded-md bg-charcoal text-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                        Serving
                      </span>
                    )}
                    {!isServing && patient.priority && (
                      <span className="rounded-md bg-amber-alert text-charcoal px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                        Priority
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 hidden sm:table-cell">
                  <span className="text-sm text-charcoal/60">
                    {patient.phone ? maskPhone(patient.phone) : '—'}
                  </span>
                </td>
                <td className="py-3">
                  <span className="font-mono text-xs text-charcoal/60">
                    {isServing && patient.calledAt
                      ? new Date(Date.now() - patient.calledAt).toISOString().substr(14, 5)
                      : wait
                      ? formatWaitRange(wait)
                      : '—'}
                  </span>
                </td>
                <td className="py-3 text-right">
                  {patient.status === 'waiting' ? (
                    <button
                      onClick={() =>
                        socket.emit('skip-token', {
                          clinicId,
                          token: patient.token,
                          receptionistPin: getPin(),
                        })
                      }
                      className="rounded-md px-3 py-1 text-xs font-medium text-charcoal/60 border border-charcoal/15 hover:border-charcoal/30 hover:text-charcoal transition-colors"
                    >
                      Skip
                    </button>
                  ) : (
                    <span className="text-xs text-charcoal/45">serving</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Completed (collapsible) */}
      {completed.length > 0 && (
        <div className="mt-4 pt-3 border-t border-charcoal/10">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-charcoal/55 hover:text-charcoal transition-colors"
          >
            {showCompleted ? '▾' : '▸'} Done &amp; skipped today ({completed.length})
          </button>

          {showCompleted && (
            <table className="w-full mt-2 opacity-60">
              <tbody>
                {completed.map((patient) => (
                  <tr key={patient.token}>
                    <td className="py-1.5 w-16">
                      <span className="font-mono text-xs font-semibold text-charcoal">
                        {formatToken(patient.token)}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <span
                        className={cn(
                          'text-xs text-charcoal',
                          patient.status === 'skipped' && 'line-through'
                        )}
                      >
                        {patient.name}
                      </span>
                    </td>
                    <td className="py-1.5 text-right">
                      <span className="text-[10px] uppercase tracking-wider text-charcoal/50">
                        {patient.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}