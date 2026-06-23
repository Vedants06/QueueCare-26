import { Router } from 'express';
import { findActiveSession } from '../db/session';

const router = Router();

/**
 * GET /api/session
 *
 * Query params:
 *   clinicId  (required)  — which clinic
 *
 * Returns the currently active session or null.
 */
router.get('/api/session', async (req, res) => {
  try {
    const clinicId = req.query.clinicId as string | undefined;

    if (!clinicId || clinicId.trim().length === 0) {
      res.status(400).json({
        error: 'clinicId query parameter is required',
      });
      return;
    }

    const session = await findActiveSession(clinicId.trim());

    res.json({ session: session ?? null });
  } catch (error) {
    console.error('[API] Error in /api/session:', error);
    res.status(500).json({
      error: 'Failed to fetch session',
    });
  }
});

export { router as sessionRouter };