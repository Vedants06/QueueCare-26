'use client';

import { cn } from '@/lib/utils';
import { formatMinutes } from '@/lib/formatters';
import type { AnalyticsData } from '@shared/types';

interface StatsBarProps {
  analytics: AnalyticsData;
  waitingCount: number;
  absentCount: number;
  className?: string;
}

interface StatProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  accent?: 'green' | 'amber' | 'muted';
}

function Stat({ label, value, highlight, accent = 'muted' }: StatProps) {
  const accentClass =
    accent === 'green'
      ? 'text-pulse-green-800'
      : accent === 'amber'
      ? 'text-amber-alert-700'
      : 'text-charcoal';

  return (
    <div className="flex flex-col">
      <span
        className={cn(
          'font-mono text-lg leading-none mb-1',
          highlight ? 'font-bold' : 'font-semibold',
          accentClass
        )}
      >
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/50">
        {label}
      </span>
    </div>
  );
}

export function StatsBar({ analytics, waitingCount, absentCount, className }: StatsBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-x-6 gap-y-3 flex-wrap',
        className
      )}
    >
      <Stat label="Waiting" value={waitingCount} highlight accent="green" />
      <Stat label="Served" value={analytics.servedToday} accent="green" />
      <Stat label="Absent" value={absentCount} accent={absentCount > 0 ? 'amber' : 'muted'} />
      <Stat
        label="Avg consult"
        value={
          analytics.dataPoints > 0
            ? formatMinutes(analytics.avgConsultReal)
            : formatMinutes(analytics.avgConsultFallback)
        }
      />
      <Stat label="Throughput" value={`${analytics.throughputPerHour}/hr`} />
    </div>
  );
}