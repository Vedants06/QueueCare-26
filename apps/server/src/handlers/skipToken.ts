import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SkipTokenPayload,
} from '../types';
import { validatePayload, skipTokenSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { getOrCreateSessionId } from '../db/session';
import { writePatientHistory } from '../db/history';
import { buildAnalytics } from '../lib/analyticsHelper';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'skip-token' socket event.
 *
 * Works on BOTH main queue and absent tray:
 *   - Waiting patient in queue[] → remove, write to DB as 'skipped'
 *   - Serving patient in queue[] → remove, clear currentToken, write to DB
 *   - Absent patient in absentPatients[] → remove from tray, write to DB
 *
 * This is a PERMANENT skip. Patient cannot be reinstated after this.
 *
 * 1. Validates payload and PIN
 * 2. Acquires mutex
 * 3. Searches queue[] first, then absentPatients[]
 * 4. Removes patient, updates state
 * 5. Writes to PostgreSQL
 * 6. Broadcasts queue-update
 */
export async function handleSkipToken(
  io: TypedServer,
  socket: TypedSocket,
  payload: SkipTokenPayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(skipTokenSchema, payload);
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
    // Step 5: Search queue[] first
    const queueIndex = state.queue.findIndex((p) => p.token === token);

    if (queueIndex !== -1) {
      const patient = state.queue[queueIndex];

      // If patient is currently serving, clear currentToken
      if (patient.status === 'serving') {
        state.currentToken = null;
      }

      // Mark as skipped
      patient.status = 'skipped';

      // Remove from queue
      state.queue.splice(queueIndex, 1);

      setState(clinicId, state);

      // Write to DB
      const sessionId = await getOrCreateSessionId(clinicId, state.avgConsultTime);
      writePatientHistory(patient, sessionId, 'skipped').catch((err) =>
        console.error('[HANDLER] Error writing skip to DB:', err)
      );

      // Broadcast
      const analytics = buildAnalytics(state);
      io.to(clinicId).emit('queue-update', { state, analytics });

      console.log(
        `[QUEUE] Skipped from queue: Token #${token} "${patient.name}" ` +
        `in clinic ${clinicId}`
      );
      return;
    }

    // Step 6: Search absentPatients[]
    const absentIndex = state.absentPatients.findIndex(
      (p) => p.token === token
    );

    if (absentIndex !== -1) {
      const patient = state.absentPatients[absentIndex];

      // Mark as skipped
      patient.status = 'skipped';

      // Remove from absent tray
      state.absentPatients.splice(absentIndex, 1);

      setState(clinicId, state);

      // Write to DB
      const sessionId = await getOrCreateSessionId(clinicId, state.avgConsultTime);
      writePatientHistory(patient, sessionId, 'skipped').catch((err) =>
        console.error('[HANDLER] Error writing absent-skip to DB:', err)
      );

      // Broadcast
      const analytics = buildAnalytics(state);
      io.to(clinicId).emit('queue-update', { state, analytics });

      console.log(
        `[QUEUE] Permanently skipped from absent tray: Token #${token} ` +
        `"${patient.name}" in clinic ${clinicId}`
      );
      return;
    }

    // Step 7: Not found in either location
    socket.emit('queue-error', {
      code: 'not-found',
      message: `Token #${token} not found in queue or absent tray.`,
    });
  } finally {
    release();
  }
}