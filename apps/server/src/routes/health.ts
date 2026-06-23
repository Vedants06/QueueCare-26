import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Railway health check endpoint.
 * Returns server status and uptime.
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };