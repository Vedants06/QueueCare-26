'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/formatters';
import type { Patient } from '@shared/types';
import type { TypedSocket } from '@/lib/socket';

interface AbsentTrayProps {
  absentPatients: Patient[];
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

export function AbsentTray({
  absentPatients,
  socket,
  clinicId,
  getPin,
  className,
}: AbsentTrayProps) {
  return (
    <AnimatePresence>
      {absentPatients.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={cn('overflow-hidden', className)}
        >
          <div className="rounded-xl border border-amber-alert bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-charcoal">
                Absent tray
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">
                {absentPatients.length} to handle
              </span>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10">
                  <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 w-16">Token</th>
                  <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">Patient</th>
                  <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 hidden sm:table-cell">Phone</th>
                  <th className="text-left py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">Absent</th>
                  <th className="text-right py-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">Actions</th>
                </tr>
              </thead>
              <tbody>
                {absentPatients.map((patient) => (
                  <tr key={patient.token} className="border-b border-charcoal/5 last:border-b-0">
                    <td className="py-3">
                      <span className="font-mono text-sm font-semibold text-charcoal">
                        {formatToken(patient.token)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-charcoal">{patient.name}</span>
                      {patient.absentCount > 1 && (
                        <span className="ml-2 text-[10px] text-charcoal/50">
                          ({patient.absentCount}×)
                        </span>
                      )}
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      <span className="text-sm text-charcoal/60">
                        {patient.phone ? maskPhone(patient.phone) : '—'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-charcoal/60">
                        {patient.absentAt && formatTimeAgo(patient.absentAt)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            socket.emit('reinstate', {
                              clinicId,
                              token: patient.token,
                              position: 'front',
                              receptionistPin: getPin(),
                            })
                          }
                          className="rounded-md px-2.5 py-1 text-xs font-semibold bg-charcoal text-white hover:bg-charcoal/85 transition-colors"
                        >
                          Reinstate front
                        </button>
                        <button
                          onClick={() =>
                            socket.emit('reinstate', {
                              clinicId,
                              token: patient.token,
                              position: 'back',
                              receptionistPin: getPin(),
                            })
                          }
                          className="rounded-md px-2.5 py-1 text-xs font-medium bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30 transition-colors"
                        >
                          Reinstate back
                        </button>
                        <button
                          onClick={() =>
                            socket.emit('skip-token', {
                              clinicId,
                              token: patient.token,
                              receptionistPin: getPin(),
                            })
                          }
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-signal-red border border-signal-red-200 hover:bg-signal-red-50 transition-colors"
                        >
                          Skip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}