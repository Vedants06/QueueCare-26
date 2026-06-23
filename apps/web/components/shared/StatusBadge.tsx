'use client';

import { cn } from '@/lib/utils';
import type { PatientStatus } from '@shared/types';

interface StatusBadgeProps {
  status: PatientStatus;
  className?: string;
}

const statusConfig: Record<
  PatientStatus,
  { label: string; bgClass: string; textClass: string; dotClass?: string; dotPulse?: boolean }
> = {
  waiting: {
    label: 'Waiting',
    bgClass: 'bg-clinic-blue-50',
    textClass: 'text-clinic-blue-700',
    dotClass: 'bg-clinic-blue',
  },
  serving: {
    label: 'Being seen',
    bgClass: 'bg-pulse-green-50',
    textClass: 'text-pulse-green-700',
    dotClass: 'bg-pulse-green',
    dotPulse: true,
  },
  done: {
    label: 'Done',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
  },
  skipped: {
    label: 'Skipped',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-400 line-through',
  },
  absent: {
    label: 'Absent',
    bgClass: 'bg-amber-alert-50',
    textClass: 'text-amber-alert-700',
    dotClass: 'bg-amber-alert',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {config.dotClass && (
        <span
          className={cn(
            'status-dot',
            config.dotClass,
            config.dotPulse && 'status-dot-pulse'
          )}
        />
      )}
      {config.label}
    </span>
  );
}