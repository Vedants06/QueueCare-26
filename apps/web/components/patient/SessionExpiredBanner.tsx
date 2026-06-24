'use client';

import { cn } from '@/lib/utils';

interface SessionExpiredBannerProps {
  className?: string;
}

export function SessionExpiredBanner({ className }: SessionExpiredBannerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-signal-red-200 bg-signal-red-50 p-6 text-center',
        className
      )}
    >
      <p className="text-base font-semibold text-signal-red-700 mb-1">
        This queue session has ended.
      </p>
      <p className="text-sm text-signal-red-700/80">
        Please visit reception for a new token.
      </p>
    </div>
  );
}