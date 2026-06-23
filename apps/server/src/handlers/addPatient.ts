import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  AddPatientPayload,
  Patient,
} from '../types';
import { buildAnalytics } from '../lib/analyticsHelper';
import { validatePayload, addPatientSchema } from '../lib/validation';
import { getOrInitState, setState, getNextToken } from '../lib/queueStore';
import { applyPrioritySort } from '../lib/prioritySort';
import { startTimer } from '../lib/consultationTimer';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handles 'add-patient' socket event.
 *
 * 1. Validates payload
 * 2. Checks for duplicate (same phone within 30 seconds)
 * 3. Generates auto-incrementing token
 * 4. Creates Patient, pushes to queue, applies priority sort
 * 5. If priority patient added while paused: emits priority-alert
 * 6. Emits patient-added to receptionist (triggers QR modal)
 * 7. Broadcasts queue-update to entire room
 *
 * NOTE: No PIN required for add-patient.
 * Anyone with access to the receptionist screen can add patients.
 */
export async function handleAddPatient(
  io: TypedServer,
  socket: TypedSocket,
  payload: AddPatientPayload
): Promise<void> {
  // Step 1: Validate payload
  const validation = validatePayload(addPatientSchema, payload);
  if (!validation.success) {
    socket.emit('queue-error', {
      code: 'invalid-payload',
      message: validation.error,
    });
    return;
  }

  const { clinicId, name, phone, priority } = validation.data;

  // Step 2: Get or initialize state
  const state = getOrInitState(clinicId);

  // Step 3: Duplicate check — same phone within 30 seconds
  if (phone && phone.trim().length > 0) {
    const thirtySecondsAgo = Date.now() - 30_000;
    const phoneTrimmed = phone.trim();

    // Check both active queue and absent tray
    const duplicateInQueue = state.queue.find(
      (p) =>
        p.phone === phoneTrimmed &&
        p.addedAt > thirtySecondsAgo
    );

    const duplicateInAbsent = state.absentPatients.find(
      (p) =>
        p.phone === phoneTrimmed &&
        p.addedAt > thirtySecondsAgo
    );

    const duplicate = duplicateInQueue || duplicateInAbsent;

    if (duplicate) {
      socket.emit('duplicate-warning', {
        existingToken: duplicate.token,
        name: duplicate.name,
        phone: phoneTrimmed,
      });
      return;
    }
  }

  // Step 4: Generate token and create patient
  const token = getNextToken(clinicId);

  const patient: Patient = {
    token,
    name: name.trim(),
    phone: phone?.trim() || undefined,
    clinicId,
    priority: priority ?? false,
    status: 'waiting',
    addedAt: Date.now(),
    absentCount: 0,
  };

  // Step 5: Add to queue and apply priority sort
  state.queue.push(patient);
  state.queue = applyPrioritySort(state.queue);
  setState(clinicId, state);

  // Step 6: Start consultation timer if not already running
  startTimer(clinicId, io);

  // Step 7: Priority while paused check
  if (patient.priority && state.isPaused) {
    socket.emit('priority-alert', {
      token: patient.token,
      name: patient.name,
    });
  }

  // Step 8: Emit patient-added to the receptionist socket only
  // This triggers the QR code modal on the receptionist screen
  socket.emit('patient-added', { patient });

  // Step 9: Broadcast queue-update to entire room
  const analytics = buildAnalytics(state);

  io.to(clinicId).emit('queue-update', { state, analytics });

  console.log(
    `[QUEUE] Patient added: Token #${token} "${name}" ` +
    `(priority: ${patient.priority}) to clinic ${clinicId}`
  );
}