import { Mutex } from 'async-mutex';

/**
 * One Mutex per clinicId.
 * Lazy initialization: creates a new Mutex on first access for a clinic.
 *
 * Used to protect destructive operations:
 *   call-next, mark-done, mark-absent, reinstate, skip-token, reset-queue
 *
 * Prevents race conditions when multiple socket events arrive
 * simultaneously for the same clinic.
 *
 * Upgrade path: Replace with Redis SET NX when scaling to multiple
 * server instances. async-mutex is correct for single-server deployment.
 */
const mutexMap = new Map<string, Mutex>();

export function getMutex(clinicId: string): Mutex {
  let mutex = mutexMap.get(clinicId);
  if (!mutex) {
    mutex = new Mutex();
    mutexMap.set(clinicId, mutex);
  }
  return mutex;
}

export function deleteMutex(clinicId: string): void {
  mutexMap.delete(clinicId);
}