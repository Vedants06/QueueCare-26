'use client';

import { cn } from '@/lib/utils';
import type { TypedSocket } from '@/lib/socket';

interface CallNextButtonProps {
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  isPaused: boolean;
  hasWaiting: boolean;
  className?: string;
}

export function CallNextButton({
  socket,
  clinicId,
  getPin,
  isPaused,
  hasWaiting,
  className,
}: CallNextButtonProps) {
  const isDisabled = isPaused || !hasWaiting;

  return (
    <div className={cn('text-center', className)}>
      <button
        onClick={() => {
          if (isDisabled) return;
          socket.emit('call-next', { clinicId, receptionistPin: getPin() });
        }}
        disabled={isDisabled}
        className={cn(
          'w-full rounded-lg px-6 py-5 text-xl font-semibold transition-all',
          isDisabled
            ? 'bg-charcoal/10 text-charcoal/30 cursor-not-allowed'
            : 'bg-pulse-green-800 text-white hover:bg-pulse-green-900 shadow-sm hover:shadow-md'
        )}
      >
        {isPaused ? 'Queue paused' : 'Call next'}
      </button>
      <p className="text-xs text-charcoal/50 mt-2">
        {isDisabled
          ? !hasWaiting
            ? 'No patients waiting'
            : 'Resume queue to continue'
          : 'Or press the spacebar'}
      </p>
    </div>
  );
}