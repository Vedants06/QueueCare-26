import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CallNextPayload,
  QueueState,
} from '../types';
import { validatePayload, callNextSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState, deepCloneState } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { computeWaitEstimate, isOutlier } from '../lib/waitTime';
import { getOrCreateSessionId } from '../db/session';
import { writePatientHistory } from '../db/history';
import { buildAnalytics } from '../lib/analyticsHelper';
import { writeConsultDuration } from '../db/consultHistory';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Undo snapshot store.
 * Stores a deep clone of QueueState before each call-next.
 * Exported so undoCall.ts handler can access it.
 */
export interface UndoSnapshot {
  snapshot: QueueState;
  expiresAt: number;
  timeoutRef: NodeJS.Timeout;
}

export const undoSnapshots = new Map<string, UndoSnapshot>();

const UNDO_WINDOW_MS = 5_000;

/**
 * Handles 'call-next' socket event.
 *
 * 1. Validates payload and PIN
 * 2. Acquires mutex (try/finally)
 * 3. Checks isPaused and empty queue
 * 4. Implicit done: if current serving patient wasn't marked done,
 *    records their duration
 * 5. Finds next patient (priority waiting first, then normal waiting)
 * 6. Creates undo snapshot
 * 7. Advances queue
 * 8. Broadcasts queue-update and token-called
 */
export async function handleCallNext(
  io: TypedServer,
  socket: TypedSocket,
  payload: CallNextPayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(callNextSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, receptionistPin } = validation.data;

  // Step 2: Validate PIN
  // Accept either receptionist or doctor PIN
  if (!validatePin(receptionistPin) && !validatePin(receptionistPin, 'doctor')) {
    socket.emit('queue-error', {
      code: 'unauthorized',
      message: 'Invalid receptionist PIN',
    });
    return;
  }

  // Step 3: Get state
  const state = getState(clinicId);
  if (!state) {
    socket.emit('queue-error', {
      code: 'not-found',
      message: 'Clinic not found. Add a patient first.',
    });
    return;
  }

  // Step 4: Check if paused
  if (state.isPaused) {
    socket.emit('queue-error', {
      code: 'queue-paused',
      message: 'Queue is paused. Resume the queue to call next.',
    });
    return;
  }

  // Step 5: Check for waiting patients
  const waitingPatients = state.queue.filter((p) => p.status === 'waiting');
  if (waitingPatients.length === 0) {
    socket.emit('queue-error', {
      code: 'empty-queue',
      message: 'No patients waiting in queue.',
    });
    return;
  }

  // Step 6: Acquire mutex
  const mutex = getMutex(clinicId);
  const release = await mutex.acquire();

  try {
    // Step 7: Take undo snapshot BEFORE any mutations
    // Cancel existing undo timeout if any
    const existingUndo = undoSnapshots.get(clinicId);
    if (existingUndo) {
      clearTimeout(existingUndo.timeoutRef);
      undoSnapshots.delete(clinicId);
    }

    const snapshot = deepCloneState(state);

    // Step 8: Implicit done — handle currently serving patient
    if (state.currentToken !== null) {
      const servingPatient = state.queue.find(
        (p) => p.status === 'serving' && p.token === state.currentToken
      );

      if (servingPatient && servingPatient.calledAt) {
        const now = Date.now();
        servingPatient.doneAt = now;
        servingPatient.status = 'done';

        const duration = (now - servingPatient.calledAt) / 60_000;

        // Check if outlier
        const outlier = isOutlier(
          duration,
          state.consultHistory,
          state.avgConsultTime
        );

        // Append to consultHistory (trim to last 10)
        state.consultHistory.push(duration);
        if (state.consultHistory.length > 10) {
          state.consultHistory = state.consultHistory.slice(-10);
        }

        // Write to DB asynchronously (don't await — fire and forget for speed)
        const sessionId = await getOrCreateSessionId(clinicId, state.avgConsultTime);
        writePatientHistory(servingPatient, sessionId, 'done').catch((err) =>
          console.error('[HANDLER] Error writing implicit done to DB:', err)
        );
        writeConsultDuration(clinicId, sessionId, duration, outlier).catch(
          (err) =>
            console.error('[HANDLER] Error writing implicit consult duration:', err)
        );
      }
    }

    // Step 9: Find next patient
    // Priority waiting patients are already sorted to front by applyPrioritySort
    const nextPatient = state.queue.find((p) => p.status === 'waiting');

    if (!nextPatient) {
      // Shouldn't happen since we checked above, but be defensive
      socket.emit('queue-error', {
        code: 'empty-queue',
        message: 'No patients waiting in queue.',
      });
      return;
    }

    // Step 10: Advance queue
    nextPatient.status = 'serving';
    nextPatient.calledAt = Date.now();
    state.currentToken = nextPatient.token;

    setState(clinicId, state);

    // Step 11: Store undo snapshot with 5-second expiry
    const timeoutRef = setTimeout(() => {
      undoSnapshots.delete(clinicId);
    }, UNDO_WINDOW_MS);

    undoSnapshots.set(clinicId, {
      snapshot,
      expiresAt: Date.now() + UNDO_WINDOW_MS,
      timeoutRef,
    });

    // Step 12: Compute wait estimate for the called patient
    const waitingAfterCall = state.queue.filter((p) => p.status === 'waiting');
    const estimatedWait =
      waitingAfterCall.length > 0
        ? computeWaitEstimate(
          1,
          state.consultHistory,
          state.avgConsultTime,
          0
        )
        : null;

    // Step 13: Broadcast to room
    const analytics = buildAnalytics(state);

    io.to(clinicId).emit('queue-update', { state, analytics });

    io.to(clinicId).emit('token-called', {
      token: nextPatient.token,
      name: nextPatient.name,
      estimatedWait,
      isRecall: false,
    });

    console.log(
      `[QUEUE] Called next: Token #${nextPatient.token} "${nextPatient.name}" ` +
      `in clinic ${clinicId}`
    );
  } finally {
    release();
  }
}