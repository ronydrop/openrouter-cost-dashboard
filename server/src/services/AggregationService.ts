import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import { activityRepository } from '../repositories/ActivityRepository';
import { NormalizedActivityItem, DailyMetrics, ModelMetrics, DashboardSummary, TimeSeriesData, Insight } from '../types';
import { getExchangeRate, convertToBrl } from './exchangeRate';
import { parseRange, TimeRange, getPreviousPeriod } from '../utils/dateRanges';
import { withCache, getDashboardCacheKey } from './cache';

dayjs.extend(dayOfYear);

export class AggregationService {
  private async getActivitiesForRange(range: TimeRange): Promise<NormalizedActivityItem[]> {
    const activities = await activityRepository.findByRange(range);
    return activities.map(a => activityRepository.activityToNormalized(a));
  }

  async buildSummary(rangeStr: string = 'last30days'): Promise<{ data: DashboardSummary; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('summary', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);
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

      const credits = await activityRepository.getLatestCreditSnapshot() || {
        total_credits: 100, used_credits: 0, remaining_credits: 100,
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

  async buildTimeSeries(rangeStr: string = 'last30days', granularity: 'day' | 'week' | 'month' = 'day'): Promise<{ data: TimeSeriesData; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey(`timeseries:${granularity}`, rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      const dailyMap = new Map<string, DailyMetrics>();
      for (const activity of activities) {
        const date = dayjs(activity.timestamp).format('YYYY-MM-DD');
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, models: [] });
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

      const weeklyMap = new Map<string, any>();
      for (const day of daily) {
        const weekStart = dayjs(day.date).startOf('week').format('YYYY-MM-DD');
        if (!weeklyMap.has(weekStart)) {
          weeklyMap.set(weekStart, { week: `Semana ${Math.ceil(dayjs(day.date).dayOfYear() / 7)}`, startDate: weekStart, endDate: dayjs(day.date).endOf('week').format('YYYY-MM-DD'), totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0, totalTokens: 0 });
        }
        const week = weeklyMap.get(weekStart)!;
        week.totalCostUsd += day.totalCostUsd;
        week.totalCostBrl += day.totalCostBrl;
        week.totalRequests += day.totalRequests;
        week.totalTokens += day.totalTokens;
      }
      const weekly = Array.from(weeklyMap.values()).map(w => ({ ...w, totalCostUsd: parseFloat(w.totalCostUsd.toFixed(4)), totalCostBrl: parseFloat(w.totalCostBrl.toFixed(2)) })).sort((a, b) => a.startDate.localeCompare(b.startDate));

      const monthlyMap = new Map<string, any>();
      for (const day of daily) {
        const month = dayjs(day.date).format('YYYY-MM');
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month: dayjs(day.date).format('MMMM/YYYY'), totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0, totalTokens: 0 });
        }
        const m = monthlyMap.get(month)!;
        m.totalCostUsd += day.totalCostUsd;
        m.totalCostBrl += day.totalCostBrl;
        m.totalRequests += day.totalRequests;
        m.totalTokens += day.totalTokens;
      }
      const monthly = Array.from(monthlyMap.values()).map(m => ({ ...m, totalCostUsd: parseFloat(m.totalCostUsd.toFixed(4)), totalCostBrl: parseFloat(m.totalCostBrl.toFixed(2)) })).sort((a, b) => a.month.localeCompare(b.month));

      return { daily, weekly, monthly };
    });
  }

  async buildModelMetrics(rangeStr: string = 'last30days'): Promise<{ data: ModelMetrics[]; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('models', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      const modelMap = new Map<string, ModelMetrics>();
      let totalCost = 0;

      for (const activity of activities) {
        totalCost += activity.costUsd;
        if (!modelMap.has(activity.model)) {
          modelMap.set(activity.model, { model: activity.model, provider: activity.provider || 'unknown', totalCostUsd: 0, totalCostBrl: 0, totalRequests: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, avgCostPerRequest: 0, avgCostPerToken: 0, percentOfTotal: 0 });
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
        return { ...model, totalCostUsd: parseFloat(model.totalCostUsd.toFixed(4)), totalCostBrl: parseFloat(model.totalCostBrl.toFixed(2)), avgCostPerRequest: parseFloat(avgCostPerRequest.toFixed(6)), avgCostPerToken: parseFloat(avgCostPerToken.toFixed(8)), percentOfTotal: parseFloat(percentOfTotal.toFixed(4)) };
      }).sort((a, b) => b.totalCostUsd - a.totalCostUsd);
    });
  }

  async buildInsights(rangeStr: string = 'last30days'): Promise<{ data: Insight[]; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('insights', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);
      const { data: models } = await this.buildModelMetrics(rangeStr);
      const insights: Insight[] = [];

      if (activities.length === 0) {
        return [{ id: 'no-data', type: 'info', severity: 'info', title: 'Sem dados disponíveis', description: 'Sincronize os dados para gerar insights.' }];
      }

      if (models.length > 0) {
        const topModel = models[0];
        if (topModel.percentOfTotal > 0.5) {
          insights.push({ id: 'model_concentration', type: 'model_concentration', severity: topModel.percentOfTotal > 0.75 ? 'warning' : 'info', title: 'Alta concentração em modelo', description: `${topModel.model} representa ${(topModel.percentOfTotal * 100).toFixed(1)}% dos custos.`, meta: { percentage: topModel.percentOfTotal } });
        }
        const top3 = models.slice(0, 3).reduce((sum, m) => sum + m.percentOfTotal, 0);
        if (top3 > 0.7) {
          insights.push({ id: 'top3_concentration', type: 'model_concentration', severity: top3 > 0.85 ? 'warning' : 'info', title: 'Gastos concentrados nos top 3', description: `${(top3 * 100).toFixed(1)}% dos custos estão nos 3 modelos mais usados.`, meta: { top3Percentage: top3 } });
        }
      }

      const currentCost = activities.reduce((sum, a) => sum + a.costUsd, 0);
      const previousPeriod = getPreviousPeriod(range);
      const previousActivities = await this.getActivitiesForRange(previousPeriod);
      const previousCost = previousActivities.reduce((sum, a) => sum + a.costUsd, 0);

      if (previousCost > 0) {
        const change = ((currentCost - previousCost) / previousCost) * 100;
        if (Math.abs(change) > 20) {
          insights.push({ id: 'trend_change', type: 'trend_change', severity: change > 50 ? 'critical' : change > 0 ? 'warning' : 'info', title: change > 0 ? 'Aumento de gastos' : 'Redução de gastos', description: `Gastos ${change > 0 ? 'aumentaram' : 'diminuíram'} ${Math.abs(change).toFixed(1)}% em relação ao período anterior.`, meta: { changePercent: change } });
        }
      }

      const dailyMap = new Map<string, number>();
      for (const activity of activities) {
        const date = dayjs(activity.timestamp).format('YYYY-MM-DD');
        dailyMap.set(date, (dailyMap.get(date) || 0) + activity.costUsd);
      }

      if (dailyMap.size > 0) {
        const avgDailyCost = currentCost / dailyMap.size;
        let peakDay = { date: '', cost: 0 };
        for (const [date, cost] of dailyMap) { if (cost > peakDay.cost) peakDay = { date, cost }; }
        if (peakDay.cost > avgDailyCost * 2) {
          insights.push({ id: 'peak_day', type: 'peak_day', severity: peakDay.cost > avgDailyCost * 3 ? 'warning' : 'info', title: 'Dia de pico identificado', description: `${dayjs(peakDay.date).format('DD/MM/YYYY')} teve gastos ${(peakDay.cost / avgDailyCost).toFixed(1)}x acima da média.`, meta: { date: peakDay.date, cost: peakDay.cost } });
        }
      }

      return insights;
    });
  }
}

export const aggregationService = new AggregationService();
