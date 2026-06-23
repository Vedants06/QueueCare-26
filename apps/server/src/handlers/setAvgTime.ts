import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SetAvgTimePayload,
} from '../types';
import { validatePayload, setAvgTimeSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { findActiveSession, updateSessionAvgTime } from '../db/session';
import { buildAnalytics } from '../lib/analyticsHelper';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'set-avg-time' socket event.
 *
 * Updates the fallback average consultation time.
 * This value is used when fewer than 3 real consultation data points exist.
 *
 * 1. Validates payload and PIN
 * 2. Updates in-memory state
 * 3. Updates DB session record
 * 4. Broadcasts queue-update (wait estimates recalculated on client)
 */
export async function handleSetAvgTime(
  io: TypedServer,
  socket: TypedSocket,
  payload: SetAvgTimePayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(setAvgTimeSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, minutes, receptionistPin } = validation.data;

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

  // Step 4: Update in-memory state
  state.avgConsultTime = minutes;
  setState(clinicId, state);

  // Step 5: Update DB session record
  const activeSession = await findActiveSession(clinicId);
  if (activeSession) {
    updateSessionAvgTime(activeSession.id, minutes).catch((err) =>
      console.error('[HANDLER] Error updating session avg time in DB:', err)
    );
  }

  // Step 6: Broadcast queue-update
  // All wait estimates on client screens will recalculate with new avg
  const analytics = buildAnalytics(state);
  io.to(clinicId).emit('queue-update', { state, analytics });

  console.log(
    `[QUEUE] Average consultation time set to ${minutes} min ` +
    `for clinic ${clinicId}`
  );
}