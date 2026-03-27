import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import utc from 'dayjs/plugin/utc';
import { activityRepository } from '../repositories/ActivityRepository';
import { 
  NormalizedActivityItem, DailyMetrics, ModelMetrics, DashboardSummary, 
  TimeSeriesData, Insight, ProviderMetrics, ApiKeyMetrics, HourlyMetrics,
  EndpointMetrics, TokenMetrics, ExtendedDashboardData
} from '../types';
import { getExchangeRate, convertToBrl } from './exchangeRate';
import { parseRange, TimeRange, getPreviousPeriod } from '../utils/dateRanges';
import { withCache, getDashboardCacheKey } from './cache';

dayjs.extend(dayOfYear);
dayjs.extend(utc);

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export class AggregationService {
  private async getActivitiesForRange(range: TimeRange): Promise<NormalizedActivityItem[]> {
    const activities = await activityRepository.findByRange(range);
    return activities.map(a => activityRepository.activityToNormalized(a));
  }

  // ============ SUMMARY ============
  async buildSummary(rangeStr: string = 'last30days'): Promise<{ data: DashboardSummary; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('summary', rangeStr);

    return withCache(cacheKey, async () => {
      // Buscar TODOS os dados dos últimos 30 dias para calcular today/7d/30d
      const allRange30 = parseRange('last30days');
      const activities = await this.getActivitiesForRange(range);
      const all30Activities = rangeStr === 'last30days' ? activities : await this.getActivitiesForRange(allRange30);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      // O /activity da OpenRouter retorna dados diários agregados por UTC.
      // Dados do dia atual (hoje) só aparecem no dia seguinte.
      // Usamos o dia mais recente disponível no banco como referência de "hoje".
      const allDates = activities
        .map(a => dayjs(a.timestamp).utc().format('YYYY-MM-DD'))
        .filter(Boolean);

      const latestDataDate = allDates.length > 0
        ? allDates.reduce((a, b) => a > b ? a : b)
        : dayjs().utc().format('YYYY-MM-DD');

      const sevenDaysBack = dayjs(latestDataDate).subtract(6, 'day').format('YYYY-MM-DD');
      const thirtyDaysBack = dayjs(latestDataDate).subtract(29, 'day').format('YYYY-MM-DD');

      let totalCostUsd = 0, todayCostUsd = 0, last7DaysCostUsd = 0, last30DaysCostUsd = 0;
      let totalRequests = 0, totalTokens = 0;
      const daysWithData = new Set<string>();

      for (const activity of activities) {
        if (activity.costUsd <= 0) continue; // ignorar entradas sem custo real
        const date = dayjs(activity.timestamp).utc().format('YYYY-MM-DD');
        totalCostUsd += activity.costUsd;
        totalRequests += activity.requests;
        totalTokens += activity.totalTokens;
        daysWithData.add(date);

        // "hoje" = dia mais recente com dados disponíveis
        if (date === latestDataDate) todayCostUsd += activity.costUsd;
        if (date >= sevenDaysBack) last7DaysCostUsd += activity.costUsd;
        if (date >= thirtyDaysBack) last30DaysCostUsd += activity.costUsd;
      }

      const credits = await activityRepository.getLatestCreditSnapshot() || {
        total_credits: 0, used_credits: 0, remaining_credits: 0,
      };

      const numDays = daysWithData.size || 1;
      const avgDailyCostUsd = totalCostUsd / numDays;
      const avgCostPerRequest = totalRequests > 0 ? totalCostUsd / totalRequests : 0;

      return {
        totalCostUsd: parseFloat(totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(convertToBrl(totalCostUsd, rate).toFixed(2)),
        totalCredits: this.n(credits.total_credits),
        usedCredits: this.n(credits.used_credits),
        remainingCredits: this.n(credits.remaining_credits),
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
        avgCostPerRequest: parseFloat(avgCostPerRequest.toFixed(6)),
        avgResponseTime: 0,
        successRate: 1,
        latestDataDate,
        exchangeRate: rate,
        exchangeRateSource: currencyInfo.source,
        exchangeRateMode: currencyInfo.mode,
      };
    });
  }

  private n(val: any): number {
    const v = parseFloat(val);
    return isNaN(v) ? 0 : v;
  }

  // ============ TIME SERIES ============
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
          dailyMap.set(date, {
            date,
            totalCostUsd: 0,
            totalCostBrl: 0,
            totalRequests: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTokens: 0,
            avgCostPerRequest: 0,
            avgResponseTime: 0,
            successRate: 1,
            models: [],
          });
        }
        
        const day = dailyMap.get(date)!;
        day.totalCostUsd += activity.costUsd;
        day.totalCostBrl += convertToBrl(activity.costUsd, rate);
        day.totalRequests += activity.requests;
        day.totalPromptTokens += activity.promptTokens;
        day.totalCompletionTokens += activity.completionTokens;
        day.totalTokens += activity.totalTokens;
        
        if (day.totalRequests > 0) {
          day.avgCostPerRequest = day.totalCostUsd / day.totalRequests;
        }
        
        if (activity.responseTimeMs) {
          day.avgResponseTime = (day.avgResponseTime * (day.totalRequests - 1) + activity.responseTimeMs) / day.totalRequests;
        }
        
        day.successRate = activity.success ? day.successRate : (day.successRate * 0.9);
        
        if (!day.models.includes(activity.model)) day.models.push(activity.model);
      }

      const daily = Array.from(dailyMap.values()).map(d => ({
        ...d,
        totalCostUsd: parseFloat(d.totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(d.totalCostBrl.toFixed(2)),
        avgCostPerRequest: parseFloat(d.avgCostPerRequest.toFixed(6)),
        avgResponseTime: parseFloat(d.avgResponseTime.toFixed(0)),
        successRate: parseFloat(d.successRate.toFixed(4)),
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Weekly aggregation
      const weeklyMap = new Map<string, any>();
      for (const day of daily) {
        const weekStart = dayjs(day.date).startOf('week').format('YYYY-MM-DD');
        if (!weeklyMap.has(weekStart)) {
          weeklyMap.set(weekStart, {
            week: `Semana ${Math.ceil(dayjs(day.date).dayOfYear() / 7)}`,
            startDate: weekStart,
            endDate: dayjs(day.date).endOf('week').format('YYYY-MM-DD'),
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
      const weekly = Array.from(weeklyMap.values()).map(w => ({
        ...w,
        totalCostUsd: parseFloat(w.totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(w.totalCostBrl.toFixed(2)),
      })).sort((a, b) => a.startDate.localeCompare(b.startDate));

      // Monthly aggregation
      const monthlyMap = new Map<string, any>();
      for (const day of daily) {
        const month = dayjs(day.date).format('YYYY-MM');
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month: dayjs(day.date).format('MMMM/YYYY'),
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
      const monthly = Array.from(monthlyMap.values()).map(m => ({
        ...m,
        totalCostUsd: parseFloat(m.totalCostUsd.toFixed(4)),
        totalCostBrl: parseFloat(m.totalCostBrl.toFixed(2)),
      })).sort((a, b) => a.month.localeCompare(b.month));

      return { daily, weekly, monthly };
    });
  }

  // ============ MODEL METRICS ============
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
        if (activity.costUsd <= 0) continue; // somente modelos com custo real
        totalCost += activity.costUsd;
        if (!modelMap.has(activity.model)) {
          modelMap.set(activity.model, {
            model: activity.model,
            provider: activity.provider || 'unknown',
            totalCostUsd: 0,
            totalCostBrl: 0,
            totalRequests: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalReasoningTokens: 0,
            totalCachedTokens: 0,
            totalTokens: 0,
            avgCostPerRequest: 0,
            avgCostPerToken: 0,
            avgResponseTime: 0,
            successRate: 1,
            percentOfTotal: 0,
          });
        }

        const model = modelMap.get(activity.model)!;
        model.totalCostUsd += activity.costUsd;
        model.totalCostBrl += convertToBrl(activity.costUsd, rate);
        model.totalRequests += activity.requests;
        model.totalPromptTokens += activity.promptTokens;
        model.totalCompletionTokens += activity.completionTokens;
        model.totalReasoningTokens += activity.reasoningTokens;
        model.totalCachedTokens += activity.cachedTokens;
        model.totalTokens += activity.totalTokens;
      }

      return Array.from(modelMap.values())
        .filter(m => m.totalCostUsd > 0.0001)
        .map(model => {
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
      })
      .sort((a, b) => b.totalCostUsd - a.totalCostUsd);
    });
  }

  // ============ PROVIDER METRICS ============
  async buildProviderMetrics(rangeStr: string = 'last30days'): Promise<{ data: ProviderMetrics[]; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('providers', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      const providerMap = new Map<string, ProviderMetrics>();
      let totalCost = 0;

      for (const activity of activities) {
        if (activity.costUsd <= 0) continue; // somente com custo real
        const provider = activity.provider || 'unknown';
        totalCost += activity.costUsd;

        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            provider,
            totalCostUsd: 0,
            totalCostBrl: 0,
            totalRequests: 0,
            totalTokens: 0,
            avgCostPerRequest: 0,
            percentOfTotal: 0,
          });
        }

        const p = providerMap.get(provider)!;
        p.totalCostUsd += activity.costUsd;
        p.totalCostBrl += convertToBrl(activity.costUsd, rate);
        p.totalRequests += activity.requests;
        p.totalTokens += activity.totalTokens;
      }

      // Ordenar e manter top 8 — agregar restantes em "Outros"
      const TOP_N = 8;
      const sorted = Array.from(providerMap.values())
        .filter(p => p.totalCostUsd > 0.0001)
        .map(p => ({
          ...p,
          totalCostUsd: parseFloat(p.totalCostUsd.toFixed(4)),
          totalCostBrl: parseFloat(p.totalCostBrl.toFixed(2)),
          avgCostPerRequest: parseFloat((p.totalRequests > 0 ? p.totalCostUsd / p.totalRequests : 0).toFixed(6)),
          percentOfTotal: parseFloat((totalCost > 0 ? p.totalCostUsd / totalCost : 0).toFixed(4)),
        }))
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd);

      if (sorted.length <= TOP_N) return sorted;

      const top = sorted.slice(0, TOP_N);
      const others = sorted.slice(TOP_N);
      const othersCost = others.reduce((s, p) => s + p.totalCostUsd, 0);
      const othersBrl = others.reduce((s, p) => s + p.totalCostBrl, 0);
      const othersReq = others.reduce((s, p) => s + p.totalRequests, 0);
      const othersTokens = others.reduce((s, p) => s + p.totalTokens, 0);

      if (othersCost > 0.0001) {
        top.push({
          provider: `Outros (${others.length})`,
          totalCostUsd: parseFloat(othersCost.toFixed(4)),
          totalCostBrl: parseFloat(othersBrl.toFixed(2)),
          totalRequests: othersReq,
          totalTokens: othersTokens,
          avgCostPerRequest: parseFloat((othersReq > 0 ? othersCost / othersReq : 0).toFixed(6)),
          percentOfTotal: parseFloat((totalCost > 0 ? othersCost / totalCost : 0).toFixed(4)),
        });
      }

      return top;
    });
  }

  // ============ API KEY METRICS ============
  async buildApiKeyMetrics(rangeStr: string = 'last30days'): Promise<{ data: ApiKeyMetrics[]; cached: boolean }> {
    const cacheKey = getDashboardCacheKey('apikeys', rangeStr);

    return withCache(cacheKey, async () => {
      // Usar dados diretos da tabela api_keys (sincronizados do /keys endpoint)
      const currencyInfo = await getExchangeRate();
      const rate = currencyInfo.rate;

      const rawKeys = await activityRepository.getAllApiKeys();

      if (rawKeys.length === 0) {
        return [];
      }

      const totalCost = rawKeys.reduce((s: number, k: any) => s + this.n(k.total_cost), 0);

      return rawKeys
        .filter((k: any) => this.n(k.total_cost) > 0.0001)
        .map((k: any) => {
          const costUsd = this.n(k.total_cost);
          const requests = this.n(k.total_requests);
          return {
            api_key_name: k.key_name || 'Unknown',
            totalCostUsd: parseFloat(costUsd.toFixed(4)),
            totalCostBrl: parseFloat(convertToBrl(costUsd, rate).toFixed(2)),
            totalRequests: requests,
            totalTokens: this.n(k.total_tokens),
            avgCostPerRequest: parseFloat((requests > 0 ? costUsd / requests : 0).toFixed(6)),
            percentOfTotal: parseFloat((totalCost > 0 ? costUsd / totalCost : 0).toFixed(4)),
            lastUsed: k.last_used || null,
          };
        })
        .sort((a: ApiKeyMetrics, b: ApiKeyMetrics) => b.totalCostUsd - a.totalCostUsd);
    });
  }

  // ============ HOURLY METRICS (Heatmap) ============
  async buildHourlyMetrics(rangeStr: string = 'last30days'): Promise<{ data: HourlyMetrics[]; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('hourly', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);

      const hourlyMap = new Map<string, HourlyMetrics>();

      for (const activity of activities) {
        const hour = dayjs(activity.timestamp).format('HH:00');
        const dayOfWeek = parseInt(dayjs(activity.timestamp).format('d'));
        const key = `${hour}-${dayOfWeek}`;
        
        if (!hourlyMap.has(key)) {
          hourlyMap.set(key, {
            hour,
            dayOfWeek: DAY_NAMES[dayOfWeek],
            totalCostUsd: 0,
            totalRequests: 0,
            avgCostPerRequest: 0,
          });
        }
        
        const h = hourlyMap.get(key)!;
        h.totalCostUsd += activity.costUsd;
        h.totalRequests += activity.requests;
      }

      return Array.from(hourlyMap.values()).map(h => ({
        ...h,
        totalCostUsd: parseFloat(h.totalCostUsd.toFixed(4)),
        avgCostPerRequest: parseFloat((h.totalRequests > 0 ? h.totalCostUsd / h.totalRequests : 0).toFixed(6)),
      })).sort((a, b) => {
        const hourDiff = parseInt(a.hour) - parseInt(b.hour);
        if (hourDiff !== 0) return hourDiff;
        return a.dayOfWeek.localeCompare(b.dayOfWeek);
      });
    });
  }

  // ============ TOKEN METRICS ============
  async buildTokenMetrics(rangeStr: string = 'last30days'): Promise<{ data: TokenMetrics; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('tokens', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);

      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalReasoningTokens = 0;
      let totalCachedTokens = 0;
      let totalTokens = 0;

      for (const activity of activities) {
        totalPromptTokens += activity.promptTokens;
        totalCompletionTokens += activity.completionTokens;
        totalReasoningTokens += activity.reasoningTokens;
        totalCachedTokens += activity.cachedTokens;
        totalTokens += activity.totalTokens;
      }

      const data: TokenMetrics = {
        totalPromptTokens,
        totalCompletionTokens,
        totalReasoningTokens,
        totalCachedTokens,
        totalTokens,
        promptPercent: totalTokens > 0 ? (totalPromptTokens / totalTokens) * 100 : 0,
        completionPercent: totalTokens > 0 ? (totalCompletionTokens / totalTokens) * 100 : 0,
        cachedPercent: totalTokens > 0 ? (totalCachedTokens / totalTokens) * 100 : 0,
      };

      return { data, cached: false };
    });
  }

  // ============ EXTENDED DASHBOARD ============
  async buildExtendedDashboard(rangeStr: string = 'last30days'): Promise<{ data: ExtendedDashboardData; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('extended', rangeStr);

    return withCache(cacheKey, async () => {
      const [summary, providers, apiKeys, hourly, tokens, models] = await Promise.all([
        this.buildSummary(rangeStr),
        this.buildProviderMetrics(rangeStr),
        this.buildApiKeyMetrics(rangeStr),
        this.buildHourlyMetrics(rangeStr),
        this.buildTokenMetrics(rangeStr),
        this.buildModelMetrics(rangeStr),
      ]);

      // Get top expensive requests
      const activities = await this.getActivitiesForRange(range);
      const topRequests = activities
        .sort((a, b) => b.costUsd - a.costUsd)
        .slice(0, 10)
        .map(a => ({
          model: a.model,
          cost: a.costUsd,
          timestamp: a.timestamp,
        }));

      return {
        data: {
          summary: summary.data,
          providers: providers.data,
          apiKeys: apiKeys.data,
          hourly: hourly.data,
          tokens: tokens.data,
          topRequests,
        },
        cached: summary.cached,
      };
    });
  }

  // ============ INSIGHTS ============
  async buildInsights(rangeStr: string = 'last30days'): Promise<{ data: Insight[]; cached: boolean }> {
    const range = parseRange(rangeStr);
    const cacheKey = getDashboardCacheKey('insights', rangeStr);

    return withCache(cacheKey, async () => {
      const activities = await this.getActivitiesForRange(range);
      const { data: models } = await this.buildModelMetrics(rangeStr);
      const { data: providers } = await this.buildProviderMetrics(rangeStr);
      const { data: apiKeys } = await this.buildApiKeyMetrics(rangeStr);
      const { data: tokens } = await this.buildTokenMetrics(rangeStr);
      const insights: Insight[] = [];

      if (activities.length === 0) {
        return [{
          id: 'no-data',
          type: 'info',
          severity: 'info',
          title: 'Sem dados disponíveis',
          description: 'Sincronize os dados para gerar insights.'
        }];
      }

      // 1. Model concentration
      if (models.length > 0) {
        const topModel = models[0];
        if (topModel.percentOfTotal > 0.5) {
          insights.push({
            id: 'model_concentration',
            type: 'model_concentration',
            severity: topModel.percentOfTotal > 0.75 ? 'warning' : 'info',
            title: 'Alta concentração em modelo',
            description: `${topModel.model} representa ${(topModel.percentOfTotal * 100).toFixed(1)}% dos custos.`,
            meta: { percentage: topModel.percentOfTotal, model: topModel.model },
          });
        }
        
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

      // 2. Provider diversity
      if (providers.length > 3) {
        const topProvider = providers[0];
        if (topProvider.percentOfTotal > 0.6) {
          insights.push({
            id: 'provider_concentration',
            type: 'model_concentration',
            severity: 'info',
            title: 'Fornecedor principal',
            description: `${topProvider.provider} é responsável por ${(topProvider.percentOfTotal * 100).toFixed(1)}% dos gastos.`,
            meta: { percentage: topProvider.percentOfTotal, provider: topProvider.provider },
          });
        }
      }

      // 3. API Key cost analysis
      if (apiKeys.length > 1) {
        const expensiveKey = apiKeys[0];
        const avgCost = apiKeys.reduce((sum, k) => sum + k.totalCostUsd, 0) / apiKeys.length;
        if (expensiveKey.totalCostUsd > avgCost * 3) {
          insights.push({
            id: 'api_key_cost',
            type: 'api_key_cost',
            severity: 'warning',
            title: 'API Key com alto custo',
            description: `${expensiveKey.api_key_name} está gerando ${(expensiveKey.totalCostUsd / avgCost).toFixed(1)}x mais custos que a média.`,
            meta: { apiKey: expensiveKey.api_key_name, multiplier: expensiveKey.totalCostUsd / avgCost },
          });
        }
      }

      // 4. Trend change
      const currentCost = activities.reduce((sum, a) => sum + a.costUsd, 0);
      const previousPeriod = getPreviousPeriod(range);
      const previousActivities = await this.getActivitiesForRange(previousPeriod);
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
            meta: { changePercent: change },
          });
        }
      }

      // 5. Peak day analysis
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
            meta: { date: peakDay.date, cost: peakDay.cost },
          });
        }
      }

      // 6. Token efficiency
      if (tokens.totalTokens > 0 && tokens.cachedPercent < 10) {
        insights.push({
          id: 'low_cache_usage',
          type: 'token_efficiency',
          severity: 'info',
          title: 'Uso de cache otimizável',
          description: `Apenas ${tokens.cachedPercent.toFixed(1)}% dos tokens são reutilizados do cache. Considere queries mais similares.`,
          meta: { cachedPercent: tokens.cachedPercent },
        });
      }

      // 7. Reasoning tokens (for Claude models)
      const reasoningActivities = activities.filter(a => a.reasoningTokens > 0);
      if (reasoningActivities.length > 0) {
        const avgReasoning = reasoningActivities.reduce((sum, a) => sum + a.reasoningTokens, 0) / reasoningActivities.length;
        insights.push({
          id: 'reasoning_usage',
          type: 'token_efficiency',
          severity: 'info',
          title: 'Uso de reasoning tokens',
          description: `${reasoningActivities.length} requisições usaram reasoning tokens (média de ${avgReasoning.toFixed(0)} tokens/requisição).`,
          meta: { count: reasoningActivities.length, avgTokens: avgReasoning },
        });
      }

      return insights;
    });
  }
}

export const aggregationService = new AggregationService();
