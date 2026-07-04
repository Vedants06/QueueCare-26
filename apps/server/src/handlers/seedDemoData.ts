import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SeedDemoDataPayload,
  Patient,
} from '../types';
import { validatePayload, seedDemoDataSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';
import { getOrInitState, setState, getNextToken, resetTokenCounter } from '../lib/queueStore';
import { getMutex } from '../lib/mutex';
import { applyPrioritySort } from '../lib/prioritySort';
import { buildAnalytics } from '../lib/analyticsHelper';
import { getOrCreateSessionId } from '../db/session';
import { writePatientHistory } from '../db/history';
import { writeConsultDuration } from '../db/consultHistory';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function generateAccessToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Seeds the queue with demo data for judges/testers.
 *
 * In-memory state:
 *   - 5 waiting patients (1 priority)
 *   - 1 absent patient (in absent tray)
 *   - consultHistory pre-populated with 2 realistic durations
 *
 * PostgreSQL:
 *   - 3 completed patients written to PatientHistory
 *     - 1 with just duration
 *     - 2 with duration + doctor notes
 *   - These show up in the History drawer immediately
 */
export async function handleSeedDemoData(
  io: TypedServer,
  socket: TypedSocket,
  payload: SeedDemoDataPayload
): Promise<void> {
  const validation = validatePayload(seedDemoDataSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, receptionistPin } = validation.data;

  if (!validatePin(receptionistPin) && !validatePin(receptionistPin, 'doctor')) {
    socket.emit('queue-error', {
      code: 'unauthorized',
      message: 'Invalid PIN',
    });
    return;
  }

  const mutex = getMutex(clinicId);
  const release = await mutex.acquire();

  try {
    const state = getOrInitState(clinicId);
    const now = Date.now();

    // Reset token counter
    resetTokenCounter(clinicId);

    // Clear in-memory state
    state.queue = [];
    state.absentPatients = [];
    state.currentToken = null;
    state.isPaused = false;

    // Pre-populate consultHistory with realistic durations
    state.consultHistory = [8.5, 12.2, 9.7];

    // ─── Write 3 completed patients to DB ────────────────
    // These will appear immediately in the History drawer
    const sessionId = await getOrCreateSessionId(clinicId, state.avgConsultTime);

    const completedPatients: Array<{
      token: number;
      name: string;
      phone: string;
      duration: number;
      notes: string | null;
    }> = [
      {
        // 1 with just duration (no notes)
        token: getNextToken(clinicId),
        name: 'Meera Krishnan',
        phone: '9845123467',
        duration: 8.5,
        notes: null,
      },
      {
        // 2 with duration + doctor notes
        token: getNextToken(clinicId),
        name: 'Neha Kapoor',
        phone: '9832145678',
        duration: 12.2,
        notes:
          'Regular BP check. Recommended dietary changes and reduced sodium intake. Follow-up in 2 weeks.',
      },
      {
        token: getNextToken(clinicId),
        name: 'Rajesh Nair',
        phone: '9756482310',
        duration: 9.7,
        notes:
          'Persistent cough for 5 days. Prescribed antibiotic course. Advised rest and hydration. Follow-up if symptoms persist beyond 7 days.',
      },
    ];

    // Fire-and-forget DB writes for completed patients
    for (const p of completedPatients) {
      const doneAt = now - (completedPatients.indexOf(p) + 1) * 15 * 60 * 1000;
      const calledAt = doneAt - p.duration * 60 * 1000;
      const addedAt = calledAt - 5 * 60 * 1000;

      const patient: Patient = {
        token: p.token,
        name: p.name,
        phone: p.phone,
        clinicId,
        priority: false,
        status: 'done',
        addedAt,
        calledAt,
        doneAt,
        absentCount: 0,
        accessToken: generateAccessToken(),
        notes: p.notes ?? undefined,
      };

      writePatientHistory(patient, sessionId, 'done').catch((err) =>
        console.error('[SEED] Error writing completed patient:', err)
      );

      // Also write the consult duration record
      writeConsultDuration(clinicId, sessionId, p.duration, false).catch((err) =>
        console.error('[SEED] Error writing consult duration:', err)
      );
    }

    // ─── Seed in-memory queue (5 waiting) ────────────────
    const baseAddedAt = now - 30 * 60 * 1000;

    const waitingPatients: Array<Omit<Patient, 'accessToken'>> = [
      {
        token: getNextToken(clinicId),
        name: 'Rahul Sharma',
        phone: '9876543210',
        clinicId,
        priority: false,
        status: 'waiting',
        addedAt: baseAddedAt,
        absentCount: 0,
      },
      {
        token: getNextToken(clinicId),
        name: 'Anita Desai',
        phone: '9812345678',
        clinicId,
        priority: true,
        status: 'waiting',
        addedAt: baseAddedAt + 3 * 60 * 1000,
        absentCount: 0,
      },
      {
        token: getNextToken(clinicId),
        name: 'Vikram Mehta',
        phone: '9765432198',
        clinicId,
        priority: false,
        status: 'waiting',
        addedAt: baseAddedAt + 6 * 60 * 1000,
        absentCount: 0,
      },
      {
        token: getNextToken(clinicId),
        name: 'Priya Iyer',
        phone: '9823456789',
        clinicId,
        priority: false,
        status: 'waiting',
        addedAt: baseAddedAt + 9 * 60 * 1000,
        absentCount: 0,
      },
      {
        token: getNextToken(clinicId),
        name: 'Karan Joshi',
        phone: '9734567812',
        clinicId,
        priority: false,
        status: 'waiting',
        addedAt: baseAddedAt + 12 * 60 * 1000,
        absentCount: 0,
      },
    ];

    state.queue = waitingPatients.map((p) => ({
      ...p,
      accessToken: generateAccessToken(),
    }));

    // ─── Seed in-memory absent patient ───────────────────
    const absentPatient: Patient = {
      token: getNextToken(clinicId),
      name: 'Sunil Rao',
      phone: '9678123456',
      clinicId,
      priority: false,
      status: 'absent',
      addedAt: baseAddedAt + 15 * 60 * 1000,
      absentAt: now - 8 * 60 * 1000,
      absentCount: 1,
      accessToken: generateAccessToken(),
    };
    state.absentPatients = [absentPatient];

    // Apply priority sort
    state.queue = applyPrioritySort(state.queue);

    setState(clinicId, state);

    // Broadcast the seeded state
    const analytics = buildAnalytics(state);
    io.to(clinicId).emit('queue-update', { state, analytics });

    console.log(
      `[SEED] Demo data loaded for clinic ${clinicId}: ` +
      `${state.queue.length} waiting, ${state.absentPatients.length} absent, ` +
      `${completedPatients.length} completed written to DB`
    );
  } finally {
    release();
  }
}