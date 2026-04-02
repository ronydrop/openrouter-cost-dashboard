import { Router, Request, Response } from 'express';
import { activityIngestionService } from '../services/ActivityIngestionService.js';
import { activityRepository } from '../repositories/ActivityRepository.js';

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

router.get('/sync/needed', async (req: Request, res: Response) => {
  try {
    const SYNC_MIN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    
    const recentSyncs = await activityRepository.getRecentSyncLogs(1);
    const activityCount = await activityRepository.count();
    
    const lastSyncAt = recentSyncs.length > 0 ? recentSyncs[0].created_at : null;
    const lastSyncTime = lastSyncAt ? new Date(lastSyncAt).getTime() : 0;
    const now = Date.now();
    
    let needsSync = false;
    let reason = '';
    
    if (activityCount === 0) {
      needsSync = true;
      reason = 'no_data';
    } else if (lastSyncTime === 0) {
      needsSync = true;
      reason = 'never_synced';
    } else if ((now - lastSyncTime) > SYNC_MIN_INTERVAL_MS) {
      needsSync = true;
      reason = 'stale_data';
    } else {
      reason = 'recently_synced';
    }
    
    res.json({
      needsSync,
      reason,
      lastSyncAt,
      activityCount,
      nextSyncAt: lastSyncTime > 0 ? new Date(lastSyncTime + SYNC_MIN_INTERVAL_MS).toISOString() : null,
    });
  } catch (error: any) {
    console.error('Error in /api/openrouter/sync/needed:', error.message);
    res.status(500).json({ error: 'Failed to check sync status', message: error.message });
  }
});

export default router;
