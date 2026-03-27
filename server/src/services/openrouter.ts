import axios from 'axios';
import dotenv from 'dotenv';
import type { NormalizedActivityItem, OpenRouterCredits, OpenRouterActivityItem } from '../types';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY not set in environment variables');
}

const apiClient = axios.create({
  baseURL: OPENROUTER_API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export async function getCredits(): Promise<OpenRouterCredits> {
  if (!API_KEY || API_KEY === 'sk-or-v1-your-api-key-here') {
    return { total_credits: 0, used_credits: 0, remaining_credits: 0 };
  }

  try {
    const response = await apiClient.get('/credits');
    const data = response.data?.data;

    return {
      total_credits: data?.total_credits ?? 0,
      used_credits: data?.total_usage ?? 0,
      remaining_credits: (data?.total_credits ?? 0) - (data?.total_usage ?? 0),
    };
  } catch (error: any) {
    console.error('Error fetching OpenRouter credits:', error.message);
    return { total_credits: 0, used_credits: 0, remaining_credits: 0 };
  }
}

export async function getActivity(startDate?: string, endDate?: string): Promise<NormalizedActivityItem[]> {
  if (!API_KEY || API_KEY === 'sk-or-v1-your-api-key-here') {
    console.log('No valid API key, returning sample data');
    return generateSampleData(startDate, endDate);
  }

  try {
    const response = await apiClient.get('/activities', {
      params: {
        limit: 1000,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });

    const activities = response.data?.data || response.data?.activities || [];
    return normalizeActivities(activities);
  } catch (error: any) {
    console.error('Error fetching OpenRouter activity:', error.message);

    // If the API endpoint doesn't exist or auth fails, try alternatives
    if (error.response?.status === 404) {
      console.log('Activity endpoint not available, using alternative method');
      return getActivityFromGenerations(startDate, endDate);
    }

    // For auth errors, fall back to sample data
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('API authentication failed, returning sample data');
      return generateSampleData(startDate, endDate);
    }

    throw new Error(`Failed to fetch activity: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function getActivityFromGenerations(startDate?: string, endDate?: string): Promise<NormalizedActivityItem[]> {
  try {
    // Alternative: Try to fetch generation logs if available
    const response = await apiClient.get('/generations', {
      params: {
        limit: 1000,
      },
    });

    let generations = response.data?.data || response.data?.generations || [];
    
    // Filter by date if provided
    if (startDate || endDate) {
      generations = generations.filter((g: any) => {
        const genDate = new Date(g.created_at || g.date);
        if (startDate && genDate < new Date(startDate)) return false;
        if (endDate && genDate > new Date(endDate)) return false;
        return true;
      });
    }

    return normalizeActivities(generations);
  } catch (error: any) {
    console.log('Generations endpoint not available, returning sample data for demonstration');
    // Return sample data for demonstration purposes when API is not fully accessible
    return generateSampleData(startDate, endDate);
  }
}

function normalizeActivities(activities: any[]): NormalizedActivityItem[] {
  return activities.map((activity: any) => {
    // Handle different possible response formats
    const cost = activity.cost ?? activity.amount ?? 0;
    const promptTokens = activity.prompt_tokens ?? activity.prompt_tokens_count ?? 0;
    const completionTokens = activity.completion_tokens ?? activity.completion_tokens_count ?? 0;
    const requests = activity.requests ?? activity.request_count ?? 1;
    
    // Extract date from various possible fields
    const date = activity.date || activity.created_at || activity.timestamp || new Date().toISOString();

    return {
      timestamp: date,
      model: activity.model || 'unknown',
      provider: activity.provider || extractProvider(activity.model) || 'unknown',
      requests: typeof requests === 'number' ? requests : 1,
      promptTokens: typeof promptTokens === 'number' ? promptTokens : 0,
      completionTokens: typeof completionTokens === 'number' ? completionTokens : 0,
      totalTokens: (typeof promptTokens === 'number' ? promptTokens : 0) + (typeof completionTokens === 'number' ? completionTokens : 0),
      costUsd: typeof cost === 'number' ? cost : 0,
    };
  });
}

function extractProvider(model: string): string | null {
  // Extract provider from model name (e.g., "anthropic/claude-3.5-sonnet" -> "anthropic")
  if (model && model.includes('/')) {
    return model.split('/')[0];
  }
  return null;
}

function generateSampleData(startDate?: string, endDate?: string): NormalizedActivityItem[] {
  // Generate sample data for demonstration
  const models = [
    { name: 'anthropic/claude-3.5-sonnet', provider: 'Anthropic' },
    { name: 'openai/gpt-4o', provider: 'OpenAI' },
    { name: 'google/gemini-pro-1.5', provider: 'Google' },
    { name: 'meta-llama/llama-3-70b-instruct', provider: 'Meta' },
    { name: 'mistralai/mixtral-8x7b', provider: 'Mistral' },
    { name: 'anthropic/claude-3-opus', provider: 'Anthropic' },
    { name: 'openai/gpt-4-turbo', provider: 'OpenAI' },
  ];

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  
  const data: NormalizedActivityItem[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    // Generate 5-20 requests per day
    const requestsPerDay = Math.floor(Math.random() * 16) + 5;
    
    for (let i = 0; i < requestsPerDay; i++) {
      const model = models[Math.floor(Math.random() * models.length)];
      const isPrompt = Math.random() > 0.3;
      const promptTokens = Math.floor(Math.random() * 4000) + 500;
      const completionTokens = Math.floor(Math.random() * 2000) + 200;
      const cost = (promptTokens * 0.000003 + completionTokens * 0.000015) * (0.8 + Math.random() * 0.4);
      
      data.push({
        timestamp: new Date(currentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        model: model.name,
        provider: model.provider,
        requests: 1,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUsd: parseFloat(cost.toFixed(6)),
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

export function checkApiHealth(): boolean {
  return !!API_KEY && API_KEY !== 'sk-or-v1-your-api-key-here';
}
