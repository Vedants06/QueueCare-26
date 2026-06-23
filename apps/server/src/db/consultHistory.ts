import { prisma } from './prisma';
import type { AnalyticsData } from '../types';

/**
 * Write a consultation duration to the history table.
 * Called when mark-done completes successfully.
 */
export async function writeConsultDuration(
  clinicId: string,
  sessionId: string,
  duration: number,
  isOutlier: boolean
): Promise<void> {
  try {
    await prisma.consultHistory.create({
      data: {
        clinicId,
        sessionId,
        duration,
        isOutlier,
      },
    });
  } catch (error) {
    console.error(
      `[DB] Error writing consult duration for clinic ${clinicId}:`,
      error
    );
  }
}

/**
 * Get the last 10 non-outlier consultation durations for a clinic.
 * Used to rebuild consultHistory in memory on server restart.
 */
export async function getLastTenDurations(clinicId: string): Promise<number[]> {
  try {
    const records = await prisma.consultHistory.findMany({
      where: {
        clinicId,
        isOutlier: false,
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: 10,
      select: {
        duration: true,
      },
    });

    // Reverse so oldest is first (matches chronological push order)
    return records.map((r) => r.duration).reverse();
  } catch (error) {
    console.error(
      `[DB] Error fetching last 10 durations for clinic ${clinicId}:`,
      error
    );
    return [];
  }
}

/**
 * Get analytics data for a specific clinic and date.
 * Used by GET /api/analytics endpoint and by queue-update broadcasts.
 */
export async function getAnalytics(
  clinicId: string,
  date?: string
): Promise<AnalyticsData> {
  try {
    const targetDate = date ?? getTodayDate();

    // Find the session for this date
    const session = await prisma.clinicSession.findFirst({
      where: {
        clinicId,
        date: targetDate,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!session) {
      return emptyAnalytics();
    }

    // Count served (done) patients
    const servedToday = await prisma.patientHistory.count({
      where: {
        sessionId: session.id,
        status: 'done',
      },
    });

    // Count skipped patients
    const skippedToday = await prisma.patientHistory.count({
      where: {
        sessionId: session.id,
        status: 'skipped',
      },
    });

    // Count absent patients (anyone who was ever marked absent, any final status)
    const absentToday = await prisma.patientHistory.count({
      where: {
        sessionId: session.id,
        absentAt: { not: null },
      },
    });

    // Count reinstated patients (anyone who was reinstated, any final status)
    const reinstatedToday = await prisma.patientHistory.count({
      where: {
        sessionId: session.id,
        reinstatedAt: { not: null },
      },
    });

    // Get consultation durations for this session
    const consultRecords = await prisma.consultHistory.findMany({
      where: {
        sessionId: session.id,
      },
      select: {
        duration: true,
        isOutlier: true,
      },
    });

    // Compute average from non-outlier records
    const cleanDurations = consultRecords
      .filter((r) => !r.isOutlier)
      .map((r) => r.duration);

    const outliersExcluded = consultRecords.filter((r) => r.isOutlier).length;

    const avgConsultReal =
      cleanDurations.length > 0
        ? cleanDurations.reduce((sum, d) => sum + d, 0) / cleanDurations.length
        : 0;

    // Compute throughput (patients served per hour since session start)
    const hoursElapsed =
      (Date.now() - session.startedAt.getTime()) / (1000 * 60 * 60);
    const throughputPerHour =
      hoursElapsed > 0
        ? Math.round((servedToday / hoursElapsed) * 10) / 10
        : 0;

    return {
      servedToday,
      skippedToday,
      absentToday,
      reinstatedToday,
      avgConsultReal: Math.round(avgConsultReal * 10) / 10,
      avgConsultFallback: session.avgConsultTime,
      dataPoints: cleanDurations.length,
      outliersExcluded,
      throughputPerHour,
    };
  } catch (error) {
    console.error(
      `[DB] Error computing analytics for clinic ${clinicId}:`,
      error
    );
    return emptyAnalytics();
  }
}

/**
 * Compute analytics from in-memory state only (no DB call).
 * Used for real-time queue-update broadcasts where DB round-trip
 * would add unnecessary latency.
 */
export function computeInMemoryAnalytics(
  servedCount: number,
  skippedCount: number,
  absentCount: number,
  reinstatedCount: number,
  consultHistory: number[],
  avgConsultFallback: number,
  sessionStartedAt: number
): AnalyticsData {
  // Filter outliers from consultHistory
  let cleanDurations: number[] = [];
  let outliersExcluded = 0;

  if (consultHistory.length > 0) {
    const mean =
      consultHistory.reduce((sum, d) => sum + d, 0) / consultHistory.length;
    const threshold = mean * 2.5;
    cleanDurations = consultHistory.filter((d) => d <= threshold);
    outliersExcluded = consultHistory.length - cleanDurations.length;
  }

  const avgConsultReal =
    cleanDurations.length > 0
      ? cleanDurations.reduce((sum, d) => sum + d, 0) / cleanDurations.length
      : 0;

  const hoursElapsed = (Date.now() - sessionStartedAt) / (1000 * 60 * 60);
  const throughputPerHour =
    hoursElapsed > 0
      ? Math.round((servedCount / hoursElapsed) * 10) / 10
      : 0;

  return {
    servedToday: servedCount,
    skippedToday: skippedCount,
    absentToday: absentCount,
    reinstatedToday: reinstatedCount,
    avgConsultReal: Math.round(avgConsultReal * 10) / 10,
    avgConsultFallback,
    dataPoints: cleanDurations.length,
    outliersExcluded,
    throughputPerHour,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyAnalytics(): AnalyticsData {
  return {
    servedToday: 0,
    skippedToday: 0,
    absentToday: 0,
    reinstatedToday: 0,
    avgConsultReal: 0,
    avgConsultFallback: 10,
    dataPoints: 0,
    outliersExcluded: 0,
    throughputPerHour: 0,
  };
}