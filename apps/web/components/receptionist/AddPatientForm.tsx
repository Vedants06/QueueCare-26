'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TypedSocket } from '@/lib/socket';

interface AddPatientFormProps {
  socket: TypedSocket;
  clinicId: string;
  className?: string;
}

/**
 * Validates and normalizes an Indian mobile number.
 * Strips +91, 91, spaces, dashes.
 * Returns the clean 10-digit number, or null if invalid.
 * Returns '' for empty input (optional field).
 */
function normalizeAndValidatePhone(input: string): { valid: boolean; cleaned: string; error?: string } {
  const trimmed = input.trim();

  // Empty is valid (phone is optional)
  if (trimmed === '') {
    return { valid: true, cleaned: '' };
  }

  // Remove all non-digit characters
  let digits = trimmed.replace(/\D/g, '');

  // Strip +91 or 91 prefix if present (now 12 digits → 10)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  // Must be exactly 10 digits
  if (digits.length !== 10) {
    return {
      valid: false,
      cleaned: digits,
      error: 'Phone must be 10 digits',
    };
  }

  // Must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(digits)) {
    return {
      valid: false,
      cleaned: digits,
      error: 'Indian mobile must start with 6, 7, 8, or 9',
    };
  }

  return { valid: true, cleaned: digits };
}

export function AddPatientForm({ socket, clinicId, className }: AddPatientFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

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

      // Validate phone if provided
      const phoneCheck = normalizeAndValidatePhone(phone);
      if (!phoneCheck.valid) {
        setPhoneError(phoneCheck.error || 'Invalid phone');
        return;
      }

      setNameError('');
      setPhoneError('');
      setIsSubmitting(true);

      socket.emit('add-patient', {
        clinicId,
        name: trimmedName,
        phone: phoneCheck.cleaned || undefined,
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

  // Live validate phone as user types (after they've blurred once)
  const handlePhoneBlur = () => {
    if (phone.trim() === '') {
      setPhoneError('');
      return;
    }
    const check = normalizeAndValidatePhone(phone);
    if (!check.valid) {
      setPhoneError(check.error || 'Invalid phone');
    } else {
      setPhoneError('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-3', className)}>
      {/* Name */}
      <div>
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
          <p className="mt-1 text-xs text-signal-red-700">{nameError}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneError) setPhoneError('');
          }}
          onBlur={handlePhoneBlur}
          maxLength={15} // allows +91 prefix while typing
          className={cn(
            'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm',
            'placeholder:text-charcoal/35 focus:outline-none',
            phoneError
              ? 'border-signal-red-300 focus:border-signal-red'
              : 'border-charcoal/15 focus:border-pulse-green-700'
          )}
          disabled={isSubmitting}
        />
        {phoneError ? (
          <p className="mt-1 text-xs text-signal-red-700">{phoneError}</p>
        ) : (
          <p className="mt-1 ml-1 text-xs text-charcoal/40">
              10-digit mobile number
          </p>
        )}
      </div>

      {/* Priority */}
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

      {/* Submit */}
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