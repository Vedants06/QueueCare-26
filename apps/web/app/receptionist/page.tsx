'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import { useQueueState } from '@/hooks/useQueueState';
import { useUndoCountdown } from '@/hooks/useUndoCountdown';
import { usePinAuth } from '@/hooks/usePinAuth';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { initAudio } from '@/lib/sounds';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PinGate } from '@/components/receptionist/PinGate';
import { AddPatientForm } from '@/components/receptionist/AddPatientForm';
import { ServingCard } from '@/components/receptionist/ServingCard';
import { CallNextButton } from '@/components/receptionist/CallNextButton';
import { UndoBanner } from '@/components/receptionist/UndoBanner';
import { QueueTable } from '@/components/receptionist/QueueTable';
import { AbsentTray } from '@/components/receptionist/AbsentTray';
import { AnalyticsStrip } from '@/components/receptionist/AnalyticsStrip';
import { HistoryDrawer } from '@/components/receptionist/HistoryDrawer';
import { SettingsPanel } from '@/components/receptionist/SettingsPanel';
import { DangerZone } from '@/components/receptionist/DangerZone';
import { PauseButton } from '@/components/receptionist/PauseButton';
import { DuplicateWarning } from '@/components/receptionist/DuplicateWarning';
import { ConsultWarning } from '@/components/receptionist/ConsultWarning';
import { QRModal } from '@/components/receptionist/QRModal';
import { ReinstatedBannerReceptionist } from '@/components/receptionist/ReinstatedBanner';
import type { QueueError, Patient } from '@shared/types';
import { HistoryCard } from '@/components/receptionist/HistoryCard';

const CLINIC_ID = 'default';
const CLINIC_NAME = 'Default Clinic · Desk 1';

function SectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white border border-charcoal/10 p-5 ${className || ''}`}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-charcoal">
            {title}
          </h2>
          {subtitle && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/45">
              {subtitle}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function ReceptionistDashboard() {
  const { socket, isConnected, updateTimestamp } = useSocket(CLINIC_ID);
  const { state, analytics, waitingPatients, servingPatient, getWaitEstimate } =
    useQueueState(socket);
  const undoCountdown = useUndoCountdown(socket);
  const pinAuth = usePinAuth(socket);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [qrPatient, setQrPatient] = useState<Patient | null>(null);

  useEffect(() => {
    initAudio();
  }, []);

  usePageVisibility(
    useCallback(() => {
      socket.emit('join-clinic', { clinicId: CLINIC_ID });
      updateTimestamp();
    }, [socket, updateTimestamp])
  );

  // Spacebar = Call Next
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      if (!state.isPaused && waitingPatients.length > 0) {
        socket.emit('call-next', { clinicId: CLINIC_ID, receptionistPin: pinAuth.getPin() });
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [socket, state.isPaused, waitingPatients.length, pinAuth]);

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

  return (
    <PinGate
      isAuthenticated={pinAuth.isAuthenticated}
      isInCooldown={pinAuth.isInCooldown}
      cooldownSeconds={pinAuth.cooldownSeconds}
      attempts={pinAuth.attempts}
      onSubmit={pinAuth.submitPin}
    >
      <div className="min-h-screen bg-[#F2EFE8]">
        {/* Header */}
        <header className="border-b border-charcoal/10 bg-[#F2EFE8]">
          <div className="flex items-center justify-between px-6 py-4 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3">
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
              </Link>
              <span className="text-charcoal/30 mx-1">|</span>
              <span className="text-sm text-charcoal/70">{CLINIC_NAME}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`status-dot ${isConnected ? 'bg-pulse-green-700 status-dot-pulse' : 'bg-charcoal/30'
                    }`}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/55 hidden sm:inline">
                  {isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <PauseButton
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
                isPaused={state.isPaused}
              />
              <Link
                href="/"
                className="rounded-lg px-4 py-2 text-sm font-medium text-charcoal bg-white border border-charcoal/15 hover:border-charcoal/30 transition-colors"
              >
                Exit
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column */}
            <div className="lg:col-span-3 space-y-5">
              <SectionCard title="Add patient" subtitle="Step 1">
                <AddPatientForm socket={socket} clinicId={CLINIC_ID} />
              </SectionCard>

              <SectionCard title="Call next" subtitle="Step 2">
                <CallNextButton
                  socket={socket}
                  clinicId={CLINIC_ID}
                  getPin={pinAuth.getPin}
                  isPaused={state.isPaused}
                  hasWaiting={waitingPatients.length > 0}
                />
              </SectionCard>

              <UndoBanner
                isVisible={undoCountdown.isUndoAvailable}
                calledToken={undoCountdown.calledToken}
                calledName={undoCountdown.calledName}
                secondsRemaining={undoCountdown.secondsRemaining}
                progress={undoCountdown.progress}
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
                onDismiss={undoCountdown.clearCountdown}
              />

              <SectionCard title="Now serving" subtitle={servingPatient ? 'Live' : ''}>
                <ServingCard
                  patient={servingPatient}
                  currentToken={state.currentToken}
                  socket={socket}
                  clinicId={CLINIC_ID}
                  getPin={pinAuth.getPin}
                />
              </SectionCard>
            </div>

            {/* Center Column */}
            <div className="lg:col-span-6 space-y-5">
              <SectionCard title="Queue" subtitle={`${waitingPatients.length} waiting`}>
                <QueueTable
                  queue={state.queue}
                  getWaitEstimate={getWaitEstimate}
                  socket={socket}
                  clinicId={CLINIC_ID}
                  getPin={pinAuth.getPin}
                  onShowQR={(patient) => setQrPatient(patient)}
                />
              </SectionCard>

              <AbsentTray
                absentPatients={state.absentPatients}
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
              />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-3 space-y-5">
              <SectionCard title="Today" subtitle="Live analytics">
                <AnalyticsStrip analytics={analytics} />
              </SectionCard>

              <SettingsPanel
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
                currentAvgTime={state.avgConsultTime}
                sessionStartedAt={state.sessionStartedAt}
              />

              <HistoryCard onOpen={() => setHistoryOpen(true)} />

              <div className="rounded-xl border border-signal-red-200 bg-signal-red-50/40 p-5">
                <h2 className="text-base font-semibold text-signal-red mb-3">
                  Danger zone
                </h2>
                <DangerZone
                  socket={socket}
                  clinicId={CLINIC_ID}
                  getPin={pinAuth.getPin}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Overlays */}
        <ConsultWarning socket={socket} currentToken={state.currentToken} />
        <QRModal
          socket={socket}
          manualPatient={qrPatient}
          onManualClose={() => setQrPatient(null)}
        />
        <ReinstatedBannerReceptionist socket={socket} />
        <DuplicateWarning socket={socket} clinicId={CLINIC_ID} />
        <HistoryDrawer
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          clinicId={CLINIC_ID}
        />

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

export default function ReceptionistPage() {
  return (
    <ErrorBoundary fallbackMessage="Dashboard error. Please refresh the page.">
      <ReceptionistDashboard />
    </ErrorBoundary>
  );
}