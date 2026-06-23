import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PauseQueuePayload,
} from '../types';
import { validatePayload, pauseQueueSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { buildAnalytics } from '../lib/analyticsHelper';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'pause-queue' socket event.
 *
 * Toggles the isPaused flag in QueueState.
 *
 * While paused:
 *   - call-next is blocked at server level
 *   - Display TV shows fullscreen pause overlay
 *   - Patient view shows amber "Queue paused" banner
 *   - Receptionist Call Next button is disabled
 *
 * 1. Validates payload and PIN
 * 2. Sets isPaused to the requested value
 * 3. Broadcasts queue-paused event (dedicated event for immediate UI reaction)
 * 4. Broadcasts queue-update (full state sync)
 */
export async function handlePauseQueue(
  io: TypedServer,
  socket: TypedSocket,
  payload: PauseQueuePayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(pauseQueueSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, pause, receptionistPin } = validation.data;

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

  // Step 4: Update pause state
  state.isPaused = pause;
  setState(clinicId, state);

  // Step 5: Broadcast queue-paused (dedicated event for immediate overlay response)
  io.to(clinicId).emit('queue-paused', { isPaused: pause });

  // Step 6: Broadcast full queue-update
  const analytics = buildAnalytics(state);
  io.to(clinicId).emit('queue-update', { state, analytics });

  console.log(
    `[QUEUE] Queue ${pause ? 'PAUSED' : 'RESUMED'} for clinic ${clinicId}`
  );
}