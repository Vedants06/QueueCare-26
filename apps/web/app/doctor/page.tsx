'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import { useQueueState } from '@/hooks/useQueueState';
import { usePinAuth } from '@/hooks/usePinAuth';
import { useStopwatch } from '@/hooks/useStopwatch';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { cn } from '@/lib/utils';
import { formatWaitRange } from '@/lib/waitTime';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PinGate } from '@/components/receptionist/PinGate';
import type { QueueError } from '@shared/types';

const CLINIC_ID = 'default';

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

function maskPhone(phone: string | undefined): string {
  if (!phone || phone.length < 4) return phone || '';
  return `•••• ${phone.slice(-4)}`;
}

function DoctorPageInner() {
  const { socket, isConnected, updateTimestamp } = useSocket(CLINIC_ID);
  const { state, waitingPatients, servingPatient, getWaitEstimate } =
    useQueueState(socket);
  const pinAuth = usePinAuth(socket, 'doctor', CLINIC_ID);

  const [notes, setNotes] = useState('');
  const [lastSavedToken, setLastSavedToken] = useState<number | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const { formatted: elapsed } = useStopwatch(servingPatient?.calledAt);

  usePageVisibility(
    useCallback(() => {
      socket.emit('join-clinic', { clinicId: CLINIC_ID });
      updateTimestamp();
    }, [socket, updateTimestamp])
  );

  useEffect(() => {
    if (servingPatient) {
      if (servingPatient.token !== lastSavedToken) {
        setNotes(servingPatient.notes || '');
        setLastSavedToken(servingPatient.token);
      }
    } else {
      setNotes('');
      setLastSavedToken(null);
    }
  }, [servingPatient, lastSavedToken]);

  useEffect(() => {
    if (!servingPatient || servingPatient.token !== lastSavedToken) return;
    if (notes === (servingPatient.notes || '')) return;

    const timer = setTimeout(() => {
      socket.emit('set-notes', {
        clinicId: CLINIC_ID,
        token: servingPatient.token,
        notes,
        doctorPin: pinAuth.getPin(),
      });
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 1500);
    }, 800);

    return () => clearTimeout(timer);
  }, [notes, servingPatient, lastSavedToken, socket, pinAuth]);

  useEffect(() => {
    const onError = (error: QueueError) => {
      if (error.code === 'unauthorized') return;
      setErrorToast(error.message);
      setTimeout(() => setErrorToast(null), 4000);
    };

    socket.on('queue-error', onError);
    return () => {
      socket.off('queue-error', onError);
    };
  }, [socket]);

  const handleCallNext = () => {
    if (state.isPaused || waitingPatients.length === 0) return;
    socket.emit('call-next', {
      clinicId: CLINIC_ID,
      receptionistPin: pinAuth.getPin(),
    });
  };

  const handleMarkDone = () => {
    if (!servingPatient) return;
    socket.emit('mark-done', {
      clinicId: CLINIC_ID,
      token: servingPatient.token,
      receptionistPin: pinAuth.getPin(),
    });
  };

  const handleMarkAbsent = () => {
    if (!servingPatient) return;
    socket.emit('mark-absent', {
      clinicId: CLINIC_ID,
      token: servingPatient.token,
      receptionistPin: pinAuth.getPin(),
    });
  };

  return (
    <PinGate
      isAuthenticated={pinAuth.isAuthenticated}
      isInCooldown={pinAuth.isInCooldown}
      cooldownSeconds={pinAuth.cooldownSeconds}
      attempts={pinAuth.attempts}
      onSubmit={pinAuth.submitPin}
      demoPin="5678"
      roleName="Doctor"
    >
      <div className="min-h-screen bg-[#F2EFE8]">
        {/* Header */}
        <header className="border-b border-charcoal/10 bg-[#F2EFE8]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/QueueCureLogo.png"
                alt="QueueCure"
                width={28}
                height={28}
                className="h-7 w-7"
              />
              <span className="text-lg font-semibold text-charcoal">
                QueueCure
              </span>
              <span className="text-charcoal/30 mx-1">|</span>
              <span className="text-sm text-charcoal/70">Doctor console</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`status-dot ${
                    isConnected
                      ? 'bg-pulse-green-700 status-dot-pulse'
                      : 'bg-charcoal/30'
                  }`}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/55 hidden sm:inline">
                  {isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <Link
                href="/"
                className="rounded-lg px-4 py-2 text-sm font-medium text-charcoal bg-white border border-charcoal/15 hover:border-charcoal/30 transition-colors"
              >
                Exit
              </Link>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-5xl mx-auto px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-5">
          {/* Left — Now Seeing */}
          <div className="space-y-5">
            <div className="rounded-xl bg-white border border-charcoal/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-charcoal">
                  Now seeing
                </h2>
                {servingPatient && (
                  <span className="font-mono text-base font-semibold text-pulse-green-800">
                    {elapsed}
                  </span>
                )}
              </div>

              {servingPatient ? (
                <>
                  <div className="mb-4">
                    <p className="font-mono text-5xl font-bold text-charcoal leading-none">
                      {formatToken(servingPatient.token)}
                    </p>
                    <p className="text-base font-semibold text-charcoal mt-3">
                      {servingPatient.name}
                    </p>
                    {servingPatient.phone && (
                      <p className="text-xs text-charcoal/55 mt-0.5">
                        {maskPhone(servingPatient.phone)}
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">
                        Consultation notes
                      </label>
                      {savedIndicator && (
                        <span className="text-[10px] font-semibold text-pulse-green-800">
                          ✓ Saved
                        </span>
                      )}
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Type a brief note about this patient's consultation..."
                      rows={5}
                      maxLength={2000}
                      className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm placeholder:text-charcoal/35 focus:outline-none focus:border-pulse-green-700 resize-none"
                    />
                    <p className="text-[10px] text-charcoal/40 mt-1 text-right">
                      {notes.length} / 2000 · Auto-saved
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkDone}
                      className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold bg-pulse-green-800 text-white hover:bg-pulse-green-900 transition-colors"
                    >
                      Mark done
                    </button>
                    <button
                      onClick={handleMarkAbsent}
                      className="rounded-lg px-4 py-2.5 text-sm font-semibold bg-amber-alert text-charcoal hover:bg-amber-alert-400 transition-colors"
                    >
                      Mark absent
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-charcoal/55 mb-1">
                    No patient in consultation
                  </p>
                  <p className="text-xs text-charcoal/40">
                    Click Call Next to begin the next consultation
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleCallNext}
              disabled={state.isPaused || waitingPatients.length === 0}
              className={cn(
                'w-full rounded-lg px-6 py-4 text-base font-semibold transition-colors',
                state.isPaused || waitingPatients.length === 0
                  ? 'bg-charcoal/10 text-charcoal/30 cursor-not-allowed'
                  : 'bg-pulse-green-800 text-white hover:bg-pulse-green-900 shadow-sm'
              )}
            >
              {state.isPaused
                ? 'Queue paused'
                : waitingPatients.length === 0
                ? 'No patients waiting'
                : 'Call next patient →'}
            </button>
          </div>

          {/* Right — Waiting Queue */}
          <aside className="rounded-xl bg-white border border-charcoal/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-charcoal">Up next</h2>
              <span className="text-xs text-charcoal/55">
                {waitingPatients.length} waiting
              </span>
            </div>

            {waitingPatients.length === 0 ? (
              <p className="text-sm text-charcoal/45 text-center py-8">
                Queue is empty
              </p>
            ) : (
              <div className="space-y-1.5">
                {waitingPatients.slice(0, 10).map((patient, index) => {
                  const wait = getWaitEstimate(patient.token);
                  return (
                    <div
                      key={patient.token}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg',
                        patient.priority
                          ? 'bg-amber-alert-50 border border-amber-alert-200'
                          : 'bg-[#F2EFE8]/60'
                      )}
                    >
                      <span className="text-[10px] font-semibold text-charcoal/45 w-6">
                        {index === 0 ? 'Next' : `+${index}`}
                      </span>
                      <span className="font-mono text-sm font-semibold text-charcoal w-12">
                        #{formatToken(patient.token)}
                      </span>
                      <span className="flex-1 text-sm text-charcoal truncate">
                        {patient.name}
                      </span>
                      {patient.priority && <span className="text-xs">⚡</span>}
                      {wait && (
                        <span className="text-[10px] text-charcoal/55 font-mono shrink-0">
                          {formatWaitRange(wait)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {waitingPatients.length > 10 && (
                  <p className="text-xs text-charcoal/45 text-center pt-2">
                    +{waitingPatients.length - 10} more
                  </p>
                )}
              </div>
            )}
          </aside>
        </main>

        {errorToast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-sm">
            <div className="rounded-lg border border-signal-red-200 bg-signal-red-50 px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-signal-red">⚠</span>
                <p className="text-sm text-signal-red-700">{errorToast}</p>
                <button
                  onClick={() => setErrorToast(null)}
                  className="ml-auto text-signal-red-400 hover:text-signal-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PinGate>
  );
}

export default function DoctorPage() {
  return (
    <ErrorBoundary fallbackMessage="Doctor console error. Please refresh.">
      <DoctorPageInner />
    </ErrorBoundary>
  );
}