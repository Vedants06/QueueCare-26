'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DemoStatesPreviewProps {
  className?: string;
}

const STATES = [
  {
    label: "You're next",
    bg: 'bg-charcoal text-white',
    border: 'border-charcoal',
    message: "You're next — please head towards the consulting room.",
  },
  {
    label: 'Being seen',
    bg: 'bg-pulse-green-50 text-pulse-green-800',
    border: 'border-pulse-green-300',
    message: "You're being seen now.",
  },
  {
    label: 'Marked absent',
    bg: 'bg-amber-alert-50 text-amber-alert-700',
    border: 'border-amber-alert-300',
    message: 'You were called but were not present. Please return to the reception desk.',
  },
  {
    label: 'Session ended',
    bg: 'bg-signal-red-50 text-signal-red-700',
    border: 'border-signal-red-200',
    message: 'This queue session has ended. Please visit reception for a new token.',
  },
];

export function DemoStatesPreview({ className }: DemoStatesPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-charcoal/20 bg-white/40 p-4',
        className
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/55">
          Demo · Other patient states
        </p>
        <span className="text-charcoal/45 text-sm">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {STATES.map((state) => (
            <div
              key={state.label}
              className={cn(
                'rounded-lg border p-3 text-xs',
                state.bg,
                state.border
              )}
            >
              {state.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}