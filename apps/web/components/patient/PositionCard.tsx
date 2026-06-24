'use client';

import { cn } from '@/lib/utils';
import type { WaitEstimate } from '@shared/types';

interface PositionCardProps {
  position: number;
  waitEstimate: WaitEstimate | null;
  className?: string;
}

export function PositionCard({ position, waitEstimate, className }: PositionCardProps) {
  const ahead = Math.max(0, position - 1);
  const progress = waitEstimate
    ? Math.max(0.1, Math.min(1, 1 - position / 15))
    : 0;

  return (
    <div className={cn('rounded-xl bg-white border border-charcoal/10 p-6', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/45 mb-1">
            Ahead of you
          </p>
          <p className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold text-charcoal">
              {ahead}
            </span>
            <span className="text-sm text-charcoal/55">patient{ahead !== 1 ? 's' : ''}</span>
          </p>
        </div>

        {waitEstimate && (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/45 mb-1">
              Estimated wait
            </p>
            <p className="flex items-baseline gap-1 justify-end">
              <span className="font-mono text-3xl font-bold text-charcoal">
                ~{waitEstimate.low}–{waitEstimate.high}
              </span>
            </p>
            <p className="text-xs text-pulse-green-800 text-right">
              minutes
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-charcoal/10 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-charcoal transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {waitEstimate && (
        <p className="text-xs text-charcoal/55 text-center">
          {waitEstimate.isRealData ? (
            <>
              Based on {waitEstimate.dataPoints} real consultation
              {waitEstimate.dataPoints !== 1 ? 's' : ''} · confidence margin ±
              {Math.round(waitEstimate.confidenceMargin * 100)}%
            </>
          ) : (
            <>
              Using receptionist estimate · {waitEstimate.dataPoints} of 3 data
              points collected
            </>
          )}
        </p>
      )}
    </div>
  );
}