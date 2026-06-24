'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TypedSocket } from '@/lib/socket';

interface AddPatientFormProps {
  socket: TypedSocket;
  clinicId: string;
  className?: string;
}

export function AddPatientForm({ socket, clinicId, className }: AddPatientFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        setNameError('Patient name is required');
        nameInputRef.current?.focus();
        return;
      }

      setNameError('');
      setIsSubmitting(true);

      socket.emit('add-patient', {
        clinicId,
        name: trimmedName,
        phone: phone.trim() || undefined,
        priority,
      });

      setName('');
      setPhone('');
      setPriority(false);

      setTimeout(() => {
        setIsSubmitting(false);
        nameInputRef.current?.focus();
      }, 1500);
    },
    [name, phone, priority, socket, clinicId]
  );

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-3', className)}>
      <input
        ref={nameInputRef}
        type="text"
        placeholder="Full name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (nameError) setNameError('');
        }}
        className={cn(
          'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm',
          'placeholder:text-charcoal/35 focus:outline-none',
          nameError
            ? 'border-signal-red-300 focus:border-signal-red'
            : 'border-charcoal/15 focus:border-pulse-green-700'
        )}
        disabled={isSubmitting}
      />
      {nameError && (
        <p className="text-xs text-signal-red-700 -mt-1">{nameError}</p>
      )}

      <input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full rounded-lg border border-charcoal/15 bg-white px-3.5 py-2.5 text-sm placeholder:text-charcoal/35 focus:outline-none focus:border-pulse-green-700"
        disabled={isSubmitting}
      />

      <label className="flex items-center gap-2 cursor-pointer select-none py-1">
        <input
          type="checkbox"
          checked={priority}
          onChange={(e) => setPriority(e.target.checked)}
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-charcoal/20 text-pulse-green-800 focus:ring-pulse-green-700/30"
        />
        <span className="text-sm text-charcoal">Mark as priority</span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
          isSubmitting
            ? 'bg-charcoal/20 cursor-not-allowed'
            : 'bg-charcoal hover:bg-charcoal/85'
        )}
      >
        {isSubmitting ? 'Adding...' : 'Add to queue'}
      </button>
    </form>
  );
}