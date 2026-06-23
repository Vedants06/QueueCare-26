'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, Suspense } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueueState } from '@/hooks/useQueueState';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { initAudio, playChime, playDoubleChime } from '@/lib/sounds';
import { NowServing } from '@/components/display/NowServing';
import { QueueGrid } from '@/components/display/QueueGrid';
import { PauseOverlay } from '@/components/display/PauseOverlay';
import { ReconnectingOverlay } from '@/components/display/ReconnectingOverlay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { TokenCalledPayload } from '@shared/types';

function DisplayPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'full';
  const clinicId = 'default';

  const { socket, isConnected, updateTimestamp } = useSocket(clinicId);
  const { state, waitingPatients, getWaitEstimate } = useQueueState(socket);

  // Initialize audio
  useEffect(() => {
    initAudio();
  }, []);

  // Force state-sync on tab focus (critical for TV screens)
  usePageVisibility(
    useCallback(() => {
      socket.emit('join-clinic', { clinicId });
      updateTimestamp();
    }, [socket, clinicId, updateTimestamp])
  );

  // Play chime on token-called
  useEffect(() => {
    const onTokenCalled = (payload: TokenCalledPayload) => {
      if (payload.isRecall) {
        playDoubleChime();
      } else {
        playChime();
      }
    };

    socket.on('token-called', onTokenCalled);
    return () => {
      socket.off('token-called', onTokenCalled);
    };
  }, [socket]);

  // Hide cursor for kiosk mode
  useEffect(() => {
    document.body.style.cursor = 'none';
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  const isMinimal = mode === 'minimal';

  return (
    <div className="min-h-screen bg-carbon text-white flex flex-col overflow-hidden select-none">
      {/* Now Serving — always visible */}
      <div
        className={
          isMinimal
            ? 'flex-1 flex items-center justify-center'
            : 'flex items-center justify-center h-[60vh]'
        }
      >
        <NowServing currentToken={state.currentToken} />
      </div>

      {/* Queue Grid — only in full mode */}
      {!isMinimal && (
        <div className="h-[40vh] px-8 pb-6 flex flex-col">
          <QueueGrid
            waitingPatients={waitingPatients}
            getWaitEstimate={getWaitEstimate}
            className="flex-1"
          />
        </div>
      )}

      {/* Overlays */}
      <PauseOverlay isPaused={state.isPaused} />
      <ReconnectingOverlay isDisconnected={!isConnected} />
    </div>
  );
}

export default function DisplayPage() {
  return (
    <ErrorBoundary fallbackMessage="Display screen error. Please refresh.">
      <Suspense
        fallback={
          <div className="min-h-screen bg-carbon flex items-center justify-center">
            <p className="text-gray-500">Loading display...</p>
          </div>
        }
      >
        <DisplayPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}