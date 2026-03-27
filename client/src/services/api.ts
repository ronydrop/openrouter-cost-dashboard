import axios from 'axios';
import type { DashboardSummary, TimeSeriesData, ModelMetrics, Insight, CurrencyInfo, OpenRouterCredits, ApiResponse, SyncResponse, DashboardStatus, RangeOption, SyncStatus } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const apiService = {
  async syncData(range: string = 'last30days'): Promise<SyncResponse> {
    const response = await api.post<SyncResponse>(`/openrouter/sync?range=${range}`);
    return response.data;
  },

  async getSyncStatus(): Promise<SyncStatus> {
    const response = await api.get<SyncStatus>('/openrouter/sync/status');
    return response.data;
  },

  async getDashboardStatus(): Promise<DashboardStatus> {
    const response = await api.get<DashboardStatus>('/dashboard/status');
    return response.data;
  },

  async getAvailableRanges(): Promise<{ ranges: RangeOption[] }> {
    const response = await api.get<{ ranges: RangeOption[] }>('/dashboard/ranges');
    return response.data;
  },

  async getCredits(): Promise<OpenRouterCredits> {
    const response = await api.get<OpenRouterCredits>('/openrouter/credits');
    return response.data;
  },

  async getExchangeRate(): Promise<CurrencyInfo> {
    const response = await api.get<CurrencyInfo>('/exchange-rate');
    return response.data;
  },

  async updateExchangeRate(rate: number): Promise<CurrencyInfo> {
    const response = await api.post<CurrencyInfo>('/exchange-rate', { rate });
    return response.data;
  },

  async getDashboardSummary(range: string): Promise<ApiResponse<DashboardSummary>> {
    const response = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary', { params: { range } });
    return response.data;
  },

  async getTimeSeries(range: string, granularity?: string): Promise<ApiResponse<TimeSeriesData>> {
    const response = await api.get<ApiResponse<TimeSeriesData>>('/dashboard/timeseries', {
      params: { range, granularity },
    });
    return response.data;
  },

  async getModelMetrics(range: string): Promise<ApiResponse<ModelMetrics[]>> {
    const response = await api.get<ApiResponse<ModelMetrics[]>>('/dashboard/models', { params: { range } });
    return response.data;
  },

  async getInsights(range: string): Promise<ApiResponse<Insight[]>> {
    const response = await api.get<ApiResponse<Insight[]>>('/dashboard/insights', { params: { range } });
    return response.data;
  },

  async healthCheck(): Promise<{ status: string; openrouter: boolean }> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default apiService;
