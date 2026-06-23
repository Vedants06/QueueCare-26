'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import type { TypedSocket } from '@/lib/socket';

interface SettingsPanelProps {
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  currentAvgTime: number;
  sessionStartedAt: number;
  className?: string;
}

export function SettingsPanel({
  socket,
  clinicId,
  getPin,
  currentAvgTime,
  sessionStartedAt,
  className,
}: SettingsPanelProps) {
  const [avgTime, setAvgTime] = useState(String(currentAvgTime));
  const [isSaving, setIsSaving] = useState(false);

  const handleSetAvgTime = () => {
    const minutes = parseFloat(avgTime);
    if (isNaN(minutes) || minutes <= 0 || minutes > 120) return;

    setIsSaving(true);

    socket.emit('set-avg-time', {
      clinicId,
      minutes,
      receptionistPin: getPin(),
    });

    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className={cn('qc-card space-y-4', className)}>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        Settings
      </h3>

      {/* Average Consultation Time */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">
          Average Consultation Time
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="1"
              max="120"
              step="0.5"
              value={avgTime}
              onChange={(e) => setAvgTime(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm pr-12',
                'focus:outline-none focus:ring-2 focus:ring-clinic-blue/30 focus:border-clinic-blue'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              min
            </span>
          </div>
          <button
            onClick={handleSetAvgTime}
            disabled={isSaving}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              isSaving
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-clinic-blue hover:bg-clinic-blue-600'
            )}
          >
            {isSaving ? '✓' : 'Set'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          Used as fallback when fewer than 3 real consultations recorded
        </p>
      </div>

      {/* Session Info */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs text-text-muted">
          Session started:{' '}
          <span className="font-medium text-charcoal">
            {formatDateTime(new Date(sessionStartedAt))}
          </span>
        </p>
        <p className="text-xs text-text-muted mt-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pulse-green mr-1 align-middle" />
          PIN active for this tab
        </p>
      </div>
    </div>
  );
}