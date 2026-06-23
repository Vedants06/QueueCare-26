import type { WaitEstimate } from '@shared/types';

/**
 * Same algorithm as server — used for client-side display.
 * Computes wait estimate for a patient at a given position.
 *
 * Position = 1-based index in waiting-only queue.
 * Absent patients are NOT counted in position.
 */
export function computeWaitEstimate(
  position: number,
  consultHistory: number[],
  fallbackAvg: number,
  currentServingElapsedMin: number
): WaitEstimate {
  // Step 1: Filter outliers
  let mean = fallbackAvg;
  if (consultHistory.length > 0) {
    mean = consultHistory.reduce((sum, d) => sum + d, 0) / consultHistory.length;
  }

  const threshold = mean * 2.5;
  const clean = consultHistory.filter((d) => d <= threshold);

  // Step 2: Select average
  const dataPoints = clean.length;
  const useRealData = dataPoints >= 3;
  const avg = useRealData
    ? clean.reduce((sum, d) => sum + d, 0) / clean.length
    : fallbackAvg;

  // Step 3: Confidence margin
  const margin =
    dataPoints >= 10
      ? 0.2
      : dataPoints >= 5
        ? 0.3
        : dataPoints >= 3
          ? 0.4
          : 0.5;

  // Step 4: Estimated wait
  const remainingOnCurrent = Math.max(0, avg - currentServingElapsedMin);
  const estimated =
    position === 1
      ? remainingOnCurrent
      : remainingOnCurrent + (position - 1) * avg;
  const safeEstimated = Math.max(1, estimated);

  // Step 5: Apply margin
  const low = Math.max(1, Math.round(safeEstimated * (1 - margin)));
  const high = Math.round(safeEstimated * (1 + margin));

  return {
    low,
    high,
    dataPoints,
    isRealData: useRealData,
    confidenceMargin: margin,
  };
}

/**
 * Format a WaitEstimate as a human-readable string.
 * Examples: "~8–14 min", "~1 min", "< 1 min"
 */
export function formatWaitRange(estimate: WaitEstimate): string {
  if (estimate.low === estimate.high) {
    return `~${estimate.low} min`;
  }
  return `~${estimate.low}–${estimate.high} min`;
}

/**
 * Get the data source label for a wait estimate.
 */
export function getDataSourceLabel(estimate: WaitEstimate): string {
  if (estimate.isRealData) {
    return `Based on ${estimate.dataPoints} real consultation${estimate.dataPoints !== 1 ? 's' : ''}`;
  }
  return 'Based on receptionist estimate (not enough data yet)';
}