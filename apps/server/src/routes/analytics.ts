import { Router } from 'express';
import { getAnalytics } from '../db/consultHistory';

const router = Router();

/**
 * GET /api/analytics
 *
 * Query params:
 *   clinicId  (required)  — which clinic
 *   date      (optional)  — YYYY-MM-DD, defaults to today
 *
 * Returns AnalyticsData for the specified clinic and date.
 */
router.get('/api/analytics', async (req, res) => {
  try {
    const clinicId = req.query.clinicId as string | undefined;

    if (!clinicId || clinicId.trim().length === 0) {
      res.status(400).json({
        error: 'clinicId query parameter is required',
      });
      return;
    }

    const date = req.query.date as string | undefined;

    const analytics = await getAnalytics(clinicId.trim(), date);

    res.json(analytics);
  } catch (error) {
    console.error('[API] Error in /api/analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
    });
  }
});

export { router as analyticsRouter };