import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RecallTokenPayload,
} from '../types';
import { validatePayload, recallTokenSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState } from '../lib/queueStore';
import { computeWaitEstimate } from '../lib/waitTime';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'recall-token' socket event.
 *
 * Re-announces the current serving token without advancing the queue.
 * Display screen plays a double chime (vs single for new call).
 *
 * No state changes. No DB writes. No duration recorded.
 *
 * 1. Validates payload and PIN
 * 2. Checks that a patient is currently being served
 * 3. Emits token-called with isRecall: true to room
 * 4. Emits recall-success to receptionist socket only
 */
export async function handleRecallToken(
  io: TypedServer,
  socket: TypedSocket,
  payload: RecallTokenPayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(recallTokenSchema, payload);
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

  // Step 4: Check currentToken exists
  if (state.currentToken === null) {
    socket.emit('queue-error', {
      code: 'not-found',
      message: 'No patient is currently being served.',
    });
    return;
  }

  // Step 5: Find serving patient
  const servingPatient = state.queue.find(
    (p) => p.token === state.currentToken && p.status === 'serving'
  );

  if (!servingPatient) {
    socket.emit('queue-error', {
      code: 'not-found',
      message: 'Serving patient not found in queue.',
    });
    return;
  }

  // Step 6: Compute wait estimate for display context
  const waitingCount = state.queue.filter((p) => p.status === 'waiting').length;
  const estimatedWait =
    waitingCount > 0
      ? computeWaitEstimate(
          1,
          state.consultHistory,
          state.avgConsultTime,
          servingPatient.calledAt
            ? (Date.now() - servingPatient.calledAt) / 60_000
            : 0
        )
      : null;

  // Step 7: Emit token-called with isRecall: true to entire room
  // Display will play double chime, patient view won't re-trigger position logic
  io.to(clinicId).emit('token-called', {
    token: servingPatient.token,
    name: servingPatient.name,
    estimatedWait,
    isRecall: true,
  });

  // Step 8: Emit recall-success to receptionist socket only
  socket.emit('recall-success', {
    token: servingPatient.token,
    name: servingPatient.name,
  });

  console.log(
    `[QUEUE] Recalled: Token #${servingPatient.token} "${servingPatient.name}" ` +
    `in clinic ${clinicId}`
  );
}