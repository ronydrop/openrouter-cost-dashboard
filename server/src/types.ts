// Types for the backend

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

export interface Insight {
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

export interface CurrencyInfo {
  rate: number;
  source: string;
  mode: 'auto' | 'manual';
  lastUpdated: string;
}

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
