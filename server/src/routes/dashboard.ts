import { Router, Request, Response } from 'express';
import { aggregationService } from '../services/AggregationService';
import { parseRange, getAvailableRanges } from '../utils/dateRanges';
import { activityRepository } from '../repositories/ActivityRepository';
import { getCacheStats, clearCache } from '../services/cache';

const router = Router();

// Summary endpoint
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildSummary(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/summary:', error.message);
    res.status(500).json({ error: 'Failed to generate summary', message: error.message });
  }
});

// Time series endpoint
router.get('/timeseries', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days', granularity = 'day' } = req.query;
    const { data, cached } = await aggregationService.buildTimeSeries(range as string, granularity as 'day' | 'week' | 'month');
    res.json({ data, range: parseRange(range as string), granularity, cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/timeseries:', error.message);
    res.status(500).json({ error: 'Failed to generate time series', message: error.message });
  }
});

// Model metrics endpoint
router.get('/models', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildModelMetrics(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/models:', error.message);
    res.status(500).json({ error: 'Failed to get model metrics', message: error.message });
  }
});

// Provider metrics endpoint
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildProviderMetrics(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/providers:', error.message);
    res.status(500).json({ error: 'Failed to get provider metrics', message: error.message });
  }
});

// API Key metrics endpoint
router.get('/apikeys', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildApiKeyMetrics(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/apikeys:', error.message);
    res.status(500).json({ error: 'Failed to get API key metrics', message: error.message });
  }
});

// Hourly metrics endpoint (for heatmap)
router.get('/hourly', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildHourlyMetrics(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/hourly:', error.message);
    res.status(500).json({ error: 'Failed to get hourly metrics', message: error.message });
  }
});

// Token metrics endpoint
router.get('/tokens', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildTokenMetrics(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/tokens:', error.message);
    res.status(500).json({ error: 'Failed to get token metrics', message: error.message });
  }
});

// Extended dashboard endpoint
router.get('/extended', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildExtendedDashboard(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/extended:', error.message);
    res.status(500).json({ error: 'Failed to get extended dashboard', message: error.message });
  }
});

// Insights endpoint
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { data, cached } = await aggregationService.buildInsights(range as string);
    res.json({ data, range: parseRange(range as string), cached, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/dashboard/insights:', error.message);
    res.status(500).json({ error: 'Failed to generate insights', message: error.message });
  }
});

// Available ranges
router.get('/ranges', async (req: Request, res: Response) => {
  res.json({ ranges: getAvailableRanges() });
});

// Dashboard status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const dataRange = await activityRepository.getDataRange();
    const activityCount = await activityRepository.count();
    const recentSyncs = await activityRepository.getRecentSyncLogs(5);
    const cacheStats = getCacheStats();
    res.json({ hasData: activityCount > 0, activityCount, dataRange, recentSyncs, cache: cacheStats });
  } catch (error: any) {
    console.error('Error in /api/dashboard/status:', error.message);
    res.status(500).json({ error: 'Failed to get status', message: error.message });
  }
});

// Cache management
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    clearCache();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error: any) {
    console.error('Error clearing cache:', error.message);
    res.status(500).json({ error: 'Failed to clear cache', message: error.message });
  }
});

export default router;
