import type { WaitEstimate } from '../types';

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

  // Step 3: Confidence margin based on data points
  const margin =
    dataPoints >= 10
      ? 0.2
      : dataPoints >= 5
        ? 0.3
        : dataPoints >= 3
          ? 0.4
          : 0.5;

  // Step 4: Estimated wait
  // remainingOnCurrent: time left for the patient currently being served
  const remainingOnCurrent = Math.max(0, avg - currentServingElapsedMin);

  // position 1 = next to be called, waits only for current to finish
  // position 2 = waits for current + 1 full consultation, etc.
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

export function computeOutlierThreshold(consultHistory: number[], fallbackAvg: number): number {
  if (consultHistory.length === 0) {
    return fallbackAvg * 2.5;
  }
  const mean = consultHistory.reduce((sum, d) => sum + d, 0) / consultHistory.length;
  return mean * 2.5;
}

export function isOutlier(duration: number, consultHistory: number[], fallbackAvg: number): boolean {
  const threshold = computeOutlierThreshold(consultHistory, fallbackAvg);
  return duration > threshold;
}

export function computeCleanAverage(consultHistory: number[], fallbackAvg: number): number {
  if (consultHistory.length === 0) {
    return fallbackAvg;
  }

  const mean = consultHistory.reduce((sum, d) => sum + d, 0) / consultHistory.length;
  const threshold = mean * 2.5;
  const clean = consultHistory.filter((d) => d <= threshold);

  if (clean.length < 3) {
    return fallbackAvg;
  }

  return clean.reduce((sum, d) => sum + d, 0) / clean.length;
}

export function countOutliers(consultHistory: number[]): number {
  if (consultHistory.length === 0) {
    return 0;
  }

  const mean = consultHistory.reduce((sum, d) => sum + d, 0) / consultHistory.length;
  const threshold = mean * 2.5;
  return consultHistory.filter((d) => d > threshold).length;
}