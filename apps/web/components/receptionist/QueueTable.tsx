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
  onShowQR?: (patient: Patient) => void;
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
  onShowQR,
  className,
}: QueueTableProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const active = queue.filter((p) => p.status === 'waiting' || p.status === 'serving');
  const completed = queue.filter((p) => p.status === 'done' || p.status === 'skipped');

  if (active.length === 0) {
    const handleLoadDemo = () => {
      socket.emit('seed-demo-data', {
        clinicId,
        receptionistPin: getPin(),
      });
    };

    return (
      <div className={cn('text-center py-14', className)}>
        <p className="text-base font-medium text-charcoal/70 mb-1">
          No patients in queue
        </p>
        <p className="text-xs text-charcoal/45 mb-6">
          Add a patient using the form on the left, or load demo data to try the app
        </p>
        <button
          onClick={handleLoadDemo}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-pulse-green-800 text-white hover:bg-pulse-green-900 transition-colors shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Load demo data
        </button>
        <p className="text-[10px] text-charcoal/55 mt-3">
          Adds 5 waiting patients + 1 in absent tray
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
                    <div className="flex items-center justify-end gap-1.5">
                      {onShowQR && (
                        <button
                          onClick={() => onShowQR(patient)}
                          title="Show QR for rescan"
                          className="rounded-md p-1.5 text-charcoal/70 hover:text-pulse-green-800 hover:bg-pulse-green-50 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <path d="M14 14h3v3h-3zM20 14h1M20 20h1M14 20h3" />
                          </svg>
                        </button>
                      )}
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
                    </div>
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