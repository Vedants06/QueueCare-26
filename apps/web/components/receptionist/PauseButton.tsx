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
  return (
    <button
      onClick={() =>
        socket.emit('pause-queue', {
          clinicId,
          pause: !isPaused,
          receptionistPin: getPin(),
        })
      }
      className={cn(
        'rounded-lg px-4 py-2 text-sm font-medium transition-colors border',
        isPaused
          ? 'bg-pulse-green-800 text-white border-pulse-green-800 hover:bg-pulse-green-900'
          : 'bg-white text-charcoal border-charcoal/15 hover:border-charcoal/30',
        className
      )}
    >
      {isPaused ? 'Resume queue' : 'Pause queue'}
    </button>
  );
}