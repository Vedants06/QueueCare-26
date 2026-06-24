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
  const { state, waitingPatients, servingPatient, getWaitEstimate } = useQueueState(socket);

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

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      document.body.style.cursor = 'none';
      return () => {
        document.body.style.cursor = '';
      };
    }
  }, []);

  const isMinimal = mode === 'minimal';

  return (
    <div className="min-h-screen bg-[#F2EFE8] flex flex-col overflow-hidden select-none">
      {/* Status bar — subtle, top */}
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pulse-green-700" />
          <span className="text-sm font-semibold text-charcoal/80">
            QueueCure
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-dot status-dot-pulse bg-pulse-green-700" />
          <span className="text-xs font-semibold uppercase tracking-wider text-pulse-green-800">
            Live
          </span>
        </div>
      </div>

      {/* Now Serving — large */}
      <div
        className={
          isMinimal
            ? 'flex-1 flex items-center justify-center'
            : 'flex items-center justify-center h-[60vh]'
        }
      >
        <NowServing
          currentToken={state.currentToken}
          currentName={servingPatient?.name}
        />
      </div>

      {/* Queue Grid — only in full mode */}
      {!isMinimal && (
        <div className="h-[40vh] px-8 pb-8 flex flex-col">
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
          <div className="min-h-screen bg-[#F2EFE8] flex items-center justify-center">
            <p className="text-charcoal/40">Loading display...</p>
          </div>
        }
      >
        <DisplayPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}