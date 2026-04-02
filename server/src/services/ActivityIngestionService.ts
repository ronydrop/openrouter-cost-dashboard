import axios, { AxiosError } from 'axios';
import { activityRepository } from '../repositories/ActivityRepository.js';
import { ActivityItem, SyncLog } from '../types.js';
import { parseRange, TimeRange } from '../utils/dateRanges.js';
import { invalidateCache } from './cache.js';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENROUTER_API_KEY;
const MANAGEMENT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;

if (!API_KEY) {
  console.warn('[Ingestion] WARNING: OPENROUTER_API_KEY not set');
}
if (!MANAGEMENT_KEY) {
  console.warn('[Ingestion] WARNING: OPENROUTER_MANAGEMENT_KEY not set - /activity endpoint will not work');
} else {
  console.log('[Ingestion] Management Key configured - real data fetch enabled');
}

// Client para endpoints que exigem Management Key (/activity, /keys, /credits)
const mgmtClient = axios.create({
  baseURL: OPENROUTER_API_URL,
  headers: {
    'Authorization': `Bearer ${MANAGEMENT_KEY || API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Client padrão para endpoints normais
const apiClient = axios.create({
  baseURL: OPENROUTER_API_URL,
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  timeout: 60000,
});

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  range: TimeRange;
  message: string;
  errors?: string[];
}

export class ActivityIngestionService {
  async syncFromOpenRouter(rangeStr: string = 'last30days', forceSampleData: boolean = false): Promise<SyncResult> {
    const range = parseRange(rangeStr);
    const errors: string[] = [];
    let recordsSynced = 0;

    console.log(`[Ingestion] Starting sync for range: ${range.label} (${range.start} to ${range.end})`);

    if (!this.hasValidApiKey()) {
      console.log('[Ingestion] No valid API key configured');
      if (forceSampleData) {
        console.log('[Ingestion] Generating sample data (forced)');
        const sampleData = this.generateSampleData(range);
        recordsSynced = await activityRepository.bulkUpsert(sampleData);
        console.log(`[Ingestion] Generated ${recordsSynced} sample records`);
        return { success: true, recordsSynced, range, message: `Generated ${recordsSynced} sample records`, errors };
      }
      return { success: false, recordsSynced, range, message: 'No API key configured', errors };
    }

    let credits = null;
    try {
      const [activities, fetchedCredits, apiKeys] = await Promise.all([
        this.fetchActivities(range),
        this.fetchCredits(),
        this.fetchApiKeys(),
      ]);

      credits = fetchedCredits;
      console.log(`[Ingestion] Fetched ${activities.length} activities`);

      if (activities.length > 0) {
        const normalized = activities.map(a => this.normalizeActivity(a));
        recordsSynced = await activityRepository.bulkUpsert(normalized);
        console.log(`[Ingestion] Saved ${recordsSynced} records to database`);

        if (credits) {
          await activityRepository.saveCreditSnapshot({
            total_credits: credits.total_credits,
            used_credits: credits.used_credits,
            remaining_credits: credits.remaining_credits,
            snapshot_date: new Date().toISOString(),
          });
          console.log('[Ingestion] Saved credit snapshot');
        }

        if (apiKeys && apiKeys.length > 0) {
          await this.updateApiKeysTracking(apiKeys);
          console.log(`[Ingestion] Updated ${apiKeys.length} API keys`);
        }

        this.invalidateAffectedCache(range);

        await activityRepository.logSync({
          sync_type: 'openrouter_api',
          range_start: range.start,
          range_end: range.end,
          records_synced: recordsSynced,
          status: 'success',
        });

        return { success: true, recordsSynced, range, message: `Sync completed. ${recordsSynced} records synced.`, errors };
      }
    } catch (error: any) {
      console.error('[Ingestion] Sync failed:', error.message);
      errors.push(error.message);
    }

    console.log('[Ingestion] Falling back to sample data...');
    const sampleData = this.generateSampleData(range);
    recordsSynced = await activityRepository.bulkUpsert(sampleData);
    console.log(`[Ingestion] Generated ${recordsSynced} sample records`);

    if (credits) {
      await activityRepository.saveCreditSnapshot({
        total_credits: credits.total_credits,
        used_credits: credits.used_credits,
        remaining_credits: credits.remaining_credits,
        snapshot_date: new Date().toISOString(),
      });
    }

    await activityRepository.logSync({
      sync_type: 'openrouter_api',
      range_start: range.start,
      range_end: range.end,
      records_synced: recordsSynced,
      status: 'success',
    });

    return { success: true, recordsSynced, range, message: `Generated ${recordsSynced} sample records for demonstration. API sync failed, using sample data.`, errors };
  }

  private async fetchActivities(range: TimeRange): Promise<any[]> {
    if (!this.hasValidApiKey()) {
      console.log('[Ingestion] No valid API key, skipping fetch');
      return [];
    }

    try {
      console.log(`[Ingestion] Fetching activities from OpenRouter API...`);

      // /activity requer Management Key
      const response = await mgmtClient.get('/activity', {
        params: {
          limit: 1000,
          start_date: range.start.split('T')[0],
          end_date: range.end.split('T')[0],
        },
      });

      console.log(`[Ingestion] Response status: ${response.status}`);
      console.log(`[Ingestion] Response data keys: ${Object.keys(response.data || {})}`);

      let activities = [];
      
      if (response.data?.data) {
        activities = response.data.data;
      } else if (response.data?.activities) {
        activities = response.data.activities;
      } else if (response.data?.logs) {
        activities = response.data.logs;
      } else if (Array.isArray(response.data)) {
        activities = response.data;
      }

      console.log(`[Ingestion] Found ${activities.length} activities in response`);

      const filtered = activities.filter((a: any) => {
        const date = a.timestamp || a.date || a.created_at;
        if (!date) return true;
        try {
          const time = new Date(date).getTime();
          const startTime = new Date(range.start).getTime();
          const endTime = new Date(range.end).getTime();
          return time >= startTime && time <= endTime;
        } catch {
          return true;
        }
      });

      console.log(`[Ingestion] ${filtered.length} activities in date range`);
      return filtered;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      console.error(`[Ingestion] API Error: ${error.message}`);
      console.error(`[Ingestion] Response status: ${axiosError.response?.status}`);
      console.error(`[Ingestion] Response data:`, axiosError.response?.data);

      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        console.error('[Ingestion] Authentication failed - check API key');
      }

      if (axiosError.response?.status === 404) {
        console.log('[Ingestion] /activity endpoint not found, trying alternatives...');
        return this.fetchFromAlternativeEndpoints(range);
      }

      throw error;
    }
  }

  private async fetchFromAlternativeEndpoints(range: TimeRange): Promise<any[]> {
    const endpoints = ['/generations', '/logs', '/usage'];

    for (const endpoint of endpoints) {
      try {
        console.log(`[Ingestion] Trying ${endpoint}...`);
        const response = await mgmtClient.get(endpoint, { params: { limit: 1000 } });
        let data = response.data?.data || response.data?.generations || response.data?.logs || [];

        if (Array.isArray(data)) {
          console.log(`[Ingestion] Found ${data.length} records from ${endpoint}`);
          const filtered = data.filter((item: any) => {
            const date = item.timestamp || item.date || item.created_at;
            if (!date) return true;
            try {
              const time = new Date(date).getTime();
              const startTime = new Date(range.start).getTime();
              const endTime = new Date(range.end).getTime();
              return time >= startTime && time <= endTime;
            } catch {
              return true;
            }
          });
          if (filtered.length > 0) {
            return filtered;
          }
        }
      } catch (e: any) {
        console.log(`[Ingestion] ${endpoint} not available: ${e.message}`);
      }
    }

    console.log('[Ingestion] No alternative endpoints available');
    return [];
  }

  private async fetchCredits(): Promise<{ total_credits: number; used_credits: number; remaining_credits: number } | null> {
    if (!this.hasValidApiKey()) return null;

    try {
      // /credits funciona com qualquer key
      const response = await mgmtClient.get('/credits');
      const data = response.data?.data || response.data;

      if (!data) {
        console.log('[Ingestion] No credits data in response');
        return null;
      }

      const total = data.total_credits ?? data.value ?? 0;
      const used = data.used_credits ?? data.total_usage ?? 0;
      const remaining = data.remaining_credits ?? (total - used);

      console.log(`[Ingestion] Credits: total=${total}, used=${used}, remaining=${remaining}`);

      return {
        total_credits: total,
        used_credits: used,
        remaining_credits: remaining,
      };
    } catch (error: any) {
      console.warn('[Ingestion] Could not fetch credits:', error.message);
      return null;
    }
  }

  private async fetchApiKeys(): Promise<any[]> {
    if (!this.hasValidApiKey()) return [];

    try {
      // /keys requer Management Key
      const response = await mgmtClient.get('/keys');
      const keys = response.data?.keys || response.data?.data || [];
      console.log(`[Ingestion] Found ${keys.length} API keys`);
      return keys;
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.warn('[Ingestion] Could not fetch API keys:', error.message);
      }
      return [];
    }
  }

  private hasValidApiKey(): boolean {
    return (!!API_KEY && API_KEY !== 'sk-or-v1-your-api-key-here' && API_KEY.length > 20) ||
           (!!MANAGEMENT_KEY && MANAGEMENT_KEY.length > 20);
  }

  private normalizeActivity(raw: any): Partial<ActivityItem> {
    // OpenRouter /activity retorna: usage, date, model, provider_name, requests,
    // prompt_tokens, completion_tokens, reasoning_tokens, endpoint_id
    const cost = parseFloat(raw.usage ?? raw.cost ?? raw.amount ?? raw.total_cost ?? raw.price ?? 0) || 0;

    const promptTokens = parseInt(raw.prompt_tokens ?? raw.prompt_tokens_count ?? 0) || 0;
    const completionTokens = parseInt(raw.completion_tokens ?? raw.completion_tokens_count ?? 0) || 0;
    const reasoningTokens = parseInt(raw.reasoning_tokens ?? raw.thinking_tokens ?? 0) || 0;
    const cachedTokens = parseInt(raw.cached_tokens ?? raw.cache_read_tokens ?? 0) || 0;

    // O /activity retorna dados diários agregados — usar date como timestamp
    const rawDate = raw.date || raw.timestamp || raw.created_at || new Date().toISOString();
    // Garantir formato ISO
    const timestamp = new Date(rawDate).toISOString();

    // model_permaslug é o identificador canônico; model é o nome de exibição
    const model = raw.model_permaslug || raw.model || raw.model_id || 'unknown';

    // provider_name vem direto do /activity
    const providerName = raw.provider_name || this.extractProvider(model);

    // request_id único por linha — usar combinação de date + model + endpoint
    const requestId = raw.id || raw.request_id ||
      `${rawDate}-${model}-${raw.endpoint_id || Math.random().toString(36).substr(2, 9)}`;

    return {
      generation_id: raw.id || raw.generation_id || null,
      session_id: raw.session_id || null,
      task_id: raw.task_id || null,
      user_id: raw.user_id || raw.user || null,
      request_id: requestId,
      timestamp,
      model,
      provider_name: providerName,
      api_type: raw.api_type || 'openai',
      api_key_name: raw.key_name || raw.api_key_name || raw.key || null,
      api_key_hash: raw.key_hash || raw.key_id || raw.endpoint_id || null,
      cost,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      reasoning_tokens: reasoningTokens,
      cached_tokens: cachedTokens,
      total_tokens: promptTokens + completionTokens,
      response_time_ms: raw.response_time || raw.latency || raw.duration_ms || null,
      success: raw.success !== undefined ? (raw.success ? 1 : 0) : 1,
      error_message: raw.error || raw.error_message || null,
      endpoint: raw.endpoint_id ? `/chat/completions#${raw.endpoint_id.slice(0, 8)}` : (raw.endpoint || raw.path || '/chat/completions'),
      environment: raw.environment || raw.env || 'production',
      feature_name: raw.feature || raw.function || null,
      metadata: raw.metadata ? JSON.stringify(raw.metadata) : null,
    };
  }

  private extractProvider(model: string): string {
    if (!model) return 'unknown';

    if (model.includes('/')) {
      return model.split('/')[0];
    }

    const providerMap: Record<string, string> = {
      'gpt': 'openai',
      'chatgpt': 'openai',
      'claude': 'anthropic',
      'gemini': 'google',
      'llama': 'meta',
      'mistral': 'mistral',
      'mixtral': 'mistral',
      'command': 'cohere',
      'perplexity': 'perplexity',
      'ai21': 'ai21',
      'meta': 'meta',
      'deepseek': 'deepseek',
      'qwen': 'qwen',
      'moonshot': 'moonshot',
      'groq': 'groq',
      'fireworks': 'fireworks',
      'together': 'together',
      'anyscale': 'anyscale',
      'replicate': 'replicate',
    };

    const lower = model.toLowerCase();
    for (const [prefix, provider] of Object.entries(providerMap)) {
      if (lower.includes(prefix)) return provider;
    }

    return 'unknown';
  }

  private async updateApiKeysTracking(keys: any[]): Promise<void> {
    for (const key of keys) {
      // OpenRouter /keys retorna: name, hash, usage, usage_monthly, usage_daily, updated_at
      const normalized = {
        key_name: key.name || key.key_name || 'Unnamed Key',
        key_hash: key.hash || key.key_hash || key.id || 'unknown',
        // usar usage (total acumulado) como custo, não usage_monthly
        total_cost: parseFloat(key.usage ?? key.total_usage ?? key.total_cost ?? 0) || 0,
        total_requests: parseInt(key.total_requests ?? key.requests ?? 0) || 0,
        total_tokens: parseInt(key.total_tokens ?? key.tokens ?? 0) || 0,
        last_used: key.updated_at || key.last_used || key.lastUsed || null,
      };

      await activityRepository.upsertApiKey(normalized);
    }
  }

  generateSampleData(range: TimeRange): Partial<ActivityItem>[] {
    const models = [
      { name: 'anthropic/claude-3.5-sonnet-20241022', provider: 'anthropic', api_key_name: 'production-main' },
      { name: 'openai/gpt-4o-2024-08-06', provider: 'openai', api_key_name: 'production-main' },
      { name: 'google/gemini-2.0-flash-exp', provider: 'google', api_key_name: 'production-main' },
      { name: 'meta-llama/llama-3-70b-instruct', provider: 'meta', api_key_name: 'research-keys' },
      { name: 'mistralai/mixtral-8x7b-instruct', provider: 'mistral', api_key_name: 'research-keys' },
      { name: 'deepseek/deepseek-chat-v2', provider: 'deepseek', api_key_name: 'cost-saving' },
      { name: 'anthropic/claude-3-opus', provider: 'anthropic', api_key_name: 'premium-tier' },
    ];

    const endpoints = [
      '/chat/completions',
      '/completions',
      '/embeddings',
      '/images/generations',
    ];

    const features = [
      'chatbot',
      'code-generation',
      'text-summary',
      'data-analysis',
      'customer_support',
      'content-moderation',
    ];

    const start = new Date(range.start).getTime();
    const end = new Date(range.end).getTime();
    const data: Partial<ActivityItem>[] = [];
    const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    const requestsPerDay = Math.floor(Math.random() * 15) + 8;

    for (let d = 0; d < Math.min(days, 30); d++) {
      const dayStart = start + d * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      for (let i = 0; i < requestsPerDay; i++) {
        const model = models[Math.floor(Math.random() * models.length)];
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const feature = features[Math.floor(Math.random() * features.length)];

        const promptTokens = Math.floor(Math.random() * 5000) + 500;
        const completionTokens = Math.floor(Math.random() * 3000) + 200;
        const reasoningTokens = model.name.includes('claude-3') ? Math.floor(Math.random() * 2000) : 0;
        const cachedTokens = Math.floor(Math.random() * promptTokens * 0.3);

        const costPerToken: Record<string, number> = {
          'anthropic': 0.000003,
          'openai': 0.000002,
          'google': 0.000001,
          'meta': 0.0000007,
          'mistral': 0.0000007,
          'deepseek': 0.0000005,
        };

        const costPerMillion = costPerToken[model.provider] || 0.000001;

        const cost = (promptTokens * costPerMillion * 1.5) +
                     (completionTokens * costPerMillion * 3) +
                     (reasoningTokens * costPerMillion * 0.5);

        const responseTime = Math.floor(Math.random() * 5000) + 500;
        const success = Math.random() > 0.05 ? 1 : 0;

        data.push({
          generation_id: `gen-${Date.now()}-${d}-${i}-${Math.random().toString(36).substr(2, 6)}`,
          session_id: `session-${Math.floor(Math.random() * 100)}`,
          task_id: `task-${Math.floor(Math.random() * 50)}`,
          user_id: `user-${Math.floor(Math.random() * 20)}`,
          request_id: `sample-${Date.now()}-${d}-${i}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date(dayStart + Math.random() * (dayEnd - dayStart)).toISOString(),
          model: model.name,
          provider_name: model.provider,
          api_type: 'openai',
          api_key_name: model.api_key_name,
          cost: parseFloat(cost.toFixed(6)),
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          reasoning_tokens: reasoningTokens,
          cached_tokens: cachedTokens,
          total_tokens: promptTokens + completionTokens,
          response_time_ms: responseTime,
          success: success,
          error_message: success ? null : 'Rate limit exceeded',
          endpoint: endpoint,
          environment: 'production',
          feature_name: feature,
        });
      }
    }
    return data;
  }

  private invalidateAffectedCache(range: TimeRange): void {
    invalidateCache('dashboard');
    invalidateCache('summary');
    invalidateCache('timeseries');
    invalidateCache('models');
    invalidateCache('insights');
    console.log('[Ingestion] Cache invalidated');
  }
}

export const activityIngestionService = new ActivityIngestionService();
