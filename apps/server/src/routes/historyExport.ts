import { Router } from 'express';
import { queryHistory } from '../db/history';

const router = Router();

/**
 * GET /api/history/export
 *
 * Same filters as /api/history but returns a CSV file download.
 * Query params: clinicId (required), date, search, status
 */
router.get('/api/history/export', async (req, res) => {
  try {
    const clinicId = req.query.clinicId as string | undefined;

    if (!clinicId || clinicId.trim().length === 0) {
      res.status(400).json({ error: 'clinicId query parameter is required' });
      return;
    }

    const date = req.query.date as string | undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    // Fetch ALL records (no pagination for export)
    const result = await queryHistory({
      clinicId: clinicId.trim(),
      date,
      search,
      status,
      page: 1,
      limit: 10000, // generous upper bound for a day's worth
    });

    // Build CSV
    const header = [
      'Token',
      'Name',
      'Phone',
      'Priority',
      'Status',
      'Added At',
      'Called At',
      'Done At',
      'Duration (min)',
      'Absent Count',
      'Notes',
    ].join(',');

    const rows = result.patients.map((p) => {
      const fields = [
        p.token,
        escapeCsv(p.name),
        escapeCsv(p.phone ?? ''),
        p.priority ? 'Yes' : 'No',
        p.status,
        p.addedAt.toISOString(),
        p.calledAt ? p.calledAt.toISOString() : '',
        p.doneAt ? p.doneAt.toISOString() : '',
        p.duration !== null ? p.duration.toFixed(1) : '',
        p.absentCount,
        escapeCsv(p.notes ?? ''),
      ];
      return fields.join(',');
    });

    const csv = [header, ...rows].join('\n');

    // Filename: queuecure-history-2026-06-23.csv
    const fileDate = date || new Date().toISOString().split('T')[0];
    const filename = `queuecure-history-${fileDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('[API] Error exporting history:', error);
    res.status(500).json({ error: 'Failed to export history' });
  }
});

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export { router as historyExportRouter };