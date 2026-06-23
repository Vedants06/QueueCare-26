import type { QueueState, AnalyticsData } from '../types';
import { computeInMemoryAnalytics } from '../db/consultHistory';

/**
 * Compute analytics from current in-memory QueueState.
 * Used by all handlers that broadcast queue-update.
 * Keeps analytics logic in one place.
 */
export function buildAnalytics(state: QueueState): AnalyticsData {
  const servedCount = state.queue.filter((p) => p.status === 'done').length;
  const skippedCount = state.queue.filter((p) => p.status === 'skipped').length;
  const absentCount = state.absentPatients.length;

  // Count reinstated patients across both queue and absent tray
  const reinstatedInQueue = state.queue.filter(
    (p) => p.reinstatedAt !== undefined
  ).length;
  const reinstatedInAbsent = state.absentPatients.filter(
    (p) => p.reinstatedAt !== undefined
  ).length;
  const reinstatedCount = reinstatedInQueue + reinstatedInAbsent;

  return computeInMemoryAnalytics(
    servedCount,
    skippedCount,
    absentCount,
    reinstatedCount,
    state.consultHistory,
    state.avgConsultTime,
    state.sessionStartedAt
  );
}