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

export function QueueGrid({ waitingPatients, getWaitEstimate, className }: QueueGridProps) {
  const visible = waitingPatients.slice(0, MAX_VISIBLE);
  const overflow = waitingPatients.length - MAX_VISIBLE;

  return (
    <div className={cn('flex flex-col', className)}>
      <p className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-4 font-medium">
        Up Next
      </p>

      {visible.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No patients currently waiting
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visible.map((patient) => (
              <DisplayTokenCard
                key={patient.token}
                token={patient.token}
                priority={patient.priority}
                waitEstimate={getWaitEstimate(patient.token)}
              />
            ))}
          </div>

          {overflow > 0 && (
            <p className="text-center text-sm text-gray-400 mt-4">
              +{overflow} more waiting
            </p>
          )}
        </>
      )}
    </div>
  );
}