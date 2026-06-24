import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MarkDonePayload,
} from '../types';
import { validatePayload, markDoneSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getState, setState } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { isOutlier, computeCleanAverage } from '../lib/waitTime';
import { getOrCreateSessionId } from '../db/session';
import { writePatientHistory } from '../db/history';
import { writeConsultDuration } from '../db/consultHistory';
import { buildAnalytics } from '../lib/analyticsHelper';
import { undoSnapshots } from './callNext';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export async function handleMarkDone(
  io: TypedServer,
  socket: TypedSocket,
  payload: MarkDonePayload
): Promise<void> {
  console.log('[MARK-DONE] Received payload:', payload);

  const validation = validatePayload(markDoneSchema, payload);
  if (!validation.success) {
    console.log('[MARK-DONE] Validation failed:', validation.error);
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, token, receptionistPin } = validation.data;

  if (!validatePin(receptionistPin)) {
    console.log('[MARK-DONE] PIN validation failed');
    socket.emit('queue-error', {
      code: 'unauthorized',
      message: 'Invalid receptionist PIN',
    });
    return;
  }

  const state = getState(clinicId);
  if (!state) {
    console.log('[MARK-DONE] No state found for clinic:', clinicId);
    socket.emit('queue-error', {
      code: 'not-found',
      message: 'Clinic not found.',
    });
    return;
  }

  console.log('[MARK-DONE] Current state:');
  console.log('  currentToken:', state.currentToken);
  console.log('  queue:', state.queue.map(p => `#${p.token}(${p.status})`).join(', '));

  const mutex = getMutex(clinicId);
  const release = await mutex.acquire();

  try {
    const patientIndex = state.queue.findIndex(
      (p) => p.token === token && p.status === 'serving'
    );

    console.log('[MARK-DONE] Looking for token', token, 'with status=serving');
    console.log('[MARK-DONE] Found at index:', patientIndex);

    if (patientIndex === -1) {
      console.log('[MARK-DONE] ❌ Patient not found as serving');
      socket.emit('queue-error', {
        code: 'not-found',
        message: `Token #${token} is not currently being served.`,
      });
      return;
    }

    const patient = state.queue[patientIndex];

    const now = Date.now();
    patient.doneAt = now;
    patient.status = 'done';

    let duration = 0;
    if (patient.calledAt) {
      duration = (now - patient.calledAt) / 60_000;
    }

    const outlier = isOutlier(
      duration,
      state.consultHistory,
      state.avgConsultTime
    );

    state.consultHistory.push(duration);
    if (state.consultHistory.length > 10) {
      state.consultHistory = state.consultHistory.slice(-10);
    }

    state.avgConsultTime = computeCleanAverage(
      state.consultHistory,
      state.avgConsultTime
    );

    state.currentToken = null;

    setState(clinicId, state);

    console.log('[MARK-DONE] ✅ State updated:');
    console.log('  currentToken:', state.currentToken);
    console.log('  patient status:', patient.status);

    const existingUndo = undoSnapshots.get(clinicId);
    if (existingUndo) {
      clearTimeout(existingUndo.timeoutRef);
      undoSnapshots.delete(clinicId);
    }

    // Try DB writes but don't crash if DB is offline
    try {
      const sessionId = await getOrCreateSessionId(clinicId, state.avgConsultTime);
      writePatientHistory(patient, sessionId, 'done').catch((err) =>
        console.error('[HANDLER] Error writing mark-done patient history:', err)
      );
      writeConsultDuration(clinicId, sessionId, duration, outlier).catch((err) =>
        console.error('[HANDLER] Error writing mark-done consult duration:', err)
      );
    } catch (dbError) {
      console.warn('[MARK-DONE] DB write skipped (no DB connection):', dbError);
    }

    const analytics = buildAnalytics(state);

    console.log('[MARK-DONE] 📡 Broadcasting queue-update to clinic:', clinicId);
    io.to(clinicId).emit('queue-update', { state, analytics });

    socket.emit('mark-done-success', {
      token,
      duration: Math.round(duration * 10) / 10,
    });

    console.log(
      `[MARK-DONE] ✓ Complete: Token #${token}. Duration: ${duration.toFixed(1)} min. Outlier: ${outlier}`
    );
  } finally {
    release();
  }
}