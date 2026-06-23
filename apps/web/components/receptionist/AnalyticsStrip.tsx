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
  color?: string;
}

function Metric({ label, value, color }: MetricProps) {
  return (
    <div className="flex flex-col">
      <span className={cn('text-xl font-semibold', color || 'text-charcoal')}>
        {value}
      </span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

export function AnalyticsStrip({ analytics, className }: AnalyticsStripProps) {
  return (
    <div className={cn('qc-card', className)}>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Today&apos;s Analytics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Served"
          value={analytics.servedToday}
          color="text-pulse-green"
        />
        <Metric
          label="Skipped"
          value={analytics.skippedToday}
          color="text-text-muted"
        />
        <Metric
          label="Absent"
          value={analytics.absentToday}
          color="text-amber-alert"
        />
        <Metric
          label="Reinstated"
          value={analytics.reinstatedToday}
          color="text-clinic-blue"
        />
        <Metric
          label="Avg Consult"
          value={
            analytics.dataPoints > 0
              ? formatMinutes(analytics.avgConsultReal)
              : formatMinutes(analytics.avgConsultFallback)
          }
        />
        <Metric
          label="Data Points"
          value={analytics.dataPoints}
        />
        <Metric
          label="Outliers"
          value={analytics.outliersExcluded}
          color={analytics.outliersExcluded > 0 ? 'text-amber-alert' : 'text-text-muted'}
        />
        <Metric
          label="Throughput"
          value={`${analytics.throughputPerHour}/hr`}
        />
      </div>

      {/* Data source indicator */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-text-muted">
          {analytics.dataPoints >= 3 ? (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-pulse-green mr-1.5 align-middle" />
              Estimates based on {analytics.dataPoints} real consultation{analytics.dataPoints !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-alert mr-1.5 align-middle" />
              Using receptionist estimate ({formatMinutes(analytics.avgConsultFallback)}) — need {3 - analytics.dataPoints} more data point{3 - analytics.dataPoints !== 1 ? 's' : ''}
            </>
          )}
        </p>
      </div>
    </div>
  );
}