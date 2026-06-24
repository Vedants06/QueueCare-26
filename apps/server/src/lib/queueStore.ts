import type { QueueState } from '../types';

/**
 * In-memory store for active queue state.
 * One entry per clinicId.
 *
 * Active queue (waiting + serving) lives here.
 * Completed/skipped/absent patients go to PostgreSQL.
 *
 * On server restart: session metadata is restored from DB,
 * but active queue is lost (documented tradeoff).
 */
const stateStore = new Map<string, QueueState>();
const tokenCounters = new Map<string, number>();

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getState(clinicId: string): QueueState | undefined {
  return stateStore.get(clinicId);
}

export function setState(clinicId: string, state: QueueState): void {
  stateStore.set(clinicId, state);
}

export function initState(clinicId: string): QueueState {
  const state: QueueState = {
    clinicId,
    currentToken: null,
    queue: [],
    absentPatients: [],
    consultHistory: [],
    avgConsultTime: 10,
    isPaused: false,
    sessionStartedAt: Date.now(),
    lastDate: getTodayDate(),
  };

  stateStore.set(clinicId, state);
  tokenCounters.set(clinicId, 0);
  return state;
}

export function getOrInitState(clinicId: string): QueueState {
  const existing = stateStore.get(clinicId);
  if (existing) {
    return existing;
  }
  return initState(clinicId);
}

export function getNextToken(clinicId: string): number {
  const current = tokenCounters.get(clinicId) ?? 0;
  const next = current + 1;
  tokenCounters.set(clinicId, next);
  return next;
}

export function resetTokenCounter(clinicId: string): void {
  tokenCounters.set(clinicId, 0);
}

export function clearState(clinicId: string): void {
  stateStore.delete(clinicId);
  tokenCounters.delete(clinicId);
}

export function getAllClinicIds(): string[] {
  return Array.from(stateStore.keys());
}

export function getTokenCounter(clinicId: string): number {
  return tokenCounters.get(clinicId) ?? 0;
}

export function setTokenCounter(clinicId: string, value: number): void {
  tokenCounters.set(clinicId, value);
}

/**
 * Deep clone a QueueState for undo snapshots.
 * JSON parse/stringify is safe here because QueueState
 * contains only plain objects, arrays, numbers, and strings.
 */
export function deepCloneState(state: QueueState): QueueState {
  return JSON.parse(JSON.stringify(state)) as QueueState;
}