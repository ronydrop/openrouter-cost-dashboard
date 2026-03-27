import dayjs from 'dayjs';
import { activityRepository, ActivityRepository } from '../repositories/ActivityRepository';
import { ActivityItem, NormalizedActivityItem, DailyMetrics, ModelMetrics, DashboardSummary, TimeSeriesData, Insight } from '../types';
import { getExchangeRate, convertToBrl } from './exchangeRate';
import { parseRange, TimeRange, getPreviousPeriod } from '../utils/dateRanges';
import { getCache, setCache, getDashboardCacheKey, withCache } from './cache';

export class AggregationService {
  private repo: ActivityRepository;

  constructor(repo: ActivityRepository = activityRepository) {
    this.repo = repo;
  }

  /**
   * Get activities for a range (from database)
   */
  private getActivitiesForRange(range: TimeRange): NormalizedActivityItem[] {
    const activities = this.repo.findByRange(range);
    return activities.map(a => this.repo.activityToNormalized(a));
  }

  /**
   * Build dashboard summary
   */
  async buildSummary(rangeStr: string = 'last30days'): Promise<{ data: DashboardSummary; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('summary', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = this.getActivitiesForRange(range);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      const today = dayjs().format('YYYY-MM-DD');
      const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

      let totalCostUsd = 0, todayCostUsd = 0, last7DaysCostUsd = 0, last30DaysCostUsd = 0;
      let totalRequests = 0, totalTokens = 0;
      const daysWithData = new Set<string>();

      for (const activity of activities) {
        const date = dayjs(activity.timestamp).format('YYYY-MM-DD');
        totalCostUsd += activity.costUsd;
        totalRequests += activity.requests;
        totalTokens += activity.totalTokens;
        daysWithData.add(date);

        if (date === today) todayCostUsd += activity.costUsd;
        if (date >= sevenDaysAgo) last7DaysCostUsd += activity.costUsd;
        if (date >= thirtyDaysAgo) last30DaysCostUsd += activity.costUsd;
      }

      // Get credit info
      const credits = this.repo.getLatestCreditSnapshot() || {
        total_credits: 100,
        used_credits: 0,
        remaining_credits: 100,
      };

      const numDays = daysWithData.size || 1;
      const avgDailyCostUsd = totalCostUsd / numDays;

      return {
        totalCostUsd: parseFloat(totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(convertToBrl(totalCostUsd, rate).toFixed(2)),
        totalCredits: credits.total_credits,
        usedCredits: credits.used_credits,
        remainingCredits: credits.remaining_credits,
        todayCostUsd: parseFloat(todayCostUsd.toFixed(4)),
        todayCostBrl: parseFloat(convertToBrl(todayCostUsd, rate).toFixed(2)),
        last7DaysCostUsd: parseFloat(last7DaysCostUsd.toFixed(4)),
        last7DaysCostBrl: parseFloat(convertToBrl(last7DaysCostUsd, rate).toFixed(2)),
        last30DaysCostUsd: parseFloat(last30DaysCostUsd.toFixed(4)),
        last30DaysCostBrl: parseFloat(convertToBrl(last30DaysCostUsd, rate).toFixed(2)),
        avgDailyCostUsd: parseFloat(avgDailyCostUsd.toFixed(4)),
        avgDailyCostBrl: parseFloat(convertToBrl(avgDailyCostUsd, rate).toFixed(2)),
        totalRequests,
        totalTokens,
        exchangeRate: rate,
        exchangeRateSource: currencyInfo.source,
        exchangeRateMode: currencyInfo.mode,
      };
    });
  }

  /**
   * Build time series data
   */
  async buildTimeSeries(rangeStr: string = 'last30days', granularity: 'day' | 'week' | 'month' = 'day'): Promise<{ data: TimeSeriesData; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey(`timeseries:${granularity}`, rangeStr);

    return withCache(cacheKey, async () => {
      const activities = this.getActivitiesForRange(range);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      // Daily aggregation
      const dailyMap = new Map<string, DailyMetrics>();
      for (const activity of activities) {
        const date = dayjs(activity.timestamp).format('YYYY-MM-DD');
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date, totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0,
            totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, models: [],
          });
        }
        const day = dailyMap.get(date)!;
        day.totalCostUsd += activity.costUsd;
        day.totalCostBrl += convertToBrl(activity.costUsd, rate);
        day.totalRequests += activity.requests;
        day.totalPromptTokens += activity.promptTokens;
        day.totalCompletionTokens += activity.completionTokens;
        day.totalTokens += activity.totalTokens;
        if (!day.models.includes(activity.model)) day.models.push(activity.model);
      }

      const daily = Array.from(dailyMap.values()).map(d => ({
        ...d,
        totalCostUsd: parseFloat(d.totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(d.totalCostBrl.toFixed(2)),
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Weekly aggregation
      const weeklyMap = new Map<string, any>();
      for (const day of daily) {
        const weekStart = dayjs(day.date).startOf('week').format('YYYY-MM-DD');
        const weekEnd = dayjs(day.date).endOf('week').format('YYYY-MM-DD');
        const weekNum = Math.ceil(dayjs(day.date).dayOfYear() / 7);
        if (!weeklyMap.has(weekStart)) {
          weeklyMap.set(weekStart, {
            week: `Semana ${weekNum}`, startDate: weekStart, endDate: weekEnd,
            totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0, totalTokens: 0,
          });
        }
        const week = weeklyMap.get(weekStart)!;
        week.totalCostUsd += day.totalCostUsd;
        week.totalCostBrl += day.totalCostBrl;
        week.totalRequests += day.totalRequests;
        week.totalTokens += day.totalTokens;
      }

      const weekly = Array.from(weeklyMap.values()).map(w => ({
        ...w,
        totalCostUsd: parseFloat(w.totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(w.totalCostBrl.toFixed(2)),
      })).sort((a, b) => a.startDate.localeCompare(b.startDate));

      // Monthly aggregation
      const monthlyMap = new Map<string, any>();
      for (const day of daily) {
        const month = dayjs(day.date).format('YYYY-MM');
        const monthLabel = dayjs(day.date).format('MMMM/YYYY');
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month: monthLabel, totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0, totalTokens: 0,
          });
        }
        const m = monthlyMap.get(month)!;
        m.totalCostUsd += day.totalCostUsd;
        m.totalCostBrl += day.totalCostBrl;
        m.totalRequests += day.totalRequests;
        m.totalTokens += day.totalTokens;
      }

      const monthly = Array.from(monthlyMap.values()).map(m => ({
        ...m,
        totalCostUsd: parseFloat(m.totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(m.totalCostBrl.toFixed(2)),
      })).sort((a, b) => a.month.localeCompare(b.month));

      return { daily, weekly, monthly };
    });
  }

  /**
   * Build model metrics
   */
  async buildModelMetrics(rangeStr: string = 'last30days'): Promise<{ data: ModelMetrics[]; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('models', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = this.getActivitiesForRange(range);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      const modelMap = new Map<string, ModelMetrics>();
      let totalCost = 0;

      for (const activity of activities) {
        totalCost += activity.costUsd;
        if (!modelMap.has(activity.model)) {
          modelMap.set(activity.model, {
            model: activity.model, provider: activity.provider || 'unknown',
            totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0,
            totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0,
            avgCostPerRequest: 0, avgCostPerToken: 0, percentOfTotal: 0,
          });
        }
        const model = modelMap.get(activity.model)!;
        model.totalCostUsd += activity.costUsd;
        model.totalCostBrl += convertToBrl(activity.costUsd, rate);
        model.totalRequests += activity.requests;
        model.totalPromptTokens += activity.promptTokens;
        model.totalCompletionTokens += activity.completionTokens;
        model.totalTokens += activity.totalTokens;
      }

      return Array.from(modelMap.values()).map(model => {
        const avgCostPerRequest = model.totalRequests > 0 ? model.totalCostUsd / model.totalRequests : 0;
        const avgCostPerToken = model.totalTokens > 0 ? model.totalCostUsd / model.totalTokens : 0;
        const percentOfTotal = totalCost > 0 ? model.totalCostUsd / totalCost : 0;
        return {
          ...model,
          totalCostUsd: parseFloat(model.totalCostUsd.toFixed(4)),
          totalCostBrl: parseFloat(model.totalCostBrl.toFixed(2)),
          avgCostPerRequest: parseFloat(avgCostPerRequest.toFixed(6)),
          avgCostPerToken: parseFloat(avgCostPerToken.toFixed(8)),
          percentOfTotal: parseFloat(percentOfTotal.toFixed(4)),
        };
      }).sort((a, b) => b.totalCostUsd - a.totalCostUsd);
    });
  }

  /**
   * Build insights
   */
  async buildInsights(rangeStr: string = 'last30days'): Promise<{ data: Insight[]; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('insights', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = this.getActivitiesForRange(range);
      const { data: models } = await this.buildModelMetrics(rangeStr);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;
      const insights: Insight[] = [];

      if (activities.length === 0) {
        return [{
          id: 'no-data',
          type: 'info',
          severity: 'info',
          title: 'Sem dados disponíveis',
          description: 'Não há dados suficientes para gerar insights.',
        }];
      }

      // Insight 1: Model concentration
      if (models.length > 0) {
        const topModel = models[0];
        if (topModel.percentOfTotal > 0.5) {
          insights.push({
            id: 'model_concentration',
            type: 'model_concentration',
            severity: topModel.percentOfTotal > 0.75 ? 'warning' : 'info',
            title: 'Alta concentração em modelo',
            description: `${topModel.model} representa ${(topModel.percentOfTotal * 100).toFixed(1)}% dos custos.`,
            meta: { model: topModel.model, percentage: topModel.percentOfTotal },
          });
        }

        // Top 3 concentration
        const top3 = models.slice(0, 3).reduce((sum, m) => sum + m.percentOfTotal, 0);
        if (top3 > 0.7) {
          insights.push({
            id: 'top3_concentration',
            type: 'model_concentration',
            severity: top3 > 0.85 ? 'warning' : 'info',
            title: 'Gastos concentrados nos top 3',
            description: `${(top3 * 100).toFixed(1)}% dos custos estão nos 3 modelos mais usados.`,
            meta: { top3Percentage: top3 },
          });
        }
      }

      // Insight 2: Trend change (compare with previous period)
      const currentCost = activities.reduce((sum, a) => sum + a.costUsd, 0);
      const previousPeriod = getPreviousPeriod(range);
      const previousActivities = this.getActivitiesForRange(previousPeriod);
      const previousCost = previousActivities.reduce((sum, a) => sum + a.costUsd, 0);

      if (previousCost > 0) {
        const change = ((currentCost - previousCost) / previousCost) * 100;
        if (Math.abs(change) > 20) {
          insights.push({
            id: 'trend_change',
            type: 'trend_change',
            severity: change > 50 ? 'critical' : change > 0 ? 'warning' : 'info',
            title: change > 0 ? 'Aumento de gastos' : 'Redução de gastos',
            description: `Gastos ${change > 0 ? 'aumentaram' : 'diminuíram'} ${Math.abs(change).toFixed(1)}% em relação ao período anterior.`,
            meta: { changePercent: change, currentCost, previousCost },
          });
        }
      }

      // Insight 3: Peak day
      const dailyMap = new Map<string, number>();
      for (const activity of activities) {
        const date = dayjs(activity.timestamp).format('YYYY-MM-DD');
        dailyMap.set(date, (dailyMap.get(date) || 0) + activity.costUsd);
      }

      if (dailyMap.size > 0) {
        const avgDailyCost = currentCost / dailyMap.size;
        let peakDay = { date: '', cost: 0 };
        for (const [date, cost] of dailyMap) {
          if (cost > peakDay.cost) peakDay = { date, cost };
        }

        if (peakDay.cost > avgDailyCost * 2) {
          insights.push({
            id: 'peak_day',
            type: 'peak_day',
            severity: peakDay.cost > avgDailyCost * 3 ? 'warning' : 'info',
            title: 'Dia de pico identificado',
            description: `${dayjs(peakDay.date).format('DD/MM/YYYY')} teve gastos ${(peakDay.cost / avgDailyCost).toFixed(1)}x acima da média.`,
            meta: { date: peakDay.date, cost: peakDay.cost, avgCost: avgDailyCost },
          });
        }
      }

      // Insight 4: Expensive model warning
      if (models.length > 1) {
        const expensiveModel = models.reduce((max, m) => 
          m.avgCostPerRequest > max.avgCostPerRequest ? m : max
        );
        if (expensiveModel.avgCostPerRequest > 0.02) {
          insights.push({
            id: 'expensive_model',
            type: 'info',
            severity: 'info',
            title: 'Modelo com alto custo por request',
            description: `${expensiveModel.model} tem custo médio de $${expensiveModel.avgCostPerRequest.toFixed(4)} por request.`,
            meta: { model: expensiveModel.model, avgCostPerRequest: expensiveModel.avgCostPerRequest },
          });
        }
      }

      return insights;
    });
  }
}

export const aggregationService = new AggregationService();
