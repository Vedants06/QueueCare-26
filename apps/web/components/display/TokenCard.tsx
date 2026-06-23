'use client';

import { cn } from '@/lib/utils';
import { formatToken } from '@/lib/formatters';
import type { WaitEstimate } from '@shared/types';
import { formatWaitRange } from '@/lib/waitTime';

interface DisplayTokenCardProps {
  token: number;
  priority: boolean;
  waitEstimate: WaitEstimate | null;
  className?: string;
}

export function DisplayTokenCard({ token, priority, waitEstimate, className }: DisplayTokenCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 text-center transition-colors',
        priority
          ? 'border-amber-alert bg-amber-alert/10 animate-pulse-slow'
          : 'border-gray-700 bg-gray-800/50',
        className
      )}
    >
      {/* Token number */}
      <p className="token-number text-3xl text-white mb-1">
        <span className="text-gray-500">#</span>
        {formatToken(token)}
      </p>

      {/* Wait estimate */}
      {waitEstimate && (
        <p className="text-sm text-gray-400">
          {formatWaitRange(waitEstimate)}
        </p>
      )}

      {/* Priority indicator */}
      {priority && (
        <p className="text-xs text-amber-alert mt-1">⚡ Priority</p>
      )}
    </div>
  );
}