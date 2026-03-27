import { Router, Request, Response } from 'express';
import { activityIngestionService } from '../services/ActivityIngestionService';
import { activityRepository } from '../repositories/ActivityRepository';

const router = Router();

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const result = await activityIngestionService.syncFromOpenRouter(range as string);
    res.json({
      success: result.success,
      records_synced: result.recordsSynced,
      message: result.message,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error in /api/openrouter/sync:', error.message);
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

router.get('/sync/status', async (req: Request, res: Response) => {
  try {
    const recentSyncs = await activityRepository.getRecentSyncLogs(10);
    const dataRange = await activityRepository.getDataRange();
    const activityCount = await activityRepository.count();
    res.json({
      recentSyncs,
      database: {
        hasData: activityCount > 0,
        totalRecords: activityCount,
        earliestDate: dataRange?.earliest,
        latestDate: dataRange?.latest,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/openrouter/sync/status:', error.message);
    res.status(500).json({ error: 'Failed to get sync status', message: error.message });
  }
});

export default router;
