'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'lg';
  className?: string;
}

export function Logo({ size = 'sm', className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* Icon: stylized Q made of a circle + queue line */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          'shrink-0',
          size === 'sm' ? 'h-7 w-7' : 'h-10 w-10'
        )}
      >
        {/* Circle representing the queue cycle */}
        <circle
          cx="14"
          cy="14"
          r="10"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-clinic-blue"
        />
        {/* Three dots in the circle = patients in queue */}
        <circle cx="10" cy="14" r="1.8" fill="currentColor" className="text-clinic-blue-300" />
        <circle cx="14" cy="14" r="1.8" fill="currentColor" className="text-clinic-blue-400" />
        <circle cx="18" cy="14" r="1.8" fill="currentColor" className="text-clinic-blue" />
        {/* Arrow tail extending out — the "next patient" */}
        <path
          d="M20 20L28 28"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-pulse-green"
        />
        <path
          d="M23 28H28V23"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-pulse-green"
        />
      </svg>

      {/* Wordmark */}
      <span
        className={cn(
          'font-semibold tracking-tight',
          size === 'sm' ? 'text-lg' : 'text-2xl'
        )}
      >
        <span className="text-clinic-blue">Queue</span>
        <span className="text-pulse-green">Cure</span>
      </span>
    </div>
  );
}