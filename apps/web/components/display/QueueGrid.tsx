'use client';

import { cn } from '@/lib/utils';
import { DisplayTokenCard } from '@/components/display/TokenCard';
import type { Patient, WaitEstimate } from '@shared/types';

interface QueueGridProps {
  waitingPatients: Patient[];
  getWaitEstimate: (token: number) => WaitEstimate | null;
  className?: string;
}

const MAX_VISIBLE = 8;

const LABELS = ['Next', '+1', '+2', '+3', '+4', '+5', '+6', '+7'];

export function QueueGrid({ waitingPatients, getWaitEstimate, className }: QueueGridProps) {
  const visible = waitingPatients.slice(0, MAX_VISIBLE);
  const overflow = waitingPatients.length - MAX_VISIBLE;

  return (
    <div className={cn('flex flex-col', className)}>
      <p className="text-sm md:text-base uppercase tracking-[0.3em] text-pulse-green-800 mb-6 font-semibold">
        Up Next
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white/40 border border-charcoal/10 p-12 text-center">
          <p className="text-charcoal/40 text-lg">
            No patients currently waiting
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {visible.map((patient, index) => (
              <DisplayTokenCard
                key={patient.token}
                token={patient.token}
                priority={patient.priority}
                waitEstimate={getWaitEstimate(patient.token)}
                label={index < LABELS.length ? LABELS[index] : `+${index}`}
              />
            ))}
          </div>

          {overflow > 0 && (
            <p className="text-center text-sm text-charcoal/55 mt-4 font-medium">
              +{overflow} more waiting
            </p>
          )}
        </>
      )}
    </div>
  );
}