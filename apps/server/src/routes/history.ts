import { Router } from 'express';
import { queryHistory } from '../db/history';

const router = Router();

/**
 * GET /api/history
 *
 * Query params:
 *   clinicId  (required)  — which clinic
 *   date      (optional)  — YYYY-MM-DD, defaults to all dates
 *   search    (optional)  — searches name, phone, or token number
 *   status    (optional)  — 'done' | 'skipped' | 'absent'
 *   page      (optional)  — 1-based, defaults to 1
 *   limit     (optional)  — records per page, defaults to 20
 */
router.get('/api/history', async (req, res) => {
  try {
    const clinicId = req.query.clinicId as string | undefined;

    if (!clinicId || clinicId.trim().length === 0) {
      res.status(400).json({
        error: 'clinicId query parameter is required',
      });
      return;
    }

    const date = req.query.date as string | undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20)
    );

    const result = await queryHistory({
      clinicId: clinicId.trim(),
      date,
      search,
      status,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('[API] Error in /api/history:', error);
    res.status(500).json({
      error: 'Failed to fetch patient history',
    });
  }
});

export { router as historyRouter }; 