import { getDb, saveDatabase } from '../database';
import { ActivityItem, NormalizedActivityItem, CreditSnapshot, SyncLog, ApiKeyRecord } from '../types';
import { TimeRange } from '../utils/dateRanges';

export class ActivityRepository {
  private rowToActivity(row: any): ActivityItem {
    return {
      id: row.id,
      generation_id: row.generation_id || undefined,
      session_id: row.session_id || undefined,
      task_id: row.task_id || undefined,
      user_id: row.user_id || undefined,
      request_id: row.request_id,
      timestamp: row.timestamp,
      model: row.model,
      provider: row.provider_name || row.provider || 'unknown',
      provider_name: row.provider_name || undefined,
      api_type: row.api_type || undefined,
      api_key_name: row.api_key_name || undefined,
      api_key_hash: row.api_key_hash || undefined,
      user_label: row.user_label || undefined,
      cost: row.cost || row.cost_usd || 0,
      cost_usd: row.cost_usd || row.cost || 0,
      prompt_tokens: row.prompt_tokens || 0,
      completion_tokens: row.completion_tokens || 0,
      reasoning_tokens: row.reasoning_tokens || 0,
      cached_tokens: row.cached_tokens || 0,
      total_tokens: row.total_tokens || 0,
      response_time_ms: row.response_time_ms || undefined,
      success: row.success,
      error_message: row.error_message || undefined,
      endpoint: row.endpoint || undefined,
      environment: row.environment || undefined,
      feature_name: row.feature_name || undefined,
      metadata: row.metadata || undefined,
      meta: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  activityToNormalized(item: ActivityItem): NormalizedActivityItem {
    return {
      timestamp: item.timestamp,
      model: item.model,
      provider: item.provider || item.provider_name || 'unknown',
      requests: 1,
      promptTokens: item.prompt_tokens || 0,
      completionTokens: item.completion_tokens || 0,
      reasoningTokens: item.reasoning_tokens || 0,
      cachedTokens: item.cached_tokens || 0,
      totalTokens: item.total_tokens || 0,
      costUsd: item.cost || item.cost_usd || 0,
      responseTimeMs: item.response_time_ms,
      success: item.success !== undefined ? item.success === 1 : true,
      apiKeyName: item.api_key_name,
      endpoint: item.endpoint,
      environment: item.environment,
    };
  }

  async findByRange(range: TimeRange): Promise<ActivityItem[]> {
    const db = await getDb();
    const result = db.exec(
      `SELECT * FROM activity_logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC`,
      [range.start, range.end]
    );
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return this.rowToActivity(obj);
    });
  }

  async findByModel(model: string, range?: TimeRange): Promise<ActivityItem[]> {
    const db = await getDb();
    let query = 'SELECT * FROM activity_logs WHERE model = ?';
    const params: any[] = [model];
    if (range) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    query += ' ORDER BY timestamp DESC';
    const result = db.exec(query, params);
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return this.rowToActivity(obj);
    });
  }

  async findByApiKey(apiKeyName: string, range?: TimeRange): Promise<ActivityItem[]> {
    const db = await getDb();
    let query = 'SELECT * FROM activity_logs WHERE api_key_name = ?';
    const params: any[] = [apiKeyName];
    if (range) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    query += ' ORDER BY timestamp DESC';
    const result = db.exec(query, params);
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return this.rowToActivity(obj);
    });
  }

  async findByRequestId(requestId: string): Promise<ActivityItem | null> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM activity_logs WHERE request_id = ? LIMIT 1', [requestId]);
    if (!result.length || !result[0].values.length) return null;
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: any = {};
    cols.forEach((col: string, i: number) => obj[col] = row[i]);
    return this.rowToActivity(obj);
  }

  async upsert(activity: Partial<ActivityItem>): Promise<void> {
    const db = await getDb();
    db.run(
      `INSERT OR REPLACE INTO activity_logs 
       (generation_id, session_id, task_id, user_id, request_id, timestamp, model, provider_name, api_type, 
        api_key_name, api_key_hash, prompt_tokens, completion_tokens, reasoning_tokens, cached_tokens, 
        total_tokens, cost, response_time_ms, success, error_message, endpoint, environment, 
        feature_name, metadata, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        activity.generation_id || null,
        activity.session_id || null,
        activity.task_id || null,
        activity.user_id || null,
        activity.request_id || '',
        activity.timestamp || '',
        activity.model || '',
        activity.provider_name || activity.provider || 'unknown',
        activity.api_type || 'openai',
        activity.api_key_name || null,
        activity.api_key_hash || null,
        activity.prompt_tokens || 0,
        activity.completion_tokens || 0,
        activity.reasoning_tokens || 0,
        activity.cached_tokens || 0,
        activity.total_tokens || 0,
        activity.cost || activity.cost_usd || 0,
        activity.response_time_ms || null,
        activity.success !== undefined ? activity.success : 1,
        activity.error_message || null,
        activity.endpoint || '/chat/completions',
        activity.environment || 'production',
        activity.feature_name || null,
        activity.metadata || (activity.meta ? JSON.stringify(activity.meta) : null),
      ]
    );
    saveDatabase();
  }

  async bulkUpsert(activities: Partial<ActivityItem>[]): Promise<number> {
    const db = await getDb();
    for (const activity of activities) {
      db.run(
        `INSERT OR REPLACE INTO activity_logs 
         (generation_id, session_id, task_id, user_id, request_id, timestamp, model, provider_name, api_type, 
          api_key_name, api_key_hash, prompt_tokens, completion_tokens, reasoning_tokens, cached_tokens, 
          total_tokens, cost, response_time_ms, success, error_message, endpoint, environment, 
          feature_name, metadata, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          activity.generation_id || null,
          activity.session_id || null,
          activity.task_id || null,
          activity.user_id || null,
          activity.request_id || '',
          activity.timestamp || '',
          activity.model || '',
          activity.provider_name || activity.provider || 'unknown',
          activity.api_type || 'openai',
          activity.api_key_name || null,
          activity.api_key_hash || null,
          activity.prompt_tokens || 0,
          activity.completion_tokens || 0,
          activity.reasoning_tokens || 0,
          activity.cached_tokens || 0,
          activity.total_tokens || 0,
          activity.cost || activity.cost_usd || 0,
          activity.response_time_ms || null,
          activity.success !== undefined ? activity.success : 1,
          activity.error_message || null,
          activity.endpoint || '/chat/completions',
          activity.environment || 'production',
          activity.feature_name || null,
          activity.metadata || (activity.meta ? JSON.stringify(activity.meta) : null),
        ]
      );
    }
    saveDatabase();
    return activities.length;
  }

  async count(range?: TimeRange): Promise<number> {
    const db = await getDb();
    if (!range) {
      const result = db.exec('SELECT COUNT(*) FROM activity_logs');
      return result.length ? (result[0].values[0][0] as number) || 0 : 0;
    }
    const result = db.exec(
      'SELECT COUNT(*) FROM activity_logs WHERE timestamp >= ? AND timestamp <= ?',
      [range.start, range.end]
    );
    return result.length ? (result[0].values[0][0] as number) || 0 : 0;
  }

  async getTotalCost(range?: TimeRange): Promise<number> {
    const db = await getDb();
    if (!range) {
      const result = db.exec('SELECT SUM(cost) FROM activity_logs');
      return result.length ? (result[0].values[0][0] as number) || 0 : 0;
    }
    const result = db.exec(
      'SELECT SUM(cost) FROM activity_logs WHERE timestamp >= ? AND timestamp <= ?',
      [range.start, range.end]
    );
    return result.length ? (result[0].values[0][0] as number) || 0 : 0;
  }

  async getDistinctModels(): Promise<string[]> {
    const db = await getDb();
    const result = db.exec('SELECT DISTINCT model FROM activity_logs ORDER BY model');
    if (!result.length) return [];
    return result[0].values.map(r => r[0] as string);
  }

  async getDistinctApiKeys(): Promise<string[]> {
    const db = await getDb();
    const result = db.exec('SELECT DISTINCT api_key_name FROM activity_logs WHERE api_key_name IS NOT NULL ORDER BY api_key_name');
    if (!result.length) return [];
    return result[0].values.map(r => r[0] as string).filter(Boolean);
  }

  async getDistinctProviders(): Promise<string[]> {
    const db = await getDb();
    const result = db.exec('SELECT DISTINCT provider_name FROM activity_logs WHERE provider_name IS NOT NULL ORDER BY provider_name');
    if (!result.length) return [];
    return result[0].values.map(r => r[0] as string).filter(Boolean);
  }

  async getDataRange(): Promise<{ earliest: string; latest: string } | null> {
    const db = await getDb();
    const result = db.exec('SELECT MIN(timestamp), MAX(timestamp) FROM activity_logs');
    if (!result.length || !result[0].values[0][0]) return null;
    return {
      earliest: result[0].values[0][0] as string,
      latest: result[0].values[0][1] as string,
    };
  }

  async getProviderMetrics(range?: TimeRange): Promise<any[]> {
    const db = await getDb();
    let query = `
      SELECT 
        provider_name as provider,
        SUM(cost) as total_cost,
        SUM(prompt_tokens + completion_tokens) as total_tokens,
        COUNT(*) as total_requests
      FROM activity_logs
    `;
    const params: any[] = [];
    
    if (range) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    
    query += ' GROUP BY provider_name ORDER BY total_cost DESC';
    const result = db.exec(query, params);
    if (!result.length) return [];
    
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    });
  }

  async getApiKeyMetrics(range?: TimeRange): Promise<any[]> {
    const db = await getDb();
    let query = `
      SELECT 
        api_key_name,
        SUM(cost) as total_cost,
        SUM(prompt_tokens + completion_tokens) as total_tokens,
        COUNT(*) as total_requests,
        MAX(timestamp) as last_used
      FROM activity_logs
      WHERE api_key_name IS NOT NULL
    `;
    const params: any[] = [];
    
    if (range) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    
    query += ' GROUP BY api_key_name ORDER BY total_cost DESC';
    const result = db.exec(query, params);
    if (!result.length) return [];
    
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    });
  }

  async getHourlyMetrics(range?: TimeRange): Promise<any[]> {
    const db = await getDb();
    let query = `
      SELECT 
        strftime('%H', timestamp) as hour,
        strftime('%w', timestamp) as day_of_week,
        SUM(cost) as total_cost,
        COUNT(*) as total_requests
      FROM activity_logs
    `;
    const params: any[] = [];
    
    if (range) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    
    query += ' GROUP BY hour, day_of_week ORDER BY hour, day_of_week';
    const result = db.exec(query, params);
    if (!result.length) return [];
    
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    });
  }

  async getTokenMetrics(range?: TimeRange): Promise<any> {
    const db = await getDb();
    let query = `
      SELECT 
        SUM(prompt_tokens) as total_prompt,
        SUM(completion_tokens) as total_completion,
        SUM(reasoning_tokens) as total_reasoning,
        SUM(cached_tokens) as total_cached,
        SUM(total_tokens) as total_tokens
      FROM activity_logs
    `;
    const params: any[] = [];
    
    if (range) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    
    const result = db.exec(query, params);
    if (!result.length || !result[0].values[0][0]) {
      return { total_prompt: 0, total_completion: 0, total_reasoning: 0, total_cached: 0, total_tokens: 0 };
    }
    
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: any = {};
    cols.forEach((col: string, i: number) => obj[col] = row[i]);
    return obj;
  }

  async upsertApiKey(apiKey: Partial<ApiKeyRecord>): Promise<void> {
    const db = await getDb();
    db.run(
      `INSERT OR REPLACE INTO api_keys (key_name, key_hash, total_cost, total_requests, total_tokens, last_used, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        apiKey.key_name || 'unknown',
        apiKey.key_hash || 'unknown',
        apiKey.total_cost || 0,
        apiKey.total_requests || 0,
        apiKey.total_tokens || 0,
        apiKey.last_used || null,
      ]
    );
    saveDatabase();
  }

  async saveCreditSnapshot(snapshot: CreditSnapshot): Promise<void> {
    const db = await getDb();
    db.run(
      `INSERT INTO credit_snapshots (total_credits, used_credits, remaining_credits, snapshot_date) VALUES (?, ?, ?, ?)`,
      [snapshot.total_credits, snapshot.used_credits, snapshot.remaining_credits, snapshot.snapshot_date]
    );
    saveDatabase();
  }

  async getLatestCreditSnapshot(): Promise<CreditSnapshot | null> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM credit_snapshots ORDER BY snapshot_date DESC LIMIT 1');
    if (!result.length || !result[0].values.length) return null;
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: any = {};
    cols.forEach((col: string, i: number) => obj[col] = row[i]);
    return obj;
  }

  async logSync(syncLog: SyncLog): Promise<void> {
    const db = await getDb();
    db.run(
      `INSERT INTO sync_logs (sync_type, range_start, range_end, records_synced, status, error_message) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        syncLog.sync_type,
        syncLog.range_start || '',
        syncLog.range_end || '',
        syncLog.records_synced,
        syncLog.status,
        syncLog.error_message || '',
      ]
    );
    saveDatabase();
  }

  async getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ${limit}`);
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    });
  }
}

export const activityRepository = new ActivityRepository();
