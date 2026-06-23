import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  JoinClinicPayload,
} from '../types';
import { validatePayload } from '../lib/validation';
import { joinClinicSchema } from '../lib/validation';
import { getOrInitState, setState } from '../lib/queueStore';
import { findActiveSession, createSession, closeSession } from '../db/session';
import { getLastTenDurations } from '../db/consultHistory';
import { startTimer } from '../lib/consultationTimer';

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
 * Handles 'join-clinic' socket event.
 *
 * 1. Validates payload
 * 2. Joins the socket to the clinic room
 * 3. Gets or initializes queue state for this clinic
 * 4. Checks if a new calendar day has started (daily reset)
 * 5. Emits 'state-sync' to the joining socket ONLY (not entire room)
 */
export async function handleJoinClinic(
  io: TypedServer,
  socket: TypedSocket,
  payload: JoinClinicPayload
): Promise<void> {
  // Step 1: Validate payload
  const validation = validatePayload(joinClinicSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId } = validation.data;

  // Step 2: Join the Socket.IO room for this clinic
  await socket.join(clinicId);
  console.log(`[SOCKET] ${socket.id} joined clinic room: ${clinicId}`);

  // Step 3: Get or initialize state
  const state = getOrInitState(clinicId);

  // Step 4: Daily reset check
  const today = getTodayDate();

  if (state.lastDate !== today) {
    console.log(
      `[QUEUE] New day detected for clinic ${clinicId}. Previous: ${state.lastDate}, Today: ${today}`
    );

    // Close old session in DB
    const oldSession = await findActiveSession(clinicId);
    if (oldSession) {
      await closeSession(oldSession.id);
    }

    // Create new session in DB
    const newSession = await createSession(clinicId, state.avgConsultTime);

    // Reset in-memory consultation history for the new day
    // Keep avgConsultTime (receptionist-set fallback carries over)
    // Keep queue and absentPatients (patients from overnight stay? unlikely but safe)
    state.consultHistory = [];
    state.lastDate = today;
    state.sessionStartedAt = newSession.startedAt.getTime();

    setState(clinicId, state);

    console.log(`[QUEUE] Daily reset complete. New session: ${newSession.id}`);
  } else {
    // Not a new day — check if we have consultHistory from DB
    // (might have been cleared on server restart)
    if (state.consultHistory.length === 0) {
      const durations = await getLastTenDurations(clinicId);
      if (durations.length > 0) {
        state.consultHistory = durations;
        setState(clinicId, state);
        console.log(
          `[QUEUE] Restored ${durations.length} consultation durations from DB for clinic ${clinicId}`
        );
      }
    }
  }

  // Step 5: Start consultation timer if not already running
  startTimer(clinicId, io);

  // Step 6: Emit full state to the joining socket only
  socket.emit('state-sync', state);
}