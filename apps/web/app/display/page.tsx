'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
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

const LOCAL_STORAGE_KEY = 'queuecure_display_mode';

function DisplayPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlMode = searchParams.get('mode');
  const clinicId = 'default';

  // Determine current mode: URL > localStorage > default 'full'
  const [mode, setMode] = useState<'full' | 'minimal'>(() => {
    if (urlMode === 'minimal') return 'minimal';
    if (urlMode === 'full') return 'full';
    // Fall back to localStorage on first render (SSR safe via useEffect below)
    return 'full';
  });

  // On mount, check localStorage if no URL mode set
  useEffect(() => {
    if (urlMode === 'minimal' || urlMode === 'full') {
      setMode(urlMode);
      return;
    }
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved === 'minimal' || saved === 'full') {
        setMode(saved);
      }
    } catch {
      // localStorage may not be available
    }
  }, [urlMode]);

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

  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'production') {
  //     document.body.style.cursor = 'none';
  //     return () => {
  //       document.body.style.cursor = '';
  //     };
  //   }
  // }, []);

  // Toggle mode + persist + update URL
  const toggleMode = useCallback(() => {
    const newMode = mode === 'full' ? 'minimal' : 'full';
    setMode(newMode);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, newMode);
    } catch {
      // ignore
    }

    // Update URL without reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', newMode);
    router.replace(`/display?${params.toString()}`, { scroll: false });
  }, [mode, router, searchParams]);

  // Keyboard shortcut: M to toggle mode
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [toggleMode]);

  const isMinimal = mode === 'minimal';

  return (
    <div className="min-h-screen bg-[#F2EFE8] flex flex-col overflow-hidden select-none relative">
      {/* Top status bar */}
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-70"
          title="Back to home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-charcoal/55 group-hover:text-charcoal transition-colors"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-semibold text-charcoal/80">QueueCure</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="status-dot status-dot-pulse bg-pulse-green-700" />
          <span className="text-xs font-semibold uppercase tracking-wider text-pulse-green-800">
            Live
          </span>
        </div>
      </div>

      {/* Now Serving */}
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

      {/* Mode toggle — bottom right corner */}
      <button
        onClick={toggleMode}
        title={`Switch to ${isMinimal ? 'full grid' : 'minimal'} view (press M)`}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-white/70 hover:bg-white border border-charcoal/15 hover:border-charcoal/30 px-4 py-2 text-xs font-medium text-charcoal/65 hover:text-charcoal transition-all shadow-sm hover:shadow-md backdrop-blur-sm z-10"
      >
        {isMinimal ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Full view
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Compact view
          </>
        )}
      </button>

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