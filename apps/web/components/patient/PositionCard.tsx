'use client';

import { cn } from '@/lib/utils';
import type { WaitEstimate } from '@shared/types';
import { formatWaitRange, getDataSourceLabel } from '@/lib/waitTime';

interface PositionCardProps {
  position: number;
  waitEstimate: WaitEstimate | null;
  className?: string;
}

export function PositionCard({ position, waitEstimate, className }: PositionCardProps) {
  const isNext = position === 1;

  return (
    <div
      className={cn(
        'qc-card text-center',
        isNext && 'border-pulse-green bg-pulse-green-50',
        className
      )}
    >
      {/* Position */}
      <p
        className={cn(
          'text-2xl font-semibold mb-1',
          isNext ? 'text-pulse-green-700' : 'text-charcoal'
        )}
      >
        {isNext ? "You're next!" : `${position - 1} patient${position - 1 !== 1 ? 's' : ''} ahead`}
      </p>

      {/* Wait estimate */}
      {waitEstimate && (
        <>
          <p className="text-3xl font-bold text-charcoal mb-1">
            {formatWaitRange(waitEstimate)}
          </p>
          <p className="text-sm text-text-muted">
            {getDataSourceLabel(waitEstimate)}
          </p>
        </>
      )}
    </div>
  );
}