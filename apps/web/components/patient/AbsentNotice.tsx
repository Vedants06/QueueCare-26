'use client';

import { cn } from '@/lib/utils';

interface AbsentNoticeProps {
  className?: string;
}

export function AbsentNotice({ className }: AbsentNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-amber-alert-300 bg-amber-alert-50 p-5',
        className
      )}
    >
      <p className="text-sm font-semibold text-amber-alert-700 mb-1">
        You were called but were not present.
      </p>
      <p className="text-sm text-amber-alert-700/80">
        Please return to the reception desk.
      </p>
    </div>
  );
}