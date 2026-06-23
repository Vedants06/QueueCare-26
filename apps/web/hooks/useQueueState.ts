'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  QueueState,
  AnalyticsData,
  Patient,
  WaitEstimate,
} from '@shared/types';
import type { TypedSocket } from '@/lib/socket';
import { computeWaitEstimate } from '@/lib/waitTime';

const EMPTY_STATE: QueueState = {
  clinicId: '',
  currentToken: null,
  queue: [],
  absentPatients: [],
  consultHistory: [],
  avgConsultTime: 10,
  isPaused: false,
  sessionStartedAt: Date.now(),
  lastDate: '',
};

const EMPTY_ANALYTICS: AnalyticsData = {
  servedToday: 0,
  skippedToday: 0,
  absentToday: 0,
  reinstatedToday: 0,
  avgConsultReal: 0,
  avgConsultFallback: 10,
  dataPoints: 0,
  outliersExcluded: 0,
  throughputPerHour: 0,
};

/**
 * Manages queue state received from server via Socket.IO.
 *
 * Listens to:
 *   - 'state-sync' — full state on join/reconnect
 *   - 'queue-update' — state + analytics after every mutation
 *
 * Exposes derived values:
 *   - waitingPatients — filtered and sorted
 *   - servingPatient — currently being served or null
 *   - getPatientPosition — 1-based position in waiting queue
 *   - getWaitEstimate — confidence-adjusted wait range
 */
export function useQueueState(socket: TypedSocket) {
  const [state, setState] = useState<QueueState>(EMPTY_STATE);
  const [analytics, setAnalytics] = useState<AnalyticsData>(EMPTY_ANALYTICS);

  useEffect(() => {
    const onStateSync = (newState: QueueState) => {
      setState(newState);
    };

    const onQueueUpdate = (payload: { state: QueueState; analytics: AnalyticsData }) => {
      setState(payload.state);
      setAnalytics(payload.analytics);
    };

    socket.on('state-sync', onStateSync);
    socket.on('queue-update', onQueueUpdate);

    return () => {
      socket.off('state-sync', onStateSync);
      socket.off('queue-update', onQueueUpdate);
    };
  }, [socket]);

  // Derived: only waiting patients (for display and position calculation)
  const waitingPatients = useMemo(() => {
    return state.queue.filter((p) => p.status === 'waiting');
  }, [state.queue]);

  // Derived: currently serving patient
  const servingPatient = useMemo((): Patient | null => {
    return state.queue.find((p) => p.status === 'serving') ?? null;
  }, [state.queue]);

  // Get 1-based position of a patient in the waiting queue
  // Returns 0 if patient is not waiting (serving, absent, done, etc.)
  const getPatientPosition = useCallback(
    (token: number): number => {
      const index = waitingPatients.findIndex((p) => p.token === token);
      return index === -1 ? 0 : index + 1;
    },
    [waitingPatients]
  );

  // Get wait estimate for a specific patient
  const getWaitEstimate = useCallback(
    (token: number): WaitEstimate | null => {
      const position = getPatientPosition(token);
      if (position === 0) return null;

      // Calculate elapsed time for currently serving patient
      let servingElapsedMin = 0;
      if (servingPatient?.calledAt) {
        servingElapsedMin = (Date.now() - servingPatient.calledAt) / 60_000;
      }

      return computeWaitEstimate(
        position,
        state.consultHistory,
        state.avgConsultTime,
        servingElapsedMin
      );
    },
    [getPatientPosition, servingPatient, state.consultHistory, state.avgConsultTime]
  );

  // Find a specific patient by token (in queue OR absent tray)
  const findPatient = useCallback(
    (token: number): Patient | null => {
      const inQueue = state.queue.find((p) => p.token === token);
      if (inQueue) return inQueue;

      const inAbsent = state.absentPatients.find((p) => p.token === token);
      if (inAbsent) return inAbsent;

      return null;
    },
    [state.queue, state.absentPatients]
  );

  return {
    state,
    analytics,
    waitingPatients,
    servingPatient,
    getPatientPosition,
    getWaitEstimate,
    findPatient,
  };
}