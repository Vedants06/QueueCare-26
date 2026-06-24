'use client';

import { cn } from '@/lib/utils';

interface PausedBannerProps {
  className?: string;
}

export function PausedBanner({ className }: PausedBannerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-amber-alert-300 bg-amber-alert-50 p-4 text-center',
        className
      )}
    >
      <p className="text-sm font-medium text-amber-alert-700">
        ⏸ Queue is temporarily paused. Please wait.
      </p>
    </div>
  );
}