// Types for OpenRouter Dashboard - Extended

export interface OpenRouterCredits {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
}

export interface DailyMetrics {
  date: string;
  totalCostUsd: number;
  totalCostBrl: number;
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  avgCostPerRequest: number;
  avgResponseTime: number;
  successRate: number;
  models: string[];
}

export interface ModelMetrics {
  model: string;
  provider: string;
  totalCostUsd: number;
  totalCostBrl: number;
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalReasoningTokens: number;
  totalCachedTokens: number;
  totalTokens: number;
  avgCostPerRequest: number;
  avgCostPerToken: number;
  avgResponseTime: number;
  successRate: number;
  percentOfTotal: number;
}

export interface ProviderMetrics {
  provider: string;
  totalCostUsd: number;
  totalCostBrl: number;
  totalRequests: number;
  totalTokens: number;
  avgCostPerRequest: number;
  percentOfTotal: number;
}

export interface ApiKeyMetrics {
  api_key_name: string;
  totalCostUsd: number;
  totalCostBrl: number;
  totalRequests: number;
  totalTokens: number;
  avgCostPerRequest: number;
  percentOfTotal: number;
  lastUsed: string | null;
}

export interface ApiKeyTimeSeriesPoint {
  date: string;
  [apiKey: string]: string | number;
}

export interface ApiKeyTimeSeriesCoverage {
  latestAvailableDate: string | null;
  latestDashboardDate: string | null;
  isDelayed: boolean;
  missingDays: number;
}

export interface ApiKeyTimeSeriesResponse extends ApiResponse<ApiKeyTimeSeriesPoint[]> {
  coverage: ApiKeyTimeSeriesCoverage;
}

export interface HourlyMetrics {
  hour: string;
  dayOfWeek: string;
  totalCostUsd: number;
  totalRequests: number;
  avgCostPerRequest: number;
}

export interface TokenMetrics {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalReasoningTokens: number;
  totalCachedTokens: number;
  totalTokens: number;
  promptPercent: number;
  completionPercent: number;
  cachedPercent: number;
}

export interface DashboardSummary {
  totalCostUsd: number;
  totalCostBrl: number;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  todayCostUsd: number;
  todayCostBrl: number;
  yesterdayCostUsd: number;
  yesterdayCostBrl: number;
  last7DaysCostUsd: number;
  last7DaysCostBrl: number;
  last30DaysCostUsd: number;
  last30DaysCostBrl: number;
  avgDailyCostUsd: number;
  avgDailyCostBrl: number;
  totalRequests: number;
  totalTokens: number;
  avgCostPerRequest: number;
  avgResponseTime: number;
  successRate: number;
  latestDataDate?: string;
  exchangeRate: number;
  exchangeRateSource: string;
  exchangeRateMode: 'auto' | 'manual';
}

export interface TimeSeriesData {
  daily: DailyMetrics[];
  weekly: { week: string; startDate: string; endDate: string; totalCostUsd: number; totalCostBrl: number; totalRequests: number; totalTokens: number; }[];
  monthly: { month: string; totalCostUsd: number; totalCostBrl: number; totalRequests: number; totalTokens: number; }[];
}

export type InsightType = 'model_concentration' | 'trend_change' | 'peak_day' | 
  'api_key_cost' | 'hourly_heatmap' | 'token_efficiency' | 'success_rate' | 'cost_anomaly' | 'info';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  meta?: Record<string, any>;
  potentialSavings?: { usd: number; brl: number };
}

export interface LegacyInsight {
  id: string;
  type: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  potentialSavings?: { usd: number; brl: number };
}

export interface ExtendedDashboardData {
  summary: DashboardSummary;
  providers: ProviderMetrics[];
  apiKeys: ApiKeyMetrics[];
  hourly: HourlyMetrics[];
  tokens: TokenMetrics;
  topRequests: TopRequest[];
}

export interface TopRequest {
  model: string;
  cost: number;
  timestamp: string;
}

export interface ApiResponse<T> {
  data: T;
  range: { start: string; end: string; label: string };
  cached: boolean;
  timestamp: string;
}

export interface SyncResponse {
  success: boolean;
  records_synced: number;
  message: string;
  errors?: string[];
}

export interface SyncStatus {
  recentSyncs: { id: number; sync_type: string; records_synced: number; status: string; created_at: string }[];
  database: { hasData: boolean; totalRecords: number; earliestDate?: string; latestDate?: string };
}

export interface DashboardStatus {
  hasData: boolean;
  activityCount: number;
  dataRange?: { earliest: string; latest: string };
  cache: { keys: number; hits: number; misses: number };
}

export type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'currentMonth' | 'previousMonth' | 'custom';

export interface CurrencyInfo {
  rate: number;
  source: string;
  mode: 'auto' | 'manual';
  lastUpdated: string;
}

export interface RangeOption {
  value: string;
  label: string;
}
