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
 * Clears any existing state first.
 *
 * Seeds:
 *   5 waiting patients (1 priority)
 *   1 absent patient (in absent tray)
 *   Rolling consultHistory with 2 real-looking durations
 *
 * The result is a queue that shows off every feature:
 *   - Multiple waiting patients (Call Next works)
 *   - A priority patient (sort order visible)
 *   - Absent tray populated (reinstate flows visible)
 *   - Wait estimates based on real data
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

  // Accept either receptionist or doctor PIN (both can seed)
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

    // Reset token counter so demo tokens start clean
    resetTokenCounter(clinicId);

    // Clear existing state
    state.queue = [];
    state.absentPatients = [];
    state.currentToken = null;
    state.isPaused = false;

    // Seed consultHistory with realistic durations (in minutes)
    // Two data points, still triggers fallback mode (needs 3+)
    // But shows analytics computed from data
    state.consultHistory = [8.5, 12.2];

    // Base timestamp for adding patients (staggered by 5-min intervals)
    const baseAddedAt = now - 30 * 60 * 1000; // 30 min ago

    const demoPatients: Array<Omit<Patient, 'accessToken'>> = [
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

    // Add access tokens
    state.queue = demoPatients.map((p) => ({
      ...p,
      accessToken: generateAccessToken(),
    }));

    // Add one absent patient
    const absentPatient: Patient = {
      token: getNextToken(clinicId),
      name: 'Sunil Rao',
      phone: '9678123456',
      clinicId,
      priority: false,
      status: 'absent',
      addedAt: baseAddedAt + 15 * 60 * 1000,
      absentAt: now - 8 * 60 * 1000, // absent 8 min ago
      absentCount: 1,
      accessToken: generateAccessToken(),
    };
    state.absentPatients = [absentPatient];

    // Apply priority sort
    state.queue = applyPrioritySort(state.queue);

    setState(clinicId, state);

    // Broadcast the seeded state to everyone in the room
    const analytics = buildAnalytics(state);
    io.to(clinicId).emit('queue-update', { state, analytics });

    console.log(
      `[SEED] Demo data loaded for clinic ${clinicId}: ` +
      `${state.queue.length} waiting, ${state.absentPatients.length} absent`
    );
  } finally {
    release();
  }
}