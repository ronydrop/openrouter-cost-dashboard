import { Router, Request, Response } from 'express';
import { aggregationService } from '../services/AggregationService';
import { parseRange, getAvailableRanges } from '../utils/dateRanges';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildSummary(range as string);

    res.json({
      data,
      range: parseRange(range as string),
      cached,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/summary:', error.message);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message,
    });
  }
});

// GET /api/dashboard/timeseries
router.get('/timeseries', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days', granularity = 'day' } = req.query;
    const { data, cached } = await aggregationService.buildTimeSeries(
      range as string,
      granularity as 'day' | 'week' | 'month'
    );

    res.json({
      data,
      range: parseRange(range as string),
      granularity,
      cached,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/timeseries:', error.message);
    res.status(500).json({
      error: 'Failed to generate time series',
      message: error.message,
    });
  }
});

// GET /api/dashboard/models
router.get('/models', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildModelMetrics(range as string);

    res.json({
      data,
      range: parseRange(range as string),
      cached,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/models:', error.message);
    res.status(500).json({
      error: 'Failed to get model metrics',
      message: error.message,
    });
  }
});

// GET /api/dashboard/insights
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildInsights(range as string);

    res.json({
      data,
      range: parseRange(range as string),
      cached,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/insights:', error.message);
    res.status(500).json({
      error: 'Failed to generate insights',
      message: error.message,
    });
  }
});

// GET /api/dashboard/ranges - Get available range options
router.get('/ranges', async (req: Request, res: Response) => {
  res.json({
    ranges: getAvailableRanges(),
  });
});

// GET /api/dashboard/status - Get data status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { activityRepository } = await import('../repositories/ActivityRepository');
    const { getCacheStats } = await import('../services/cache');
    
    const dataRange = activityRepository.getDataRange();
    const activityCount = activityRepository.count();
    const recentSyncs = activityRepository.getRecentSyncLogs(5);
    const cacheStats = getCacheStats();

    res.json({
      hasData: activityCount > 0,
      activityCount,
      dataRange,
      recentSyncs,
      cache: cacheStats,
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/status:', error.message);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message,
    });
  }
});

export default router;
