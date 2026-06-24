import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SetNotesPayload,
} from '../types';
import { validatePayload, setNotesSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { buildAnalytics } from '../lib/analyticsHelper';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'set-notes' socket event from doctor.
 * Stores notes on the patient object.
 * Notes are written to PostgreSQL when patient is marked done.
 */
export async function handleSetNotes(
  io: TypedServer,
  socket: TypedSocket,
  payload: SetNotesPayload
): Promise<void> {
  const validation = validatePayload(setNotesSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, token, notes, doctorPin } = validation.data;

  // Use doctor role for PIN check
  if (!validatePin(doctorPin, 'doctor')) {
    socket.emit('queue-error', {
      code: 'unauthorized',
      message: 'Invalid doctor PIN',
    });
    return;
  }

  const state = getState(clinicId);
  if (!state) {
    socket.emit('queue-error', {
      code: 'not-found',
      message: 'Clinic not found.',
    });
    return;
  }

  const mutex = getMutex(clinicId);
  const release = await mutex.acquire();

  try {
    // Find patient — can be serving or in queue
    const patient = state.queue.find((p) => p.token === token);

    if (!patient) {
      socket.emit('queue-error', {
        code: 'not-found',
        message: `Token #${token} not found in queue.`,
      });
      return;
    }

    patient.notes = notes.trim() || undefined;
    setState(clinicId, state);

    const analytics = buildAnalytics(state);
    io.to(clinicId).emit('queue-update', { state, analytics });

    console.log(
      `[NOTES] Updated for Token #${token} in clinic ${clinicId}: ${notes.length} chars`
    );
  } finally {
    release();
  }
}