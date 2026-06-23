'use client';

import { cn } from '@/lib/utils';
import { formatToken } from '@/lib/formatters';

interface TokenDisplayProps {
  token: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'display';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
  display: 'text-8xl md:text-9xl',
};

export function TokenDisplay({ token, size = 'md', className }: TokenDisplayProps) {
  return (
    <span
      className={cn(
        'token-number inline-block',
        sizeClasses[size],
        className
      )}
    >
      <span className="text-text-muted opacity-50">#</span>
      {formatToken(token)}
    </span>
  );
}