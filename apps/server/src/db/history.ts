import { prisma } from './prisma';
import type { Patient } from '../types';

/**
 * Write a patient record to the history table.
 * Called when a patient is: marked done, skipped, or permanently skipped from absent tray.
 *
 * Duration is computed only when both calledAt and doneAt exist.
 * For absent or skipped patients who were never served, duration is null.
 */
export async function writePatientHistory(
  patient: Patient,
  sessionId: string,
  status: 'done' | 'skipped' | 'absent'
): Promise<void> {
  try {
    // Compute duration only if patient was actually served (has both timestamps)
    let duration: number | null = null;
    if (patient.calledAt && patient.doneAt) {
      duration = (patient.doneAt - patient.calledAt) / 60_000; // ms to minutes
    }

    await prisma.patientHistory.create({
      data: {
        clinicId: patient.clinicId,
        token: patient.token,
        name: patient.name,
        phone: patient.phone ?? null,
        priority: patient.priority,
        status,
        addedAt: new Date(patient.addedAt),
        calledAt: patient.calledAt ? new Date(patient.calledAt) : null,
        doneAt: patient.doneAt ? new Date(patient.doneAt) : null,
        absentAt: patient.absentAt ? new Date(patient.absentAt) : null,
        reinstatedAt: patient.reinstatedAt ? new Date(patient.reinstatedAt) : null,
        absentCount: patient.absentCount,
        duration,
        sessionId,
      },
    });
  } catch (error) {
    console.error(
      `[DB] Error writing patient history for token ${patient.token}:`,
      error
    );
  }
}

/**
 * Query patient history with filters, search, and pagination.
 * Used by GET /api/history endpoint.
 */
export interface HistoryQueryParams {
  clinicId: string;
  date?: string;       // YYYY-MM-DD
  search?: string;     // searches name, phone, or token number
  status?: string;     // 'done' | 'skipped' | 'absent' | undefined for all
  page: number;        // 1-based
  limit: number;       // records per page
}

export interface HistoryQueryResult {
  patients: Array<{
    id: string;
    clinicId: string;
    token: number;
    name: string;
    phone: string | null;
    priority: boolean;
    status: string;
    addedAt: Date;
    calledAt: Date | null;
    doneAt: Date | null;
    absentAt: Date | null;
    reinstatedAt: Date | null;
    absentCount: number;
    duration: number | null;
    createdAt: Date;
  }>;
  total: number;
  pages: number;
}

export async function queryHistory(
  params: HistoryQueryParams
): Promise<HistoryQueryResult> {
  try {
    const { clinicId, date, search, status, page, limit } = params;

    // Build the where clause
    const where: Record<string, unknown> = { clinicId };

    // Filter by date — match session date
    if (date) {
      where.session = { date };
    }

    // Filter by status
    if (status && ['done', 'skipped', 'absent'].includes(status)) {
      where.status = status;
    }

    // Search across name, phone, or token number
    if (search && search.trim().length > 0) {
      const searchTrim = search.trim();
      const searchAsNumber = parseInt(searchTrim, 10);

      // Build OR conditions
      const orConditions: Array<Record<string, unknown>> = [
        { name: { contains: searchTrim, mode: 'insensitive' } },
      ];

      // Search by phone if search looks like it could be a phone number
      if (searchTrim.length >= 3) {
        orConditions.push({
          phone: { contains: searchTrim, mode: 'insensitive' },
        });
      }

      // Search by token number if search is a valid number
      if (!isNaN(searchAsNumber) && searchAsNumber > 0) {
        orConditions.push({ token: searchAsNumber });
      }

      where.OR = orConditions;
    }

    // Get total count for pagination
    const total = await prisma.patientHistory.count({
      where: where as Parameters<typeof prisma.patientHistory.count>[0]['where'],
    });

    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    // Fetch paginated results
    const patients = await prisma.patientHistory.findMany({
      where: where as Parameters<typeof prisma.patientHistory.findMany>[0]['where'],
      orderBy: { addedAt: 'desc' },
      skip,
      take: limit,
    });

    return {
      patients,
      total,
      pages,
    };
  } catch (error) {
    console.error(`[DB] Error querying history for clinic ${params.clinicId}:`, error);
    return {
      patients: [],
      total: 0,
      pages: 1,
    };
  }
}