import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { getCredits, getActivity } from '../services/openrouter';
import { getExchangeRate } from '../services/exchangeRate';
import {
  aggregateByDay,
  aggregateByModel,
  aggregateTimeSeries,
  generateDashboardSummary,
  generateInsights,
} from '../services/aggregator';

const router = Router();

function parseDateRange(range: string): { start: string; end: string } {
  const today = dayjs();
  
  switch (range) {
    case 'today':
      return {
        start: today.startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'yesterday':
      return {
        start: today.subtract(1, 'day').startOf('day').toISOString(),
        end: today.subtract(1, 'day').endOf('day').toISOString(),
      };
    case 'last7days':
      return {
        start: today.subtract(7, 'day').startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'last30days':
      return {
        start: today.subtract(30, 'day').startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'currentMonth':
      return {
        start: today.startOf('month').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'previousMonth':
      return {
        start: today.subtract(1, 'month').startOf('month').toISOString(),
        end: today.subtract(1, 'month').endOf('month').toISOString(),
      };
    default:
      if (range.includes(',')) {
        const [start, end] = range.split(',');
        return { start, end };
      }
      return {
        start: today.subtract(30, 'day').startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
  }
}

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { start, end } = parseDateRange(range as string);
    
    const [activities, credits, currencyInfo] = await Promise.all([
      getActivity(start, end),
      getCredits(),
      getExchangeRate(),
    ]);

    const summary = await generateDashboardSummary(
      activities,
      credits,
      currencyInfo.rate
    );

    res.json(summary);
  } catch (error: any) {
    console.error('Error in /api/dashboard/summary:', error.message);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message,
    });
  }
});

router.get('/timeseries', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { start, end } = parseDateRange(range as string);
    
    const [activities, currencyInfo] = await Promise.all([
      getActivity(start, end),
      getExchangeRate(),
    ]);

    const timeSeries = await aggregateTimeSeries(activities, currencyInfo.rate);
    res.json(timeSeries);
  } catch (error: any) {
    console.error('Error in /api/dashboard/timeseries:', error.message);
    res.status(500).json({
      error: 'Failed to generate time series',
      message: error.message,
    });
  }
});

router.get('/models', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { start, end } = parseDateRange(range as string);
    
    const [activities, currencyInfo] = await Promise.all([
      getActivity(start, end),
      getExchangeRate(),
    ]);

    const models = await aggregateByModel(activities, currencyInfo.rate);
    res.json(models);
  } catch (error: any) {
    console.error('Error in /api/dashboard/models:', error.message);
    res.status(500).json({
      error: 'Failed to get model metrics',
      message: error.message,
    });
  }
});

router.get('/insights', async (req: Request, res: Response) => {
  try {
    const { range = 'last30days' } = req.query;
    const { start, end } = parseDateRange(range as string);
    
    const [activities, currencyInfo] = await Promise.all([
      getActivity(start, end),
      getExchangeRate(),
    ]);

    const models = await aggregateByModel(activities, currencyInfo.rate);
    const insights = await generateInsights(activities, models, currencyInfo.rate);
    res.json(insights);
  } catch (error: any) {
    console.error('Error in /api/dashboard/insights:', error.message);
    res.status(500).json({
      error: 'Failed to generate insights',
      message: error.message,
    });
  }
});

export default router;
