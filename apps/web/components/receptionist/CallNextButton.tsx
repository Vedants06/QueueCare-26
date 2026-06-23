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

  const handleClick = () => {
    if (isDisabled) return;

    socket.emit('call-next', {
      clinicId,
      receptionistPin: getPin(),
    });
  };

  // Determine tooltip text
  let tooltip = '';
  if (isPaused) {
    tooltip = 'Queue is paused — resume to call next';
  } else if (!hasWaiting) {
    tooltip = 'No patients waiting in queue';
  }

  return (
    <div className={cn('relative group', className)}>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          'w-full rounded-xl px-6 py-4 text-lg font-semibold text-white transition-all',
          isDisabled
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-clinic-blue hover:bg-clinic-blue-600 active:bg-clinic-blue-700 shadow-md hover:shadow-lg active:shadow-sm'
        )}
      >
        {isPaused ? '⏸ Queue Paused' : 'Call Next Patient'}
      </button>

      {/* Tooltip on hover when disabled */}
      {isDisabled && tooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 rounded-lg bg-charcoal text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {tooltip}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-2 h-2 bg-charcoal rotate-45" />
        </div>
      )}
    </div>
  );
}