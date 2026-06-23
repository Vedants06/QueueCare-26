'use client';

import { cn } from '@/lib/utils';
import type { TypedSocket } from '@/lib/socket';

interface PauseButtonProps {
  socket: TypedSocket;
  clinicId: string;
  getPin: () => string;
  isPaused: boolean;
  className?: string;
}

export function PauseButton({
  socket,
  clinicId,
  getPin,
  isPaused,
  className,
}: PauseButtonProps) {
  const handleToggle = () => {
    socket.emit('pause-queue', {
      clinicId,
      pause: !isPaused,
      receptionistPin: getPin(),
    });
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        isPaused
          ? 'bg-pulse-green text-white hover:bg-pulse-green-600'
          : 'bg-amber-alert-50 text-amber-alert-700 border border-amber-alert-200 hover:bg-amber-alert-100',
        className
      )}
    >
      {isPaused ? '▶ Resume Queue' : '⏸ Pause Queue'}
    </button>
  );
}