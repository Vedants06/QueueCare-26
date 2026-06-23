import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MarkDonePayload,
} from '../types';
import { validatePayload, markDoneSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { isOutlier, computeCleanAverage } from '../lib/waitTime';
import { getOrCreateSessionId } from '../db/session';
import { writePatientHistory } from '../db/history';
import { buildAnalytics } from '../lib/analyticsHelper';
import { writeConsultDuration} from '../db/consultHistory';
import { undoSnapshots } from './callNext';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'mark-done' socket event.
 *
 * 1. Validates payload and PIN
 * 2. Acquires mutex (try/finally)
 * 3. Finds serving patient by token
 * 4. Records true consultation duration (doneAt - calledAt)
 * 5. Checks outlier status
 * 6. Appends to consultHistory, updates rolling average
 * 7. Writes to PostgreSQL: PatientHistory + ConsultHistory
 * 8. Sets currentToken to null (doctor explicitly finished)
 * 9. Cancels any active undo timeout
 * 10. Broadcasts queue-update, emits mark-done-success
 *
 * Does NOT advance queue. Receptionist calls next separately.
 */
export async function handleMarkDone(
  io: TypedServer,
  socket: TypedSocket,
  payload: MarkDonePayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(markDoneSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, token, receptionistPin } = validation.data;

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
    // Step 5: Find the serving patient
    const patientIndex = state.queue.findIndex(
      (p) => p.token === token && p.status === 'serving'
    );

    if (patientIndex === -1) {
      socket.emit('queue-error', {
        code: 'not-found',
        message: `Token #${token} is not currently being served.`,
      });
      return;
    }

    const patient = state.queue[patientIndex];

    // Step 6: Record done timestamp and compute duration
    const now = Date.now();
    patient.doneAt = now;
    patient.status = 'done';

    let duration = 0;
    if (patient.calledAt) {
      duration = (now - patient.calledAt) / 60_000; // ms to minutes
    }

    // Step 7: Check outlier status
    const outlier = isOutlier(
      duration,
      state.consultHistory,
      state.avgConsultTime
    );

    // Step 8: Append to consultHistory (trim to last 10)
    state.consultHistory.push(duration);
    if (state.consultHistory.length > 10) {
      state.consultHistory = state.consultHistory.slice(-10);
    }

    // Step 9: Update rolling average
    // computeCleanAverage handles outlier filtering internally
    state.avgConsultTime = computeCleanAverage(
      state.consultHistory,
      state.avgConsultTime
    );

    // Step 10: Set currentToken to null — doctor explicitly finished
    state.currentToken = null;

    setState(clinicId, state);

    // Step 11: Cancel undo timeout if active
    const existingUndo = undoSnapshots.get(clinicId);
    if (existingUndo) {
      clearTimeout(existingUndo.timeoutRef);
      undoSnapshots.delete(clinicId);
    }

    // Step 12: Write to PostgreSQL
    const sessionId = await getOrCreateSessionId(clinicId, state.avgConsultTime);

    writePatientHistory(patient, sessionId, 'done').catch((err) =>
      console.error('[HANDLER] Error writing mark-done patient history:', err)
    );
    writeConsultDuration(clinicId, sessionId, duration, outlier).catch((err) =>
      console.error('[HANDLER] Error writing mark-done consult duration:', err)
    );

    // Step 13: Broadcast to room
    const analytics = buildAnalytics(state);

    io.to(clinicId).emit('queue-update', { state, analytics });

    // Step 14: Emit success to receptionist only
    socket.emit('mark-done-success', {
      token,
      duration: Math.round(duration * 10) / 10,
    });

    console.log(
      `[QUEUE] Marked done: Token #${token} in clinic ${clinicId}. ` +
      `Duration: ${duration.toFixed(1)} min. Outlier: ${outlier}`
    );
  } finally {
    release();
  }
}