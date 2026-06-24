'use client';

import { cn } from '@/lib/utils';
import { formatMinutes } from '@/lib/formatters';
import type { AnalyticsData } from '@shared/types';

interface AnalyticsStripProps {
  analytics: AnalyticsData;
  className?: string;
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 mb-1">
        {label}
      </p>
      <p className="font-mono text-2xl font-bold text-charcoal leading-none">
        {value}
      </p>
    </div>
  );
}

export function AnalyticsStrip({ analytics, className }: AnalyticsStripProps) {
  return (
    <div className={cn('', className)}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <Metric label="Served" value={analytics.servedToday} />
        <Metric label="Skipped" value={analytics.skippedToday} />
        <Metric label="Absent" value={analytics.absentToday} />
        <Metric label="Reinstated" value={analytics.reinstatedToday} />
        <Metric
          label="Avg consult"
          value={
            analytics.dataPoints > 0
              ? formatMinutes(analytics.avgConsultReal)
              : formatMinutes(analytics.avgConsultFallback)
          }
        />
        <Metric label="Data points" value={analytics.dataPoints} />
        <Metric label="Outliers" value={analytics.outliersExcluded} />
        <Metric label="Throughput" value={`${analytics.throughputPerHour}/hr`} />
      </div>
    </div>
  );
}