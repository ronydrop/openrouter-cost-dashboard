import { getDb, saveDatabase } from '../database/index.js';
import { ActivityItem, NormalizedActivityItem, CreditSnapshot, SyncLog, ApiKeyRecord } from '../types.js';
import { TimeRange } from '../utils/dateRanges.js';
import { query, transaction, isPostgresConfigured } from '../database/postgres.js';

export class ActivityRepository {
  // PostgreSQL retorna DECIMAL/BIGINT como strings — forçar conversão
  private n(val: any): number {
    if (val === null || val === undefined) return 0;
    const v = parseFloat(val);
    return isNaN(v) ? 0 : v;
  }

  private rowToActivity(row: any): ActivityItem {
    return {
      id: row.id,
      generation_id: row.generation_id || undefined,
      session_id: row.session_id || undefined,
      task_id: row.task_id || undefined,
      user_id: row.user_id || undefined,
      request_id: row.request_id,
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
      model: row.model,
      provider: row.provider_name || row.provider || 'unknown',
      provider_name: row.provider_name || undefined,
      api_type: row.api_type || undefined,
      api_key_name: row.api_key_name || undefined,
      api_key_hash: row.api_key_hash || undefined,
      user_label: row.user_label || undefined,
      cost: this.n(row.cost ?? row.cost_usd),
      cost_usd: this.n(row.cost_usd ?? row.cost),
      prompt_tokens: this.n(row.prompt_tokens),
      completion_tokens: this.n(row.completion_tokens),
      reasoning_tokens: this.n(row.reasoning_tokens),
      cached_tokens: this.n(row.cached_tokens),
      total_tokens: this.n(row.total_tokens),
      response_time_ms: row.response_time_ms != null ? this.n(row.response_time_ms) : undefined,
      success: typeof row.success === 'boolean' ? (row.success ? 1 : 0) : row.success,
      error_message: row.error_message || undefined,
      endpoint: row.endpoint || undefined,
      environment: row.environment || undefined,
      feature_name: row.feature_name || undefined,
      metadata: row.metadata || undefined,
      meta: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }

  activityToNormalized(item: ActivityItem): NormalizedActivityItem {
    return {
      timestamp: item.timestamp instanceof Date ? (item.timestamp as any).toISOString() : item.timestamp,
      model: item.model,
      provider: item.provider || item.provider_name || 'unknown',
      requests: 1,
      promptTokens: this.n(item.prompt_tokens),
      completionTokens: this.n(item.completion_tokens),
      reasoningTokens: this.n(item.reasoning_tokens),
      cachedTokens: this.n(item.cached_tokens),
      totalTokens: this.n(item.total_tokens),
      costUsd: this.n(item.cost ?? item.cost_usd),
      responseTimeMs: item.response_time_ms != null ? this.n(item.response_time_ms) : undefined,
      success: item.success !== undefined ? (item.success === 1 || item.success === true) : true,
      apiKeyName: item.api_key_name,
      endpoint: item.endpoint,
      environment: item.environment,
    };
  }

  async findByRange(range: TimeRange): Promise<ActivityItem[]> {
    if (isPostgresConfigured()) {
      return this.findByRangePG(range);
    }
    return this.findByRangeSQLite(range);
  }

  private async findByRangeSQLite(range: TimeRange): Promise<ActivityItem[]> {
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

  private async findByRangePG(range: TimeRange): Promise<ActivityItem[]> {
    const result = await query(
      `SELECT * FROM activity_logs WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp DESC`,
      [range.start, range.end]
    );
    return result.rows.map(row => this.rowToActivity(row));
  }

  async findByModel(model: string, range?: TimeRange): Promise<ActivityItem[]> {
    if (isPostgresConfigured()) {
      return this.findByModelPG(model, range);
    }
    return this.findByModelSQLite(model, range);
  }

  private async findByModelSQLite(model: string, range?: TimeRange): Promise<ActivityItem[]> {
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

  private async findByModelPG(model: string, range?: TimeRange): Promise<ActivityItem[]> {
    let sql = 'SELECT * FROM activity_logs WHERE model = $1';
    const params: any[] = [model];
    if (range) {
      sql += ' AND timestamp >= $2 AND timestamp <= $3';
      params.push(range.start, range.end);
    }
    sql += ' ORDER BY timestamp DESC';
    const result = await query(sql, params);
    return result.rows.map(row => this.rowToActivity(row));
  }

  async findByApiKey(apiKeyName: string, range?: TimeRange): Promise<ActivityItem[]> {
    if (isPostgresConfigured()) {
      return this.findByApiKeyPG(apiKeyName, range);
    }
    return this.findByApiKeySQLite(apiKeyName, range);
  }

  private async findByApiKeySQLite(apiKeyName: string, range?: TimeRange): Promise<ActivityItem[]> {
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

  private async findByApiKeyPG(apiKeyName: string, range?: TimeRange): Promise<ActivityItem[]> {
    let sql = 'SELECT * FROM activity_logs WHERE api_key_name = $1';
    const params: any[] = [apiKeyName];
    if (range) {
      sql += ' AND timestamp >= $2 AND timestamp <= $3';
      params.push(range.start, range.end);
    }
    sql += ' ORDER BY timestamp DESC';
    const result = await query(sql, params);
    return result.rows.map(row => this.rowToActivity(row));
  }

  async findByRequestId(requestId: string): Promise<ActivityItem | null> {
    if (isPostgresConfigured()) {
      const result = await query('SELECT * FROM activity_logs WHERE request_id = $1 LIMIT 1', [requestId]);
      return result.rows.length ? this.rowToActivity(result.rows[0]) : null;
    }

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
    if (isPostgresConfigured()) {
      return this.upsertPG(activity);
    }
    return this.upsertSQLite(activity);
  }

  private async upsertSQLite(activity: Partial<ActivityItem>): Promise<void> {
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

  private async upsertPG(activity: Partial<ActivityItem>): Promise<void> {
    await query(
      `INSERT INTO activity_logs 
       (generation_id, session_id, task_id, user_id, request_id, timestamp, model, provider_name, api_type, 
        api_key_name, api_key_hash, prompt_tokens, completion_tokens, reasoning_tokens, cached_tokens, 
        total_tokens, cost, response_time_ms, success, error_message, endpoint, environment, 
        feature_name, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (request_id, timestamp) DO UPDATE SET
        generation_id = EXCLUDED.generation_id,
        session_id = EXCLUDED.session_id,
        task_id = EXCLUDED.task_id,
        user_id = EXCLUDED.user_id,
        prompt_tokens = EXCLUDED.prompt_tokens,
        completion_tokens = EXCLUDED.completion_tokens,
        reasoning_tokens = EXCLUDED.reasoning_tokens,
        cached_tokens = EXCLUDED.cached_tokens,
        total_tokens = EXCLUDED.total_tokens,
        cost = EXCLUDED.cost,
        response_time_ms = EXCLUDED.response_time_ms,
        success = EXCLUDED.success,
        error_message = EXCLUDED.error_message,
        updated_at = NOW()`,
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

  async bulkUpsert(activities: Partial<ActivityItem>[]): Promise<number> {
    if (isPostgresConfigured()) {
      return this.bulkUpsertPG(activities);
    }
    return this.bulkUpsertSQLite(activities);
  }

  private async bulkUpsertSQLite(activities: Partial<ActivityItem>[]): Promise<number> {
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

  private async bulkUpsertPG(activities: Partial<ActivityItem>[]): Promise<number> {
    return transaction(async (client) => {
      for (const activity of activities) {
        await client.query(
          `INSERT INTO activity_logs 
           (generation_id, session_id, task_id, user_id, request_id, timestamp, model, provider_name, api_type, 
            api_key_name, api_key_hash, prompt_tokens, completion_tokens, reasoning_tokens, cached_tokens, 
            total_tokens, cost, response_time_ms, success, error_message, endpoint, environment, 
            feature_name, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
           ON CONFLICT (request_id, timestamp) DO UPDATE SET
            generation_id = EXCLUDED.generation_id,
            session_id = EXCLUDED.session_id,
            task_id = EXCLUDED.task_id,
            user_id = EXCLUDED.user_id,
            prompt_tokens = EXCLUDED.prompt_tokens,
            completion_tokens = EXCLUDED.completion_tokens,
            reasoning_tokens = EXCLUDED.reasoning_tokens,
            cached_tokens = EXCLUDED.cached_tokens,
            total_tokens = EXCLUDED.total_tokens,
            cost = EXCLUDED.cost,
            response_time_ms = EXCLUDED.response_time_ms,
            success = EXCLUDED.success,
            error_message = EXCLUDED.error_message,
            updated_at = NOW()`,
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
      return activities.length;
    });
  }

  async count(range?: TimeRange): Promise<number> {
    if (isPostgresConfigured()) {
      if (!range) {
        const result = await query('SELECT COUNT(*) FROM activity_logs');
        return parseInt(result.rows[0].count) || 0;
      }
      const result = await query(
        'SELECT COUNT(*) FROM activity_logs WHERE timestamp >= $1 AND timestamp <= $2',
        [range.start, range.end]
      );
      return parseInt(result.rows[0].count) || 0;
    }

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
    if (isPostgresConfigured()) {
      if (!range) {
        const result = await query('SELECT COALESCE(SUM(cost), 0) FROM activity_logs');
        return parseFloat(result.rows[0].sum) || 0;
      }
      const result = await query(
        'SELECT COALESCE(SUM(cost), 0) FROM activity_logs WHERE timestamp >= $1 AND timestamp <= $2',
        [range.start, range.end]
      );
      return parseFloat(result.rows[0].sum) || 0;
    }

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
    if (isPostgresConfigured()) {
      const result = await query('SELECT DISTINCT model FROM activity_logs ORDER BY model');
      return result.rows.map(r => r.model);
    }

    const db = await getDb();
    const result = db.exec('SELECT DISTINCT model FROM activity_logs ORDER BY model');
    if (!result.length) return [];
    return result[0].values.map(r => r[0] as string);
  }

  async getDistinctApiKeys(): Promise<string[]> {
    if (isPostgresConfigured()) {
      const result = await query('SELECT DISTINCT api_key_name FROM activity_logs WHERE api_key_name IS NOT NULL ORDER BY api_key_name');
      return result.rows.map(r => r.api_key_name).filter(Boolean);
    }

    const db = await getDb();
    const result = db.exec('SELECT DISTINCT api_key_name FROM activity_logs WHERE api_key_name IS NOT NULL ORDER BY api_key_name');
    if (!result.length) return [];
    return result[0].values.map(r => r[0] as string).filter(Boolean);
  }

  async getDistinctProviders(): Promise<string[]> {
    if (isPostgresConfigured()) {
      const result = await query('SELECT DISTINCT provider_name FROM activity_logs WHERE provider_name IS NOT NULL ORDER BY provider_name');
      return result.rows.map(r => r.provider_name).filter(Boolean);
    }

    const db = await getDb();
    const result = db.exec('SELECT DISTINCT provider_name FROM activity_logs WHERE provider_name IS NOT NULL ORDER BY provider_name');
    if (!result.length) return [];
    return result[0].values.map(r => r[0] as string).filter(Boolean);
  }

  async getDataRange(): Promise<{ earliest: string; latest: string } | null> {
    if (isPostgresConfigured()) {
      const result = await query('SELECT MIN(timestamp), MAX(timestamp) FROM activity_logs');
      if (!result.rows.length || !result.rows[0].min) return null;
      return {
        earliest: result.rows[0].min,
        latest: result.rows[0].max,
      };
    }

    const db = await getDb();
    const result = db.exec('SELECT MIN(timestamp), MAX(timestamp) FROM activity_logs');
    if (!result.length || !result[0].values[0][0]) return null;
    return {
      earliest: result[0].values[0][0] as string,
      latest: result[0].values[0][1] as string,
    };
  }

  async getProviderMetrics(range?: TimeRange): Promise<any[]> {
    if (isPostgresConfigured()) {
      let sql = `
        SELECT 
          provider_name as provider,
          SUM(cost) as total_cost,
          SUM(prompt_tokens + completion_tokens) as total_tokens,
          COUNT(*) as total_requests
        FROM activity_logs
      `;
      const params: any[] = [];
      
      if (range) {
        sql += ' WHERE timestamp >= $1 AND timestamp <= $2';
        params.push(range.start, range.end);
      }
      
      sql += ' GROUP BY provider_name ORDER BY total_cost DESC';
      const result = await query(sql, params);
      return result.rows;
    }

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
    if (isPostgresConfigured()) {
      let sql = `
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
        sql += ' AND timestamp >= $1 AND timestamp <= $2';
        params.push(range.start, range.end);
      }
      
      sql += ' GROUP BY api_key_name ORDER BY total_cost DESC';
      const result = await query(sql, params);
      return result.rows;
    }

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
    if (isPostgresConfigured()) {
      let sql = `
        SELECT 
          strftime('%H', timestamp) as hour,
          strftime('%w', timestamp) as day_of_week,
          SUM(cost) as total_cost,
          COUNT(*) as total_requests
        FROM activity_logs
      `;
      const params: any[] = [];
      
      if (range) {
        sql += ' WHERE timestamp >= $1 AND timestamp <= $2';
        params.push(range.start, range.end);
      }
      
      sql += ' GROUP BY hour, day_of_week ORDER BY hour, day_of_week';
      const result = await query(sql, params);
      return result.rows;
    }

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
    if (isPostgresConfigured()) {
      let sql = `
        SELECT 
          COALESCE(SUM(prompt_tokens), 0) as total_prompt,
          COALESCE(SUM(completion_tokens), 0) as total_completion,
          COALESCE(SUM(reasoning_tokens), 0) as total_reasoning,
          COALESCE(SUM(cached_tokens), 0) as total_cached,
          COALESCE(SUM(total_tokens), 0) as total_tokens
        FROM activity_logs
      `;
      const params: any[] = [];
      
      if (range) {
        sql += ' WHERE timestamp >= $1 AND timestamp <= $2';
        params.push(range.start, range.end);
      }
      
      const result = await query(sql, params);
      if (!result.rows.length || !result.rows[0].total_prompt) {
        return { total_prompt: 0, total_completion: 0, total_reasoning: 0, total_cached: 0, total_tokens: 0 };
      }
      
      return result.rows[0];
    }

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
    if (isPostgresConfigured()) {
      await query(
        `INSERT INTO api_keys (key_name, key_hash, total_cost, total_requests, total_tokens, last_used, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (key_hash) DO UPDATE SET
          key_name = EXCLUDED.key_name,
          total_cost = EXCLUDED.total_cost,
          total_requests = EXCLUDED.total_requests,
          total_tokens = EXCLUDED.total_tokens,
          last_used = EXCLUDED.last_used,
          updated_at = NOW()`,
        [
          apiKey.key_name || 'unknown',
          apiKey.key_hash || 'unknown',
          apiKey.total_cost || 0,
          apiKey.total_requests || 0,
          apiKey.total_tokens || 0,
          apiKey.last_used || null,
        ]
      );
      return;
    }

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
    if (isPostgresConfigured()) {
      await query(
        `INSERT INTO credit_snapshots (total_credits, used_credits, remaining_credits, snapshot_date) VALUES ($1, $2, $3, $4)`,
        [snapshot.total_credits, snapshot.used_credits, snapshot.remaining_credits, snapshot.snapshot_date]
      );
      return;
    }

    const db = await getDb();
    db.run(
      `INSERT INTO credit_snapshots (total_credits, used_credits, remaining_credits, snapshot_date) VALUES (?, ?, ?, ?)`,
      [snapshot.total_credits, snapshot.used_credits, snapshot.remaining_credits, snapshot.snapshot_date]
    );
    saveDatabase();
  }

  async getLatestCreditSnapshot(): Promise<CreditSnapshot | null> {
    if (isPostgresConfigured()) {
      const result = await query('SELECT * FROM credit_snapshots ORDER BY snapshot_date DESC LIMIT 1');
      if (!result.rows.length) return null;
      const r = result.rows[0];
      return {
        id: r.id,
        total_credits: this.n(r.total_credits),
        used_credits: this.n(r.used_credits),
        remaining_credits: this.n(r.remaining_credits),
        snapshot_date: r.snapshot_date instanceof Date ? r.snapshot_date.toISOString() : r.snapshot_date,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      };
    }

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
    if (isPostgresConfigured()) {
      await query(
        `INSERT INTO sync_logs (sync_type, range_start, range_end, records_synced, status, error_message) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          syncLog.sync_type,
          syncLog.range_start || '',
          syncLog.range_end || '',
          syncLog.records_synced,
          syncLog.status,
          syncLog.error_message || '',
        ]
      );
      return;
    }

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

  async getAllApiKeys(): Promise<any[]> {
    if (isPostgresConfigured()) {
      const result = await query('SELECT * FROM api_keys ORDER BY total_cost DESC');
      return result.rows.map((r: any) => ({
        ...r,
        total_cost: this.n(r.total_cost),
        total_requests: this.n(r.total_requests),
        total_tokens: this.n(r.total_tokens),
      }));
    }
    const db = await getDb();
    const result = db.exec('SELECT * FROM api_keys ORDER BY total_cost DESC');
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    });
  }

  async getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
    if (isPostgresConfigured()) {
      const result = await query(`SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT $1`, [limit]);
      return result.rows;
    }

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