'use client';

import { cn } from '@/lib/utils';

interface SessionExpiredBannerProps {
  className?: string;
}

export function SessionExpiredBanner({ className }: SessionExpiredBannerProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-signal-red-200 bg-signal-red-50 p-6 text-center',
        className
      )}
    >
      <div className="text-3xl mb-3">🏥</div>
      <p className="text-lg font-semibold text-signal-red-700 mb-1">
        This queue session has ended
      </p>
      <p className="text-sm text-signal-red-600">
        Please visit the reception for a new token.
      </p>
    </div>
  );
}