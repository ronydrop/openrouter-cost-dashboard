// Types for the backend - Extended schema for OpenRouter analytics

export interface ActivityItem {
  id?: number;
  generation_id?: string;
  session_id?: string;
  task_id?: string;
  user_id?: string;
  request_id: string;
  timestamp: string;
  model: string;
  provider?: string;
  provider_name?: string;
  api_type?: string;
  api_key_name?: string;
  api_key_hash?: string;
  user_label?: string;
  cost?: number;
  cost_usd?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  reasoning_tokens?: number;
  cached_tokens?: number;
  total_tokens?: number;
  response_time_ms?: number;
  success?: number;
  error_message?: string;
  endpoint?: string;
  environment?: string;
  feature_name?: string;
  metadata?: string;
  meta?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Database row type (snake_case)
export interface ActivityLogRow {
  id: number;
  generation_id: string | null;
  session_id: string | null;
  task_id: string | null;
  user_id: string | null;
  request_id: string;
  timestamp: string;
  model: string;
  provider_name: string | null;
  api_type: string | null;
  api_key_name: string | null;
  api_key_hash: string | null;
  user_label: string | null;
  cost: number;
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  response_time_ms: number | null;
  success: number;
  error_message: string | null;
  endpoint: string | null;
  environment: string | null;
  feature_name: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

// Credit snapshot
export interface CreditSnapshot {
  id?: number;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  snapshot_date: string;
  created_at?: string;
}

// API Keys table
export interface ApiKeyRecord {
  id?: number;
  key_name: string;
  key_hash: string;
  total_cost: number;
  total_requests: number;
  total_tokens: number;
  last_used: string | null;
  created_at?: string;
  updated_at?: string;
}

// Sync log
export interface SyncLog {
  id?: number;
  sync_type: string;
  range_start: string | null;
  range_end: string | null;
  records_synced: number;
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  created_at?: string;
}

// Normalized activity for aggregation
export interface NormalizedActivityItem {
  timestamp: string;
  model: string;
  provider: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  costUsd: number;
  responseTimeMs?: number;
  success: boolean;
  apiKeyName?: string;
  endpoint?: string;
  environment?: string;
}

// Extended metrics
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

export interface ApiKeyTimeSeriesEntry {
  date: string;
  api_key_name: string;
  total_cost: number;
  total_requests: number;
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

export interface HourlyMetrics {
  hour: string;
  dayOfWeek: string;
  totalCostUsd: number;
  totalRequests: number;
  avgCostPerRequest: number;
}

export interface EndpointMetrics {
  endpoint: string;
  totalCostUsd: number;
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
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

// Dashboard types
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
  weekly: {
    week: string;
    startDate: string;
    endDate: string;
    totalCostUsd: number;
    totalCostBrl: number;
    totalRequests: number;
    totalTokens: number;
  }[];
  monthly: {
    month: string;
    totalCostUsd: number;
    totalCostBrl: number;
    totalRequests: number;
    totalTokens: number;
  }[];
}

// Insight types
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
  potentialSavings?: {
    usd: number;
    brl: number;
  };
}

// OpenRouter API types
export interface OpenRouterCredits {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
}

export interface OpenRouterActivityItem {
  id: string;
  model: string;
  provider?: string;
  cost?: number;
  tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  requests?: number;
  date: string;
}

export interface OpenRouterKey {
  name: string;
  hash: string;
  total_usage?: number;
  total_requests?: number;
  last_used?: string;
}

// API Response types
export interface SyncResponse {
  success: boolean;
  records_synced: number;
  range: string;
  message: string;
}

export interface AggregationResponse<T> {
  data: T;
  range: {
    start: string;
    end: string;
    label: string;
  };
  cached: boolean;
  timestamp: string;
}

// Currency types
export interface CurrencyInfo {
  rate: number;
  source: string;
  mode: 'auto' | 'manual';
  lastUpdated: string;
}

// Sync options
export interface SyncOptions {
  range: string;
  forceRefresh?: boolean;
}

// Extended dashboard data
export interface ExtendedDashboardData {
  summary: DashboardSummary;
  providers: ProviderMetrics[];
  apiKeys: ApiKeyMetrics[];
  hourly: HourlyMetrics[];
  endpoints: EndpointMetrics[];
  tokens: TokenMetrics;
  topRequests: {
    model: string;
    cost: number;
    timestamp: string;
  }[];
}
