'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueueState } from '@/hooks/useQueueState';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { initAudio, playChime } from '@/lib/sounds';
import { Logo } from '@/components/shared/Logo';
import { TokenCard } from '@/components/patient/TokenCard';
import { PositionCard } from '@/components/patient/PositionCard';
import { LiveIndicator } from '@/components/patient/LiveIndicator';
import { AbsentNotice } from '@/components/patient/AbsentNotice';
import { ReinstatedBanner } from '@/components/patient/ReinstatedBanner';
import { PausedBanner } from '@/components/patient/PausedBanner';
import { SessionExpiredBanner } from '@/components/patient/SessionExpiredBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { PatientReinstatedPayload } from '@shared/types';

function PatientPageContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const clinicParam = searchParams.get('clinic') || 'default';

  const token = tokenParam ? parseInt(tokenParam, 10) : null;
  const clinicId = clinicParam;

  const { socket, isConnected, lastUpdated, updateTimestamp } = useSocket(clinicId);
  const { state, findPatient, getPatientPosition, getWaitEstimate } = useQueueState(socket);

  const [showReinstated, setShowReinstated] = useState(false);
  const [previousPosition, setPreviousPosition] = useState<number>(0);

  // Initialize audio on first interaction
  useEffect(() => {
    initAudio();
  }, []);

  // Force state-sync on tab focus
  usePageVisibility(
    useCallback(() => {
      socket.emit('join-clinic', { clinicId });
      updateTimestamp();
    }, [socket, clinicId, updateTimestamp])
  );

  // Listen for reinstatement
  useEffect(() => {
    const onReinstated = (payload: PatientReinstatedPayload) => {
      if (token && payload.token === token) {
        setShowReinstated(true);
        // Auto-hide is handled by ReinstatedBanner component
        setTimeout(() => setShowReinstated(false), 6000);
      }
    };

    socket.on('patient-reinstated', onReinstated);
    return () => {
      socket.off('patient-reinstated', onReinstated);
    };
  }, [socket, token]);

  // Play chime when position becomes 1
  const patient = token ? findPatient(token) : null;
  const position = token ? getPatientPosition(token) : 0;
  const waitEstimate = token ? getWaitEstimate(token) : null;

  useEffect(() => {
    if (position === 1 && previousPosition !== 1 && previousPosition !== 0) {
      playChime();
    }
    setPreviousPosition(position);
  }, [position, previousPosition]);

  // ─── Error: no token in URL ────────────────────────────
  if (!token || isNaN(token)) {
    return (
      <div className="min-h-screen bg-slate-surface flex items-center justify-center p-4">
        <div className="qc-card max-w-sm text-center">
          <Logo size="lg" className="justify-center mb-4" />
          <p className="text-charcoal font-medium mb-2">No token provided</p>
          <p className="text-sm text-text-muted">
            Scan the QR code from your token slip to track your queue position.
          </p>
        </div>
      </div>
    );
  }

  // ─── Check session expiry ──────────────────────────────
  const isSessionExpired =
    patient &&
    state.sessionStartedAt > 0 &&
    patient.addedAt < state.sessionStartedAt;

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-surface flex flex-col items-center px-4 py-6">
      {/* Header */}
      <Logo size="sm" className="mb-6" />

      <div className="w-full max-w-sm space-y-4">
        {/* Session expired — replaces everything */}
        {isSessionExpired && <SessionExpiredBanner />}

        {/* Normal flow */}
        {!isSessionExpired && (
          <>
            {/* Reinstated banner */}
            <ReinstatedBanner show={showReinstated} />

            {/* Token card */}
            {patient ? (
              <TokenCard
                token={patient.token}
                name={patient.name}
                status={patient.status}
              />
            ) : (
              <div className="qc-card text-center">
                <p className="text-text-muted">
                  Looking for token #{token}...
                </p>
              </div>
            )}

            {/* Absent notice */}
            {patient?.status === 'absent' && <AbsentNotice />}

            {/* Position and wait (only when waiting) */}
            {patient?.status === 'waiting' && position > 0 && (
              <PositionCard position={position} waitEstimate={waitEstimate} />
            )}

            {/* Serving state */}
            {patient?.status === 'serving' && (
              <div className="qc-card text-center border-pulse-green bg-pulse-green-50">
                <p className="text-xl font-semibold text-pulse-green-700">
                  You are being seen now
                </p>
              </div>
            )}

            {/* Paused banner */}
            {state.isPaused && patient?.status === 'waiting' && <PausedBanner />}
          </>
        )}

        {/* Live indicator — always visible */}
        <LiveIndicator
          isConnected={isConnected}
          lastUpdated={lastUpdated}
          className="mt-6"
        />

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-4">
          Token #{token} — QueueCure
        </p>
      </div>
    </div>
  );
}

export default function PatientPage() {
  return (
    <ErrorBoundary fallbackMessage="Unable to load queue tracker. Please refresh.">
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-surface flex items-center justify-center">
            <p className="text-text-muted">Loading...</p>
          </div>
        }
      >
        <PatientPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}