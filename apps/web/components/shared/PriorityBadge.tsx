'use client';

import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export function PriorityBadge({ size = 'sm', pulse = false, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-medium',
        'bg-amber-alert-50 text-amber-alert-700 border border-amber-alert-200',
        size === 'sm' && 'px-1.5 py-0.5 text-xs',
        size === 'md' && 'px-2 py-1 text-sm',
        pulse && 'animate-pulse-slow',
        className
      )}
    >
      <span className="text-amber-alert">⚡</span>
      <span>Priority</span>
    </span>
  );
}