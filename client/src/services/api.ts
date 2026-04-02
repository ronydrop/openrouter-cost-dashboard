import axios from 'axios';
import type { 
  DashboardSummary, TimeSeriesData, ModelMetrics, Insight, CurrencyInfo, 
  OpenRouterCredits, ApiResponse, SyncResponse, DashboardStatus, RangeOption, 
  SyncStatus, ProviderMetrics, ApiKeyMetrics, HourlyMetrics, TokenMetrics,
  ExtendedDashboardData, ApiKeyTimeSeriesResponse
} from '../types';

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

  async getSyncNeeded(): Promise<{ needsSync: boolean; reason: string; lastSyncAt: string | null; nextSyncAt: string | null }> {
    const response = await api.get('/openrouter/sync/needed');
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

  async getProviderMetrics(range: string): Promise<ApiResponse<ProviderMetrics[]>> {
    const response = await api.get<ApiResponse<ProviderMetrics[]>>('/dashboard/providers', { params: { range } });
    return response.data;
  },

  async getApiKeyMetrics(range: string): Promise<ApiResponse<ApiKeyMetrics[]>> {
    const response = await api.get<ApiResponse<ApiKeyMetrics[]>>('/dashboard/apikeys', { params: { range } });
    return response.data;
  },

  async getApiKeyTimeSeries(range: string): Promise<ApiKeyTimeSeriesResponse> {
    const response = await api.get<ApiKeyTimeSeriesResponse>('/dashboard/apikeys/timeseries', { params: { range } });
    return response.data;
  },

  async getHourlyMetrics(range: string): Promise<ApiResponse<HourlyMetrics[]>> {
    const response = await api.get<ApiResponse<HourlyMetrics[]>>('/dashboard/hourly', { params: { range } });
    return response.data;
  },

  async getTokenMetrics(range: string): Promise<ApiResponse<TokenMetrics>> {
    const response = await api.get<ApiResponse<TokenMetrics>>('/dashboard/tokens', { params: { range } });
    return response.data;
  },

  async getExtendedDashboard(range: string): Promise<ApiResponse<ExtendedDashboardData>> {
    const response = await api.get<ApiResponse<ExtendedDashboardData>>('/dashboard/extended', { params: { range } });
    return response.data;
  },

  async getInsights(range: string): Promise<ApiResponse<Insight[]>> {
    const response = await api.get<ApiResponse<Insight[]>>('/dashboard/insights', { params: { range } });
    return response.data;
  },

  async clearCache(): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>('/dashboard/cache/clear');
    return response.data;
  },

  async healthCheck(): Promise<{ status: string; openrouter: boolean }> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default apiService;
