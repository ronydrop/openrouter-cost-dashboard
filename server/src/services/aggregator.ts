import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
dayjs.extend(dayOfYear);
import type {
  NormalizedActivityItem,
  DailyMetrics,
  ModelMetrics,
  DashboardSummary,
  TimeSeriesData,
  Insight,
} from '../types';
import { getExchangeRate, convertToBrl } from './exchangeRate';

export async function aggregateByDay(
  activities: NormalizedActivityItem[],
  exchangeRate?: number
): Promise<DailyMetrics[]> {
  const dailyMap = new Map<string, DailyMetrics>();

  for (const activity of activities) {
    const date = dayjs(activity.timestamp).format('YYYY-MM-DD');
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        totalCostUsd: 0,
        totalCostBrl: 0,
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        models: [],
      });
    }

    const day = dailyMap.get(date)!;
    day.totalCostUsd += activity.costUsd;
    day.totalCostBrl += convertToBrl(activity.costUsd, exchangeRate);
    day.totalRequests += activity.requests;
    day.totalPromptTokens += activity.promptTokens;
    day.totalCompletionTokens += activity.completionTokens;
    day.totalTokens += activity.totalTokens;
    
    if (!day.models.includes(activity.model)) {
      day.models.push(activity.model);
    }
  }

  const result = Array.from(dailyMap.values()).map(day => ({
    ...day,
    totalCostUsd: parseFloat(day.totalCostUsd.toFixed(4)),
    totalCostBrl: parseFloat(day.totalCostBrl.toFixed(2)),
  }));

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function aggregateByModel(
  activities: NormalizedActivityItem[],
  exchangeRate?: number
): Promise<ModelMetrics[]> {
  const modelMap = new Map<string, ModelMetrics>();
  let totalCost = 0;

  for (const activity of activities) {
    const key = activity.model;
    totalCost += activity.costUsd;

    if (!modelMap.has(key)) {
      modelMap.set(key, {
        model: activity.model,
        provider: activity.provider || 'unknown',
        totalCostUsd: 0,
        totalCostBrl: 0,
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        avgCostPerRequest: 0,
        avgCostPerToken: 0,
        percentOfTotal: 0,
      });
    }

    const model = modelMap.get(key)!;
    model.totalCostUsd += activity.costUsd;
    model.totalCostBrl += convertToBrl(activity.costUsd, exchangeRate);
    model.totalRequests += activity.requests;
    model.totalPromptTokens += activity.promptTokens;
    model.totalCompletionTokens += activity.completionTokens;
    model.totalTokens += activity.totalTokens;
  }

  const result = Array.from(modelMap.values()).map(model => {
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
  });

  return result.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
}

export async function aggregateTimeSeries(
  activities: NormalizedActivityItem[],
  exchangeRate?: number
): Promise<TimeSeriesData> {
  const daily = await aggregateByDay(activities, exchangeRate);

  const weeklyMap = new Map<string, { week: string; startDate: string; endDate: string; totalCostUsd: number; totalCostBrl: number; totalRequests: number; totalTokens: number }>();

  for (const day of daily) {
    const weekStart = dayjs(day.date).startOf('week').format('YYYY-MM-DD');
    const weekEnd = dayjs(day.date).endOf('week').format('YYYY-MM-DD');
    const weekNum = Math.ceil(dayjs(day.date).dayOfYear() / 7);
    const weekLabel = `Semana ${weekNum}`;
    
    if (!weeklyMap.has(weekStart)) {
      weeklyMap.set(weekStart, {
        week: weekLabel,
        startDate: weekStart,
        endDate: weekEnd,
        totalCostUsd: 0,
        totalCostBrl: 0,
        totalRequests: 0,
        totalTokens: 0,
      });
    }

    const week = weeklyMap.get(weekStart)!;
    week.totalCostUsd += day.totalCostUsd;
    week.totalCostBrl += day.totalCostBrl;
    week.totalRequests += day.totalRequests;
    week.totalTokens += day.totalTokens;
  }

  const monthlyMap = new Map<string, { month: string; totalCostUsd: number; totalCostBrl: number; totalRequests: number; totalTokens: number }>();

  for (const day of daily) {
    const month = dayjs(day.date).format('YYYY-MM');
    const monthLabel = dayjs(day.date).format('MMMM/YYYY');
    
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month: monthLabel,
        totalCostUsd: 0,
        totalCostBrl: 0,
        totalRequests: 0,
        totalTokens: 0,
      });
    }

    const m = monthlyMap.get(month)!;
    m.totalCostUsd += day.totalCostUsd;
    m.totalCostBrl += day.totalCostBrl;
    m.totalRequests += day.totalRequests;
    m.totalTokens += day.totalTokens;
  }

  return {
    daily,
    weekly: Array.from(weeklyMap.values()).map(w => ({
      ...w,
      totalCostUsd: parseFloat(w.totalCostUsd.toFixed(4)),
      totalCostBrl: parseFloat(w.totalCostBrl.toFixed(2)),
    })).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    monthly: Array.from(monthlyMap.values()).map(m => ({
      ...m,
      totalCostUsd: parseFloat(m.totalCostUsd.toFixed(4)),
      totalCostBrl: parseFloat(m.totalCostBrl.toFixed(2)),
    })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export async function generateDashboardSummary(
  activities: NormalizedActivityItem[],
  credits: { total_credits: number; used_credits: number; remaining_credits: number },
  exchangeRate?: number
): Promise<DashboardSummary> {
  const currencyInfo = await getExchangeRate();
  const rate = exchangeRate || currencyInfo.rate;
  const today = dayjs().format('YYYY-MM-DD');
  const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

  let totalCostUsd = 0;
  let todayCostUsd = 0;
  let last7DaysCostUsd = 0;
  let last30DaysCostUsd = 0;
  let totalRequests = 0;
  let totalTokens = 0;
  const daysWithData = new Set<string>();

  for (const activity of activities) {
    const date = dayjs(activity.timestamp).format('YYYY-MM-DD');
    totalCostUsd += activity.costUsd;
    totalRequests += activity.requests;
    totalTokens += activity.totalTokens;
    daysWithData.add(date);

    if (date === today) {
      todayCostUsd += activity.costUsd;
    }
    if (date >= sevenDaysAgo) {
      last7DaysCostUsd += activity.costUsd;
    }
    if (date >= thirtyDaysAgo) {
      last30DaysCostUsd += activity.costUsd;
    }
  }

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
}

export async function generateInsights(
  activities: NormalizedActivityItem[],
  modelMetrics: ModelMetrics[],
  exchangeRate?: number
): Promise<Insight[]> {
  const insights: Insight[] = [];
  const currencyInfo = await getExchangeRate();
  const rate = exchangeRate || currencyInfo.rate;

  if (modelMetrics.length === 0) {
    return [{
      id: 'no-data',
      type: 'info',
      title: 'Sem dados disponíveis',
      description: 'Nao ha dados suficientes para gerar insights.',
      priority: 'low',
    }];
  }

  const top3Models = modelMetrics.slice(0, 3);
  const top3Concentration = top3Models.reduce((sum, m) => sum + m.percentOfTotal, 0);
  
  if (top3Concentration > 0.7) {
    insights.push({
      id: 'high-concentration',
      type: 'warning',
      title: 'Alta concentracao de gastos',
      description: `${(top3Concentration * 100).toFixed(1)}% dos custos estao concentrados nos 3 modelos mais utilizados. Considere otimizar o uso desses modelos.`,
      priority: top3Concentration > 0.85 ? 'high' : 'medium',
      potentialSavings: {
        usd: parseFloat((top3Models[0].totalCostUsd * 0.2).toFixed(4)),
        brl: parseFloat(convertToBrl(top3Models[0].totalCostUsd * 0.2, rate).toFixed(2)),
      },
    });
  }

  const mostExpensivePerRequest = modelMetrics.reduce((max, m) => 
    m.avgCostPerRequest > max.avgCostPerRequest ? m : max
  );

  if (mostExpensivePerRequest.avgCostPerRequest > 0.01) {
    insights.push({
      id: 'expensive-model',
      type: 'info',
      title: 'Modelo com maior custo por request',
      description: `${mostExpensivePerRequest.model} tem o maior custo medio por request ($${mostExpensivePerRequest.avgCostPerRequest.toFixed(4)}).`,
      priority: 'medium',
    });
  }

  const potentialSavings = modelMetrics
    .slice(0, 5)
    .reduce((sum, m) => sum + m.totalCostUsd * 0.15, 0);

  if (potentialSavings > 1) {
    insights.push({
      id: 'potential-savings',
      type: 'info',
      title: 'Oportunidade de economia',
      description: `Reduzir em 15% o uso dos 5 modelos mais caros pode economizar aproximadamente`,
      priority: 'medium',
      potentialSavings: {
        usd: parseFloat(potentialSavings.toFixed(4)),
        brl: parseFloat(convertToBrl(potentialSavings, rate).toFixed(2)),
      },
    });
  }

  const dailyCosts = await aggregateByDay(activities, rate);
  if (dailyCosts.length > 0) {
    const avgDailyCost = dailyCosts.reduce((sum, d) => sum + d.totalCostUsd, 0) / dailyCosts.length;
    const highCostDays = dailyCosts.filter(d => d.totalCostUsd > avgDailyCost * 1.5);
    
    if (highCostDays.length > 0) {
      insights.push({
        id: 'high-usage-days',
        type: 'warning',
        title: 'Dias com pico de uso identificado',
        description: `${highCostDays.length} dias tiveram gastos acima de 150% da media diaria. Verifique se esses picos foram intencionais.`,
        priority: 'low',
      });
    }
  }

  const providerMap = new Map<string, number>();
  for (const activity of activities) {
    providerMap.set(activity.provider, (providerMap.get(activity.provider) || 0) + activity.costUsd);
  }
  
  const primaryProvider = Array.from(providerMap.entries()).reduce((max, [provider, cost]) => 
    cost > max[1] ? [provider, cost] : max
  );
  
  const primaryProviderPercent = totalCostPercent(primaryProvider[1], activities);
  
  if (primaryProviderPercent > 0.6) {
    insights.push({
      id: 'provider-concentration',
      type: 'info',
      title: 'Concentracao em provedor',
      description: `${primaryProvider[0]} representa ${(primaryProviderPercent * 100).toFixed(1)}% dos seus gastos. Considere avaliar alternativas.`,
      priority: 'low',
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function totalCostPercent(providerCost: number, activities: NormalizedActivityItem[]): number {
  const total = activities.reduce((sum, a) => sum + a.costUsd, 0);
  return total > 0 ? providerCost / total : 0;
}
