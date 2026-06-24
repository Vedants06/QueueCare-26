'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { TypedSocket } from '@/lib/socket';

interface SettingsPanelProps {
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  currentAvgTime: number;
  sessionStartedAt: number;
  onOpenHistory: () => void;
  className?: string;
}

export function SettingsPanel({
  socket,
  clinicId,
  getPin,
  currentAvgTime,
  onOpenHistory,
  className,
}: SettingsPanelProps) {
  const [avgTime, setAvgTime] = useState(String(currentAvgTime));
  const [isSaving, setIsSaving] = useState(false);

  const handleSetAvgTime = () => {
    const minutes = parseFloat(avgTime);
    if (isNaN(minutes) || minutes <= 0 || minutes > 120) return;

    setIsSaving(true);
    socket.emit('set-avg-time', { clinicId, minutes, receptionistPin: getPin() });
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 mb-2">
          Fallback Avg (min)
        </label>
        <input
          type="number"
          min="1"
          max="120"
          step="0.5"
          value={avgTime}
          onChange={(e) => setAvgTime(e.target.value)}
          onBlur={handleSetAvgTime}
          onKeyDown={(e) => e.key === 'Enter' && handleSetAvgTime()}
          className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-pulse-green-700"
        />
        <p className="mt-2 text-xs text-charcoal/55">
          Used until 3 clean consultations exist.
        </p>
      </div>

      <button
        onClick={onOpenHistory}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal bg-white border border-charcoal/15 hover:border-charcoal/30 transition-colors"
      >
        Open patient history
      </button>
    </div>
  );
}