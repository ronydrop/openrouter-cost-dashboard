import axios from 'axios';
import type {
  DashboardSummary,
  TimeSeriesData,
  ModelMetrics,
  Insight,
  CurrencyInfo,
  OpenRouterCredits,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const apiService = {
  // Credits
  async getCredits(): Promise<OpenRouterCredits> {
    const response = await api.get<OpenRouterCredits>('/openrouter/credits');
    return response.data;
  },

  // Exchange Rate
  async getExchangeRate(): Promise<CurrencyInfo> {
    const response = await api.get<CurrencyInfo>('/exchange-rate');
    return response.data;
  },

  async updateExchangeRate(rate: number): Promise<CurrencyInfo> {
    const response = await api.post<CurrencyInfo>('/exchange-rate', { rate });
    return response.data;
  },

  // Dashboard Summary
  async getDashboardSummary(range: string): Promise<DashboardSummary> {
    const response = await api.get<DashboardSummary>('/dashboard/summary', {
      params: { range },
    });
    return response.data;
  },

  // Time Series
  async getTimeSeries(range: string): Promise<TimeSeriesData> {
    const response = await api.get<TimeSeriesData>('/dashboard/timeseries', {
      params: { range },
    });
    return response.data;
  },

  // Model Metrics
  async getModelMetrics(range: string): Promise<ModelMetrics[]> {
    const response = await api.get<ModelMetrics[]>('/dashboard/models', {
      params: { range },
    });
    return response.data;
  },

  // Insights
  async getInsights(range: string): Promise<Insight[]> {
    const response = await api.get<Insight[]>('/dashboard/insights', {
      params: { range },
    });
    return response.data;
  },

  // Health Check
  async healthCheck(): Promise<{ status: string; openrouter: boolean }> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default apiService;
