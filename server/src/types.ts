// Types for the backend - Extended for SQLite persistence

export interface ActivityItem {
  id?: number;
  request_id: string;
  timestamp: string;
  model: string;
  provider: string;
  user_label?: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  meta?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Database row type (snake_case)
export interface ActivityLogRow {
  id: number;
  request_id: string;
  timestamp: string;
  model: string;
  provider: string;
  user_label: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  meta: string | null;
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
  totalTokens: number;
  costUsd: number;
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
  totalTokens: number;
  avgCostPerRequest: number;
  avgCostPerToken: number;
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
  last7DaysCostUsd: number;
  last7DaysCostBrl: number;
  last30DaysCostUsd: number;
  last30DaysCostBrl: number;
  avgDailyCostUsd: number;
  avgDailyCostBrl: number;
  totalRequests: number;
  totalTokens: number;
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

// Insight types - Updated per requirements
export type InsightType = 'model_concentration' | 'trend_change' | 'peak_day' | 'info' | 'warning' | 'critical';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  meta?: Record<string, any>;
}

export interface LegacyInsight {
  id: string;
  type: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
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
  range: string;  // 'today', 'last7days', 'last30days', or 'YYYY-MM-DD,YYYY-MM-DD'
  forceRefresh?: boolean;
}
