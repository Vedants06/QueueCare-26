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
    <div className={cn('flex items-center justify-center gap-2 text-sm', className)}>
      {isConnected ? (
        <>
          <span className="status-dot status-dot-pulse bg-pulse-green" />
          <span className="text-pulse-green-700 font-medium">Live</span>
        </>
      ) : (
        <>
          <span className="status-dot bg-gray-400" />
          <span className="text-text-muted">
            Disconnected — {formatTimeAgo(lastUpdated)}
          </span>
        </>
      )}
    </div>
  );
}