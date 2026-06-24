'use client';

import { cn } from '@/lib/utils';
import type { PatientStatus } from '@shared/types';

interface TokenCardProps {
  token: number;
  name: string;
  status: PatientStatus;
  className?: string;
}

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

const statusLabel: Record<PatientStatus, string> = {
  waiting: 'Waiting',
  serving: 'Being seen',
  done: 'Completed',
  skipped: 'Skipped',
  absent: 'Marked absent',
};

export function TokenCard({ token, name, status, className }: TokenCardProps) {
  return (
    <div className={cn('rounded-xl bg-white border border-charcoal/10 p-6 text-center', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/45 mb-3">
        Your Token
      </p>

      <p className="font-mono text-7xl font-bold text-charcoal leading-none mb-4">
        {formatToken(token)}
      </p>

      <div className="h-px bg-charcoal/10 mb-4" />

      <p className="text-lg font-medium text-charcoal mb-3">{name}</p>

      <span className="inline-block rounded-md border border-charcoal/15 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal/65">
        {statusLabel[status]}
      </span>
    </div>
  );
}