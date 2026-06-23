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

      // Validate
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        setNameError('Patient name is required');
        nameInputRef.current?.focus();
        return;
      }

      setNameError('');
      setIsSubmitting(true);

      // Emit add-patient (no PIN required)
      socket.emit('add-patient', {
        clinicId,
        name: trimmedName,
        phone: phone.trim() || undefined,
        priority,
      });

      // Clear form and re-enable after 2 seconds
      setName('');
      setPhone('');
      setPriority(false);

      setTimeout(() => {
        setIsSubmitting(false);
        nameInputRef.current?.focus();
      }, 2000);
    },
    [name, phone, priority, socket, clinicId]
  );

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wide">
        Add Patient
      </h3>

      {/* Name */}
      <div>
        <input
          ref={nameInputRef}
          type="text"
          placeholder="Patient name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm',
            'placeholder:text-gray-400 focus:outline-none focus:ring-2',
            nameError
              ? 'border-signal-red focus:ring-signal-red/30'
              : 'border-gray-200 focus:ring-clinic-blue/30 focus:border-clinic-blue'
          )}
          disabled={isSubmitting}
        />
        {nameError && (
          <p className="mt-1 text-xs text-signal-red">{nameError}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={cn(
            'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm',
            'placeholder:text-gray-400 focus:outline-none focus:ring-2',
            'focus:ring-clinic-blue/30 focus:border-clinic-blue'
          )}
          disabled={isSubmitting}
        />
      </div>

      {/* Priority toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={priority}
          onClick={() => setPriority(!priority)}
          disabled={isSubmitting}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clinic-blue/30',
            priority ? 'bg-amber-alert' : 'bg-gray-200'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              priority ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
        <span className="text-sm text-charcoal">
          ⚡ Priority
        </span>
      </label>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors',
          isSubmitting
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-clinic-blue hover:bg-clinic-blue-600 active:bg-clinic-blue-700'
        )}
      >
        {isSubmitting ? 'Adding...' : 'Add Patient'}
      </button>
    </form>
  );
}