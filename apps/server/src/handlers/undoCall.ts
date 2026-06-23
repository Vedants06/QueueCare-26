import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  UndoCallPayload,
} from '../types';
import { validatePayload, undoCallSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { setState } from '../lib/queueStore';
import { buildAnalytics } from '../lib/analyticsHelper';
import { undoSnapshots } from './callNext';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'undo-call' socket event.
 *
 * Reverts the last call-next within the 5-second undo window.
 * Restores the COMPLETE QueueState snapshot taken before call-next.
 *
 * 1. Validates payload and PIN
 * 2. Checks if undo snapshot exists for this clinic
 * 3. Checks if the 5-second window has expired
 * 4. Restores full QueueState from snapshot
 * 5. Cancels the expiry timeout
 * 6. Broadcasts queue-update
 */
export async function handleUndoCall(
  io: TypedServer,
  socket: TypedSocket,
  payload: UndoCallPayload
): Promise<void> {
  // Step 1: Validate
  const validation = validatePayload(undoCallSchema, payload);
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

  // Step 3: Check if undo snapshot exists
  const undoEntry = undoSnapshots.get(clinicId);

  if (!undoEntry) {
    socket.emit('queue-error', {
      code: 'undo-expired',
      message: 'No undo available. The 5-second window has passed.',
    });
    return;
  }

  // Step 4: Check if the window has expired
  if (Date.now() > undoEntry.expiresAt) {
    // Cleanup stale entry
    clearTimeout(undoEntry.timeoutRef);
    undoSnapshots.delete(clinicId);

    socket.emit('queue-error', {
      code: 'undo-expired',
      message: 'Undo window has expired.',
    });
    return;
  }

  // Step 5: Restore full QueueState from snapshot
  const restoredState = undoEntry.snapshot;
  setState(clinicId, restoredState);

  // Step 6: Cancel the expiry timeout and delete snapshot
  clearTimeout(undoEntry.timeoutRef);
  undoSnapshots.delete(clinicId);

  // Step 7: Broadcast updated state to room
  const analytics = buildAnalytics(restoredState);
  io.to(clinicId).emit('queue-update', { state: restoredState, analytics });

  console.log(
    `[QUEUE] Undo call-next in clinic ${clinicId}. ` +
    `State restored to token #${restoredState.currentToken ?? 'none'}`
  );
}