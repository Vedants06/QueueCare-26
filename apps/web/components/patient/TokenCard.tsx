'use client';

import { cn } from '@/lib/utils';
import { TokenDisplay } from '@/components/shared/TokenDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { PatientStatus } from '@shared/types';

interface TokenCardProps {
  token: number;
  name: string;
  status: PatientStatus;
  className?: string;
}

export function TokenCard({ token, name, status, className }: TokenCardProps) {
  return (
    <div
      className={cn(
        'qc-card text-center',
        status === 'serving' && 'border-pulse-green bg-pulse-green-50',
        status === 'absent' && 'border-amber-alert bg-amber-alert-50',
        className
      )}
    >
      <TokenDisplay token={token} size="xl" className="mb-2" />
      <p className="text-lg font-medium text-charcoal mb-2">{name}</p>
      <StatusBadge status={status} />
    </div>
  );
}