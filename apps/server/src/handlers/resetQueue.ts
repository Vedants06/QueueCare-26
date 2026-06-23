import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ResetQueuePayload,
} from '../types';
import { validatePayload, resetQueueSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState, resetTokenCounter } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { findActiveSession, closeSession, createSession } from '../db/session';
import { writePatientHistory } from '../db/history';
import { buildAnalytics } from '../lib/analyticsHelper';
import { undoSnapshots } from './callNext';
import { stopTimer, startTimer } from '../lib/consultationTimer';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Handles 'reset-queue' socket event.
 *
 * Danger Zone operation — clears all queue data and starts fresh.
 * Double confirmation is handled on the client side.
 *
 * 1. Validates payload and PIN
 * 2. Acquires mutex
 * 3. Writes all remaining absent patients to DB as 'skipped'
 *    (session is ending, they can't be reinstated after reset)
 * 4. Clears queue, absentPatients, consultHistory
 * 5. Resets token counter to 0 (next patient gets #1)
 * 6. Closes active DB session, creates new one
 * 7. Cancels undo timeout
 * 8. Restarts consultation timer
 * 9. Broadcasts queue-reset + queue-update
 */
export async function handleResetQueue(
  io: TypedServer,
  socket: TypedSocket,
  payload: ResetQueuePayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(resetQueueSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, receptionistPin } = validation.data;

  // Step 2: Validate PIN
  if (!validatePin(receptionistPin)) {
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
      message: 'Clinic not found.',
    });
    return;
  }

  // Step 4: Acquire mutex
  const mutex = getMutex(clinicId);
  const release = await mutex.acquire();

  try {
    // Step 5: Find active session ID for DB writes
    const activeSession = await findActiveSession(clinicId);
    const sessionId = activeSession?.id;

    // Step 6: Write remaining absent patients to DB as 'skipped'
    // They can't be reinstated after a reset — session is ending
    if (sessionId) {
      for (const patient of state.absentPatients) {
        patient.status = 'skipped';
        writePatientHistory(patient, sessionId, 'skipped').catch((err) =>
          console.error('[HANDLER] Error writing absent patient on reset:', err)
        );
      }

      // Also write any remaining waiting/serving patients as 'skipped'
      for (const patient of state.queue) {
        if (patient.status === 'waiting' || patient.status === 'serving') {
          patient.status = 'skipped';
          writePatientHistory(patient, sessionId, 'skipped').catch((err) =>
            console.error('[HANDLER] Error writing queue patient on reset:', err)
          );
        }
      }
    }

    // Step 7: Close active DB session
    if (sessionId) {
      await closeSession(sessionId);
    }

    // Step 8: Create new DB session
    const newSession = await createSession(clinicId, state.avgConsultTime);

    // Step 9: Clear in-memory state
    const now = Date.now();

    state.queue = [];
    state.absentPatients = [];
    state.currentToken = null;
    state.consultHistory = [];
    state.isPaused = false;
    state.sessionStartedAt = now;
    state.lastDate = getTodayDate();

    // Keep avgConsultTime — receptionist setting carries over

    setState(clinicId, state);

    // Step 10: Reset token counter (next patient gets #1)
    resetTokenCounter(clinicId);

    // Step 11: Cancel any active undo timeout
    const existingUndo = undoSnapshots.get(clinicId);
    if (existingUndo) {
      clearTimeout(existingUndo.timeoutRef);
      undoSnapshots.delete(clinicId);
    }

    // Step 12: Restart consultation timer
    stopTimer(clinicId);
    startTimer(clinicId, io);

    // Step 13: Broadcast queue-reset (dedicated event with sessionStartedAt)
    // Patient views compare addedAt vs sessionStartedAt to show expired banner
    io.to(clinicId).emit('queue-reset', { sessionStartedAt: now });

    // Step 14: Broadcast full queue-update
    const analytics = buildAnalytics(state);
    io.to(clinicId).emit('queue-update', { state, analytics });

    console.log(
      `[QUEUE] Queue RESET for clinic ${clinicId}. ` +
      `New session: ${newSession.id}. Tokens restart from 1.`
    );
  } finally {
    release();
  }
}