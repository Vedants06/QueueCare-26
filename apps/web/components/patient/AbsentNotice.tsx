'use client';

import { cn } from '@/lib/utils';

interface AbsentNoticeProps {
  className?: string;
}

export function AbsentNotice({ className }: AbsentNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-amber-alert-200 bg-amber-alert-50 p-4 text-center',
        className
      )}
    >
      <p className="text-lg font-semibold text-amber-alert-700 mb-1">
        You were called but were not present
      </p>
      <p className="text-sm text-amber-alert-600">
        Please return to the reception desk.
      </p>
    </div>
  );
}