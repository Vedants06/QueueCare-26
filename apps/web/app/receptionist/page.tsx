'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueueState } from '@/hooks/useQueueState';
import { useUndoCountdown } from '@/hooks/useUndoCountdown';
import { usePinAuth } from '@/hooks/usePinAuth';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { initAudio } from '@/lib/sounds';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Logo } from '@/components/shared/Logo';
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
import type { QueueError } from '@shared/types';

const CLINIC_ID = 'default';

function ReceptionistDashboard() {
  const { socket, isConnected, updateTimestamp } = useSocket(CLINIC_ID);
  const { state, analytics, waitingPatients, servingPatient, getWaitEstimate } =
    useQueueState(socket);
  const undoCountdown = useUndoCountdown(socket);
  const pinAuth = usePinAuth(socket);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Initialize audio
  useEffect(() => {
    initAudio();
  }, []);

  // Force state-sync on tab focus
  usePageVisibility(
    useCallback(() => {
      socket.emit('join-clinic', { clinicId: CLINIC_ID });
      updateTimestamp();
    }, [socket, updateTimestamp])
  );

  // Listen for queue errors and show as toast
  useEffect(() => {
    const onError = (error: QueueError) => {
      // Don't show unauthorized errors as toast — PinAuth handles those
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
      <div className="min-h-screen bg-slate-surface">
        {/* ─── Header ──────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 max-w-screen-2xl mx-auto">
            {/* Left: Logo + connection status */}
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div className="flex items-center gap-1.5">
                <span
                  className={`status-dot ${
                    isConnected
                      ? 'bg-pulse-green status-dot-pulse'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-xs text-text-muted hidden sm:inline">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <PauseButton
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
                isPaused={state.isPaused}
              />
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="rounded-lg p-2 text-text-muted hover:text-charcoal hover:bg-gray-100 transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={() => setHistoryOpen(true)}
                className="rounded-lg p-2 text-text-muted hover:text-charcoal hover:bg-gray-100 transition-colors"
                title="Patient History"
              >
                📋
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main Content ─────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* ─── Left Column: Actions ─────────────────────── */}
            <div className="lg:col-span-3 space-y-4">
              <AddPatientForm
                socket={socket}
                clinicId={CLINIC_ID}
              />

              <div className="border-t border-gray-200 pt-4">
                <CallNextButton
                  socket={socket}
                  clinicId={CLINIC_ID}
                  getPin={pinAuth.getPin}
                  isPaused={state.isPaused}
                  hasWaiting={waitingPatients.length > 0}
                />
              </div>

              {/* Undo Banner */}
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

              <div className="border-t border-gray-200 pt-4">
                <ServingCard
                  patient={servingPatient}
                  socket={socket}
                  clinicId={CLINIC_ID}
                  getPin={pinAuth.getPin}
                />
              </div>
            </div>

            {/* ─── Center Column: Queue ─────────────────────── */}
            <div className="lg:col-span-6 space-y-4">
              <QueueTable
                queue={state.queue}
                getWaitEstimate={getWaitEstimate}
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
              />

              <AbsentTray
                absentPatients={state.absentPatients}
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
              />
            </div>

            {/* ─── Right Column: Info ───────────────────────── */}
            <div className="lg:col-span-3 space-y-4">
              <AnalyticsStrip analytics={analytics} />

              {showSettings && (
                <SettingsPanel
                  socket={socket}
                  clinicId={CLINIC_ID}
                  getPin={pinAuth.getPin}
                  currentAvgTime={state.avgConsultTime}
                  sessionStartedAt={state.sessionStartedAt}
                />
              )}

              <DangerZone
                socket={socket}
                clinicId={CLINIC_ID}
                getPin={pinAuth.getPin}
              />
            </div>
          </div>
        </div>

        {/* ─── Floating / Overlay Elements ──────────────────── */}

        {/* Consultation warning toast */}
        <ConsultWarning
          socket={socket}
          currentToken={state.currentToken}
        />

        {/* QR code modal (triggered by patient-added) */}
        <QRModal socket={socket} />

        {/* Reinstated banner toast */}
        <ReinstatedBannerReceptionist socket={socket} />

        {/* Duplicate warning dialog */}
        <DuplicateWarning
          socket={socket}
          clinicId={CLINIC_ID}
        />

        {/* History drawer */}
        <HistoryDrawer
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          clinicId={CLINIC_ID}
        />

        {/* Error toast */}
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