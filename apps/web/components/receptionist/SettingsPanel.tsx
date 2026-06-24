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
  className?: string;
}

export function SettingsPanel({
  socket,
  clinicId,
  getPin,
  currentAvgTime,
  className,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    <div className={cn('rounded-xl bg-white border border-charcoal/10 overflow-hidden', className)}>
      {/* Header — clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F2EFE8]/40 transition-colors"
      >
        <h2 className="text-base font-semibold text-charcoal">Settings</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'text-charcoal/55 transition-transform',
            isOpen && 'rotate-180'
          )}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Content — collapsible */}
      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-charcoal/10 space-y-4">
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
            {isSaving && (
              <p className="mt-1 text-xs text-pulse-green-800">✓ Saved</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}