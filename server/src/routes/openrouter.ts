import { Router, Request, Response } from 'express';
import { getCredits, getActivity, checkApiHealth } from '../services/openrouter';

const router = Router();

// GET /api/openrouter/credits
router.get('/credits', async (req: Request, res: Response) => {
  try {
    const credits = await getCredits();
    res.json(credits);
  } catch (error: any) {
    console.error('Error in /api/openrouter/credits:', error.message);
    res.status(500).json({
      error: 'Failed to fetch credits',
      message: error.message,
    });
  }
});

// GET /api/openrouter/activity
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const activities = await getActivity(
      start as string | undefined,
      end as string | undefined
    );
    res.json({ data: activities, has_more: false });
  } catch (error: any) {
    console.error('Error in /api/openrouter/activity:', error.message);
    res.status(500).json({
      error: 'Failed to fetch activity',
      message: error.message,
    });
  }
});

// GET /api/openrouter/health
router.get('/health', async (req: Request, res: Response) => {
  const isHealthy = checkApiHealth();
  res.json({
    status: isHealthy ? 'ok' : 'error',
    openrouter: isHealthy,
    apiKeyConfigured: !!process.env.OPENROUTER_API_KEY,
  });
});

export default router;
