'use client';

import { cn } from '@/lib/utils';

interface HistoryCardProps {
  onOpen: () => void;
  className?: string;
}

export function HistoryCard({ onOpen, className }: HistoryCardProps) {
  return (
    <div className={cn('rounded-xl bg-white border border-charcoal/10 p-5', className)}>
      <h2 className="text-base font-semibold text-charcoal mb-3">
        Patient history
      </h2>
      <p className="text-xs text-charcoal/55 mb-4">
        View, search, and export past consultations by date.
      </p>
      <button
        onClick={onOpen}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal bg-[#F2EFE8] border border-charcoal/15 hover:border-charcoal/30 hover:bg-[#EAE6DC] transition-colors"
      >
        Open history
      </button>
    </div>
  );
}