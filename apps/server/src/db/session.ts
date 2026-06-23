import { prisma } from './prisma';

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Find the currently active session for a clinic on today's date.
 * Returns null if no active session exists.
 */
export async function findActiveSession(clinicId: string) {
  try {
    const session = await prisma.clinicSession.findFirst({
      where: {
        clinicId,
        isActive: true,
        date: getTodayDate(),
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return session;
  } catch (error) {
    console.error(`[DB] Error finding active session for clinic ${clinicId}:`, error);
    return null;
  }
}

/**
 * Find ALL active sessions across all clinics.
 * Used on server startup to restore in-memory state.
 */
export async function findAllActiveSessions() {
  try {
    const sessions = await prisma.clinicSession.findMany({
      where: {
        isActive: true,
        date: getTodayDate(),
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return sessions;
  } catch (error) {
    console.error('[DB] Error finding all active sessions:', error);
    return [];
  }
}

/**
 * Create a new clinic session.
 * Before creating, closes any existing active session for the same clinic.
 */
export async function createSession(
  clinicId: string,
  avgConsultTime: number = 10
) {
  try {
    // Close any existing active sessions for this clinic
    await prisma.clinicSession.updateMany({
      where: {
        clinicId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create the new session
    const session = await prisma.clinicSession.create({
      data: {
        clinicId,
        date: getTodayDate(),
        avgConsultTime,
        isActive: true,
      },
    });

    console.log(`[DB] New session created for clinic ${clinicId}: ${session.id}`);
    return session;
  } catch (error) {
    console.error(`[DB] Error creating session for clinic ${clinicId}:`, error);
    throw error;
  }
}

/**
 * Close a specific session by marking it inactive.
 */
export async function closeSession(sessionId: string): Promise<void> {
  try {
    await prisma.clinicSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  } catch (error) {
    console.error(`[DB] Error closing session ${sessionId}:`, error);
  }
}

/**
 * Update the fallback average consultation time for a session.
 * Called when receptionist sets a new average via set-avg-time event.
 */
export async function updateSessionAvgTime(
  sessionId: string,
  minutes: number
): Promise<void> {
  try {
    await prisma.clinicSession.update({
      where: { id: sessionId },
      data: { avgConsultTime: minutes },
    });
  } catch (error) {
    console.error(`[DB] Error updating avg time for session ${sessionId}:`, error);
  }
}

/**
 * Get session ID for a clinic, creating one if none exists.
 * Used by handlers that need a sessionId to write patient history.
 */
export async function getOrCreateSessionId(
  clinicId: string,
  avgConsultTime: number = 10
): Promise<string> {
  const existing = await findActiveSession(clinicId);
  if (existing) {
    return existing.id;
  }

  const created = await createSession(clinicId, avgConsultTime);
  return created.id;
}