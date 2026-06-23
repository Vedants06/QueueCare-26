import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../types';
import { setState, setTokenCounter } from '../lib/queueStore';
import { findAllActiveSessions } from '../db/session';
import { getLastTenDurations } from '../db/consultHistory';
import { startTimer } from '../lib/consultationTimer';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Restores clinic session metadata from PostgreSQL on server boot.
 *
 * What IS restored:
 *   - Session metadata (avgConsultTime, sessionStartedAt)
 *   - consultHistory (last 10 non-outlier durations from DB)
 *   - Consultation timer for each clinic
 *
 * What is NOT restored:
 *   - Active queue (waiting/serving patients)
 *   - Absent patients tray
 *   - Token counter (restarts from 0)
 *   - Undo snapshots
 *   - Pause state
 *
 * This is a documented tradeoff:
 *   Active queue lives in memory for sub-millisecond real-time access.
 *   On server crash, the active queue is lost.
 *   Patient history (done/skipped/absent) is in PostgreSQL and survives.
 *
 * To persist active queue across restarts, Redis would be needed.
 * For a single-server hackathon deployment, this tradeoff is acceptable.
 */
export async function restoreSession(io: TypedServer): Promise<void> {
  console.log('[STARTUP] Checking for active clinic sessions...');

  const activeSessions = await findAllActiveSessions();

  if (activeSessions.length === 0) {
    console.log('[STARTUP] No active sessions found. Starting fresh.');
    return;
  }

  console.log(`[STARTUP] Found ${activeSessions.length} active session(s). Restoring...`);

  for (const session of activeSessions) {
    const { clinicId } = session;

    // Restore consultHistory from DB
    const consultHistory = await getLastTenDurations(clinicId);

    // Build the in-memory state from session metadata
    // Queue starts empty — active patients are not persisted
    setState(clinicId, {
      clinicId,
      currentToken: null,
      queue: [],
      absentPatients: [],
      consultHistory,
      avgConsultTime: session.avgConsultTime,
      isPaused: false,
      sessionStartedAt: session.startedAt.getTime(),
      lastDate: session.date,
    });

    // Token counter starts at 0
    // New patients will get token #1, #2, etc.
    // This is acceptable: previous tokens from the crashed session
    // are in patient_history DB, and those patients would need
    // to re-register anyway since the queue is cleared.
    setTokenCounter(clinicId, 0);

    // Start the consultation timer
    startTimer(clinicId, io);

    console.log(
      `[STARTUP] Restored clinic ${clinicId}: ` +
      `avgConsult=${session.avgConsultTime}min, ` +
      `consultHistory=${consultHistory.length} entries, ` +
      `session=${session.id}`
    );
  }

  console.log('[STARTUP] Session restoration complete.');
}