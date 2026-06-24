'use client';

import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/formatters';

interface LiveIndicatorProps {
  isConnected: boolean;
  lastUpdated: number;
  className?: string;
}

export function LiveIndicator({ isConnected, lastUpdated, className }: LiveIndicatorProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-xs', className)}>
      {isConnected ? (
        <>
          <span className="status-dot status-dot-pulse bg-pulse-green-700" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-pulse-green-800">
            Live
          </span>
        </>
      ) : (
        <>
          <span className="status-dot bg-charcoal/30" />
          <span className="text-charcoal/55">
            Disconnected · updated {formatTimeAgo(lastUpdated)}
          </span>
        </>
      )}
    </div>
  );
}