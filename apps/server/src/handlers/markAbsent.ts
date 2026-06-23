import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MarkAbsentPayload,
} from '../types';
import { validatePayload, markAbsentSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { buildAnalytics } from '../lib/analyticsHelper';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'mark-absent' socket event.
 *
 * Called when a patient's token is called but they are not present.
 * DIFFERENT from skip: this is temporary — the patient can be reinstated.
 *
 * 1. Validates payload and PIN
 * 2. Acquires mutex
 * 3. Finds patient in queue — must be currently 'serving'
 * 4. Sets status to 'absent', records absentAt, increments absentCount
 * 5. Clears calledAt (consultation never started)
 * 6. Moves patient from queue[] to absentPatients[]
 * 7. Sets currentToken to null
 * 8. Broadcasts queue-update
 *
 * Does NOT write to PostgreSQL — patient may return.
 * Written to DB only when permanently skipped or session ends.
 */
export async function handleMarkAbsent(
  io: TypedServer,
  socket: TypedSocket,
  payload: MarkAbsentPayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(markAbsentSchema, payload);
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
      (p) => p.token === token
    );

    if (patientIndex === -1) {
      socket.emit('queue-error', {
        code: 'not-found',
        message: `Token #${token} not found in queue.`,
      });
      return;
    }

    const patient = state.queue[patientIndex];

    // Only serving patients can be marked absent
    if (patient.status !== 'serving') {
      socket.emit('queue-error', {
        code: 'already-serving',
        message: `Token #${token} is not currently being served. Only serving patients can be marked absent.`,
      });
      return;
    }

    // Step 6: Update patient status
    patient.status = 'absent';
    patient.absentAt = Date.now();
    patient.absentCount += 1;

    // Clear calledAt — consultation never happened, no duration to record
    patient.calledAt = undefined;

    // Step 7: Remove from queue[], add to absentPatients[]
    state.queue.splice(patientIndex, 1);
    state.absentPatients.push(patient);

    // Step 8: Clear currentToken — no one is being served now
    state.currentToken = null;

    setState(clinicId, state);

    // Step 9: Broadcast queue-update to room
    const analytics = buildAnalytics(state);
    io.to(clinicId).emit('queue-update', { state, analytics });

    console.log(
      `[QUEUE] Marked absent: Token #${token} "${patient.name}" ` +
      `in clinic ${clinicId}. Absent count: ${patient.absentCount}`
    );
  } finally {
    release();
  }
}