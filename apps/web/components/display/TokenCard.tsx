'use client';

import { cn } from '@/lib/utils';
import type { WaitEstimate } from '@shared/types';

interface DisplayTokenCardProps {
  token: number;
  priority: boolean;
  waitEstimate: WaitEstimate | null;
  label?: string;
  className?: string;
}

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

function formatWaitRange(estimate: WaitEstimate): string {
  if (estimate.low === estimate.high) return `~${estimate.low} min`;
  return `~${estimate.low}–${estimate.high} min`;
}

export function DisplayTokenCard({
  token,
  priority,
  waitEstimate,
  label,
  className,
}: DisplayTokenCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 text-center transition-colors',
        priority
          ? 'bg-amber-alert-50 border-2 border-amber-alert-300 animate-pulse-slow'
          : 'bg-white/70 border border-charcoal/10',
        className
      )}
    >
      {/* Label (Next / +1 / +2) */}
      {label && (
        <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-pulse-green-800/70 mb-2">
          {label}
        </p>
      )}

      {/* Token number */}
      <p className="font-mono text-4xl md:text-5xl font-bold leading-none text-charcoal mb-2">
        {formatToken(token)}
      </p>

      {/* Wait estimate */}
      {waitEstimate && (
        <p className="text-sm text-charcoal/60">
          {formatWaitRange(waitEstimate)}
        </p>
      )}

      {/* Priority indicator */}
      {priority && (
        <p className="text-xs font-semibold text-amber-alert-700 mt-2">
          ⚡ Priority
        </p>
      )}
    </div>
  );
}