import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../types';
import { getState } from './queueStore';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Per-clinic timer that checks every 60 seconds if the current
 * consultation is running longer than expected.
 *
 * If (now - calledAt) > 2 × avgConsultTime:
 *   Emits 'consultation-warning' to the clinic room.
 *   Only the receptionist screen listens to this event.
 *
 * The timer does NOT block the queue or take any action.
 * It is purely informational.
 */
const timers = new Map<string, NodeJS.Timeout>();

const CHECK_INTERVAL_MS = 60_000; // 60 seconds

export function startTimer(clinicId: string, io: TypedServer): void {
  // Don't create duplicate timers
  if (timers.has(clinicId)) {
    return;
  }

  const intervalId = setInterval(() => {
    const state = getState(clinicId);

    if (!state) {
      // Clinic state was cleared — stop the timer
      stopTimer(clinicId);
      return;
    }

    // No one is currently being served — nothing to check
    if (state.currentToken === null) {
      return;
    }

    // Find the serving patient
    const servingPatient = state.queue.find(
      (p) => p.status === 'serving' && p.token === state.currentToken
    );

    if (!servingPatient || !servingPatient.calledAt) {
      return;
    }

    const elapsedMs = Date.now() - servingPatient.calledAt;
    const elapsedMinutes = elapsedMs / 60_000;
    const threshold = state.avgConsultTime * 2;

    if (elapsedMinutes > threshold) {
      io.to(clinicId).emit('consultation-warning', {
        token: servingPatient.token,
        name: servingPatient.name,
        elapsedMinutes: Math.round(elapsedMinutes),
        avgMinutes: Math.round(state.avgConsultTime),
      });
    }
  }, CHECK_INTERVAL_MS);

  timers.set(clinicId, intervalId);
}

export function stopTimer(clinicId: string): void {
  const intervalId = timers.get(clinicId);
  if (intervalId) {
    clearInterval(intervalId);
    timers.delete(clinicId);
  }
}

export function stopAllTimers(): void {
  for (const [clinicId, intervalId] of timers.entries()) {
    clearInterval(intervalId);
    timers.delete(clinicId);
  }
}

export function isTimerRunning(clinicId: string): boolean {
  return timers.has(clinicId);
}