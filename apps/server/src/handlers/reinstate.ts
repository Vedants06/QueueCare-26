import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ReinstatePayload,
} from '../types';
import { validatePayload, reinstateSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { applyPrioritySort, insertAtFront, insertAtBack } from '../lib/prioritySort';
import { buildAnalytics } from '../lib/analyticsHelper';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'reinstate' socket event.
 *
 * Moves a patient from the absent tray back into the active queue.
 * Receptionist chooses position:
 *   'front' — before ALL waiting patients (regardless of priority)
 *   'back'  — after ALL waiting patients (priority sort then applies)
 *
 * 1. Validates payload and PIN
 * 2. Acquires mutex
 * 3. Finds patient in absentPatients[]
 * 4. Sets status to 'waiting', records reinstatedAt
 * 5. Moves patient from absentPatients[] to queue[]
 * 6. Inserts at chosen position
 * 7. Broadcasts queue-update + patient-reinstated
 */
export async function handleReinstate(
  io: TypedServer,
  socket: TypedSocket,
  payload: ReinstatePayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(reinstateSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, token, position, receptionistPin } = validation.data;

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
    // Step 5: Find patient in absent tray
    const absentIndex = state.absentPatients.findIndex(
      (p) => p.token === token
    );

    if (absentIndex === -1) {
      socket.emit('queue-error', {
        code: 'not-in-absent-tray',
        message: `Token #${token} is not in the absent patients tray.`,
      });
      return;
    }

    const patient = state.absentPatients[absentIndex];

    // Step 6: Update patient status
    patient.status = 'waiting';
    patient.reinstatedAt = Date.now();

    // Clear absentAt — patient has returned
    // (keep absentCount — it tracks lifetime absence count)

    // Step 7: Remove from absentPatients[]
    state.absentPatients.splice(absentIndex, 1);

    // Step 8: Insert into queue[] at chosen position
    if (position === 'front') {
      // 'front' puts patient before ALL waiting patients
      // This is an explicit receptionist decision, overrides priority sort
      state.queue = insertAtFront(state.queue, patient);
    } else {
      // 'back' puts patient after all waiting patients
      // Then priority sort places them correctly within their priority group
      state.queue = insertAtBack(state.queue, patient);
      state.queue = applyPrioritySort(state.queue);
    }

    setState(clinicId, state);

    // Step 9: Broadcast queue-update
    const analytics = buildAnalytics(state);
    io.to(clinicId).emit('queue-update', { state, analytics });

    // Step 10: Emit patient-reinstated to entire room
    // Patient mobile view uses this to show the green reinstated banner
    io.to(clinicId).emit('patient-reinstated', {
      token: patient.token,
      name: patient.name,
      position,
    });

    console.log(
      `[QUEUE] Reinstated: Token #${token} "${patient.name}" ` +
      `to ${position} of queue in clinic ${clinicId}`
    );
  } finally {
    release();
  }
}