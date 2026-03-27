import { Router, Request, Response } from 'express';
import { activityIngestionService } from '../services/ActivityIngestionService';

const router = Router();

// POST /api/openrouter/sync
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    
    console.log(`[Sync Route] Starting sync for range: ${range}`);
    
    const result = await activityIngestionService.syncFromOpenRouter(range as string);

    res.json({
      success: result.success,
      records_synced: result.recordsSynced,
      range: result.range,
      message: result.message,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error in /api/openrouter/sync:', error.message);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message,
    });
  }
});

// GET /api/openrouter/sync/status
router.get('/sync/status', async (req: Request, res: Response) => {
  try {
    const { activityRepository } = await import('../repositories/ActivityRepository');
    
    const recentSyncs = activityRepository.getRecentSyncLogs(10);
    const dataRange = activityRepository.getDataRange();
    const activityCount = activityRepository.count();

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
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error.message,
    });
  }
});

export default router;
