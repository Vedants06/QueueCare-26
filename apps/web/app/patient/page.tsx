'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSocket } from '@/hooks/useSocket';
import { useQueueState } from '@/hooks/useQueueState';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { initAudio, playChime } from '@/lib/sounds';
import { TokenCard } from '@/components/patient/TokenCard';
import { PositionCard } from '@/components/patient/PositionCard';
import { LiveIndicator } from '@/components/patient/LiveIndicator';
import { AbsentNotice } from '@/components/patient/AbsentNotice';
import { ReinstatedBanner } from '@/components/patient/ReinstatedBanner';
import { PausedBanner } from '@/components/patient/PausedBanner';
import { DemoStatesPreview } from '@/components/patient/DemoStatesPreview';
import { SessionExpiredBanner } from '@/components/patient/SessionExpiredBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { PatientReinstatedPayload } from '@shared/types';

function PatientPageContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const clinicParam = searchParams.get('clinic') || 'default';
  const accessParam = searchParams.get('access');

  const token = tokenParam ? parseInt(tokenParam, 10) : null;
  const clinicId = clinicParam;
  const accessToken = accessParam;

  const { socket, isConnected, lastUpdated, updateTimestamp } = useSocket(clinicId);
  const { state, findPatient, getPatientPosition, getWaitEstimate } = useQueueState(socket);

  const [showReinstated, setShowReinstated] = useState(false);
  const [previousPosition, setPreviousPosition] = useState<number>(0);

  useEffect(() => {
    initAudio();
  }, []);

  usePageVisibility(
    useCallback(() => {
      socket.emit('join-clinic', { clinicId });
      updateTimestamp();
    }, [socket, clinicId, updateTimestamp])
  );

  useEffect(() => {
    const onReinstated = (payload: PatientReinstatedPayload) => {
      if (token && payload.token === token) {
        setShowReinstated(true);
        setTimeout(() => setShowReinstated(false), 6000);
      }
    };

    socket.on('patient-reinstated', onReinstated);
    return () => {
      socket.off('patient-reinstated', onReinstated);
    };
  }, [socket, token]);

  // Look up patient AND verify their accessToken matches
  const rawPatient = token ? findPatient(token) : null;
  const patient =
    rawPatient && accessToken && rawPatient.accessToken === accessToken
      ? rawPatient
      : null;
  const isAccessDenied = !!rawPatient && !patient; // patient exists but access denied
  const position = token ? getPatientPosition(token) : 0;
  const waitEstimate = token ? getWaitEstimate(token) : null;

  useEffect(() => {
    if (position === 1 && previousPosition !== 1 && previousPosition !== 0) {
      playChime();
    }
    setPreviousPosition(position);
  }, [position, previousPosition]);

  if (!token || isNaN(token)) {
    return (
      <div className="min-h-screen bg-[#F2EFE8] flex items-center justify-center p-4">
        <div className="rounded-xl bg-white border border-charcoal/10 p-6 max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/QueueCureLogo.png" alt="" width={32} height={32} className="h-8 w-8" />
            <span className="text-lg font-semibold text-charcoal">QueueCure</span>
          </div>
          <p className="text-sm font-semibold text-charcoal mb-2">No token provided</p>
          <p className="text-xs text-charcoal/55">
            Scan the QR code from your token slip to track your queue position.
          </p>
        </div>
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-[#F2EFE8] flex items-center justify-center p-4">
        <div className="rounded-xl bg-white border border-signal-red-200 p-6 max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/QueueCureLogo.png" alt="" width={32} height={32} className="h-8 w-8" />
            <span className="text-lg font-semibold text-charcoal">QueueCure</span>
          </div>
          <p className="text-sm font-semibold text-signal-red-700 mb-2">
            Access denied
          </p>
          <p className="text-xs text-charcoal/55">
            This link is invalid or has expired. Please scan the QR code from your token slip.
          </p>
        </div>
      </div>
    );
  }

  const isSessionExpired =
    patient &&
    state.sessionStartedAt > 0 &&
    patient.addedAt < state.sessionStartedAt;

  return (
    <div className="min-h-screen bg-[#F2EFE8]">
      {/* Header */}
      <header className="border-b border-charcoal/10 bg-[#F2EFE8]">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/QueueCureLogo.png" alt="" width={24} height={24} className="h-6 w-6" />
            <span className="text-base font-semibold text-charcoal">QueueCure</span>
          </div>
          <LiveIndicator isConnected={isConnected} lastUpdated={lastUpdated} />
        </div>
      </header>

      {/* Main */}
      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {isSessionExpired ? (
          <SessionExpiredBanner />
        ) : (
          <>
            <ReinstatedBanner show={showReinstated} />

            {patient ? (
              <TokenCard
                token={patient.token}
                name={patient.name}
                status={patient.status}
              />
            ) : (
              <div className="rounded-xl bg-white border border-charcoal/10 p-6 text-center">
                <p className="text-sm text-charcoal/55">
                  Looking for token #{token}...
                </p>
              </div>
            )}

            {patient?.status === 'absent' && <AbsentNotice />}

            {/* You're next — when position is 1 and someone is currently being served */}
            {patient?.status === 'waiting' && position === 1 && state.currentToken !== null && (
              <div className="rounded-xl bg-charcoal text-white p-5 text-center">
                <p className="text-base font-semibold mb-1">
                  You&apos;re next — please head towards the consulting room
                </p>
              </div>
            )}

            {/* Normal waiting position card */}
            {patient?.status === 'waiting' && position > 0 && (
              <PositionCard position={position} waitEstimate={waitEstimate} />
            )}

            {/* Being seen */}
            {patient?.status === 'serving' && (
              <div className="rounded-xl bg-pulse-green-50 border border-pulse-green-300 p-5 text-center">
                <p className="text-base font-semibold text-pulse-green-800">
                  You&apos;re being seen now
                </p>
              </div>
            )}

            {state.isPaused && patient?.status === 'waiting' && <PausedBanner />}

            {/* While you wait */}
            {patient?.status === 'waiting' && (
              <div className="rounded-xl bg-white/60 border border-charcoal/10 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/45 mb-3">
                  While you wait
                </p>
                <ul className="space-y-2 text-sm text-charcoal/75">
                  <li>· Stay within earshot of the waiting room.</li>
                  <li>· This page updates automatically — no need to refresh.</li>
                  <li>
                    · If you step out and miss your turn, return to the front desk
                    and you&apos;ll be reinstated.
                  </li>
                </ul>
              </div>
            )}
          </>
        )}

        {/* Demo states preview — collapsible */}
        {!isSessionExpired && <DemoStatesPreview />}

        {/* Footer */}
        <p className="text-center text-xs text-charcoal/40 pt-4">
          Clinic {clinicId} · token #{String(token).padStart(3, '0')}
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
          <div className="min-h-screen bg-[#F2EFE8] flex items-center justify-center">
            <p className="text-charcoal/40">Loading...</p>
          </div>
        }
      >
        <PatientPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}