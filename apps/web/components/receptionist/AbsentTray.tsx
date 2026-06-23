'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TokenDisplay } from '@/components/shared/TokenDisplay';
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

export function AbsentTray({
  absentPatients,
  socket,
  clinicId,
  getPin,
  className,
}: AbsentTrayProps) {
  const handleReinstateFront = (token: number) => {
    socket.emit('reinstate', {
      clinicId,
      token,
      position: 'front',
      receptionistPin: getPin(),
    });
  };

  const handleReinstateBack = (token: number) => {
    socket.emit('reinstate', {
      clinicId,
      token,
      position: 'back',
      receptionistPin: getPin(),
    });
  };

  const handleSkipPermanently = (token: number) => {
    socket.emit('skip-token', {
      clinicId,
      token,
      receptionistPin: getPin(),
    });
  };

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
          <div className="rounded-lg border border-amber-alert-200 bg-amber-alert-50 p-4">
            {/* Header */}
            <h3 className="text-sm font-semibold text-amber-alert-700 uppercase tracking-wide mb-3">
              Absent Patients ({absentPatients.length})
            </h3>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-alert-200">
                    <th className="text-left py-1.5 px-2 font-medium text-amber-alert-600 text-xs uppercase tracking-wide">
                      Token
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-amber-alert-600 text-xs uppercase tracking-wide">
                      Name
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-amber-alert-600 text-xs uppercase tracking-wide hidden sm:table-cell">
                      Phone
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-amber-alert-600 text-xs uppercase tracking-wide hidden md:table-cell">
                      Absent Since
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-amber-alert-600 text-xs uppercase tracking-wide hidden md:table-cell">
                      Times
                    </th>
                    <th className="text-right py-1.5 px-2 font-medium text-amber-alert-600 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {absentPatients.map((patient) => (
                    <tr key={patient.token} className="border-b border-amber-alert-100 last:border-b-0">
                      <td className="py-2 px-2">
                        <TokenDisplay token={patient.token} size="sm" />
                      </td>
                      <td className="py-2 px-2 font-medium text-charcoal">
                        {patient.name}
                      </td>
                      <td className="py-2 px-2 text-text-muted hidden sm:table-cell">
                        {patient.phone || '—'}
                      </td>
                      <td className="py-2 px-2 text-text-muted hidden md:table-cell">
                        {patient.absentAt ? formatTimeAgo(patient.absentAt) : '—'}
                      </td>
                      <td className="py-2 px-2 text-text-muted hidden md:table-cell">
                        {patient.absentCount}×
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleReinstateFront(patient.token)}
                            className={cn(
                              'rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                              'bg-pulse-green-50 text-pulse-green-700 border border-pulse-green-200',
                              'hover:bg-pulse-green-100'
                            )}
                          >
                            ↑ To Front
                          </button>
                          <button
                            onClick={() => handleReinstateBack(patient.token)}
                            className={cn(
                              'rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                              'bg-clinic-blue-50 text-clinic-blue-700 border border-clinic-blue-200',
                              'hover:bg-clinic-blue-100'
                            )}
                          >
                            ↓ To Back
                          </button>
                          <button
                            onClick={() => handleSkipPermanently(patient.token)}
                            className={cn(
                              'rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                              'text-text-muted hover:text-signal-red hover:bg-signal-red-50'
                            )}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}