import { getDb, saveDatabase } from '../database';
import { ActivityItem, NormalizedActivityItem, CreditSnapshot, SyncLog } from '../types';
import { TimeRange } from '../utils/dateRanges';

export class ActivityRepository {
  private rowToActivity(row: any): ActivityItem {
    return {
      id: row.id,
      request_id: row.request_id,
      timestamp: row.timestamp,
      model: row.model,
      provider: row.provider || 'unknown',
      user_label: row.user_label || undefined,
      prompt_tokens: row.prompt_tokens || 0,
      completion_tokens: row.completion_tokens || 0,
      total_tokens: row.total_tokens || 0,
      cost_usd: row.cost_usd || 0,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  activityToNormalized(item: ActivityItem): NormalizedActivityItem {
    return {
      timestamp: item.timestamp,
      model: item.model,
      provider: item.provider,
      requests: 1,
      promptTokens: item.prompt_tokens,
      completionTokens: item.completion_tokens,
      totalTokens: item.total_tokens,
      costUsd: item.cost_usd,
    };
  }

  async findByRange(range: TimeRange): Promise<ActivityItem[]> {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM activity_logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC`, [range.start, range.end]);
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
    if (range) { query += ' AND timestamp >= ? AND timestamp <= ?'; params.push(range.start, range.end); }
    query += ' ORDER BY timestamp DESC';
    const result = db.exec(query, params);
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {}; cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return this.rowToActivity(obj);
    });
  }

  async findByRequestId(requestId: string): Promise<ActivityItem | null> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM activity_logs WHERE request_id = ? LIMIT 1', [requestId]);
    if (!result.length || !result[0].values.length) return null;
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: any = {}; cols.forEach((col: string, i: number) => obj[col] = row[i]);
    return this.rowToActivity(obj);
  }

  async upsert(activity: Partial<ActivityItem>): Promise<void> {
    const db = await getDb();
    db.run(`INSERT OR REPLACE INTO activity_logs (request_id, timestamp, model, provider, user_label, prompt_tokens, completion_tokens, total_tokens, cost_usd, meta, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [activity.request_id || '', activity.timestamp || '', activity.model || '', activity.provider || 'unknown', activity.user_label || null, activity.prompt_tokens || 0, activity.completion_tokens || 0, activity.total_tokens || 0, activity.cost_usd || 0, activity.meta ? JSON.stringify(activity.meta) : null]);
    saveDatabase();
  }

  async bulkUpsert(activities: Partial<ActivityItem>[]): Promise<number> {
    const db = await getDb();
    for (const activity of activities) {
      db.run(`INSERT OR REPLACE INTO activity_logs (request_id, timestamp, model, provider, user_label, prompt_tokens, completion_tokens, total_tokens, cost_usd, meta, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [activity.request_id || '', activity.timestamp || '', activity.model || '', activity.provider || 'unknown', activity.user_label || null, activity.prompt_tokens || 0, activity.completion_tokens || 0, activity.total_tokens || 0, activity.cost_usd || 0, activity.meta ? JSON.stringify(activity.meta) : null]);
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
    const result = db.exec('SELECT COUNT(*) FROM activity_logs WHERE timestamp >= ? AND timestamp <= ?', [range.start, range.end]);
    return result.length ? (result[0].values[0][0] as number) || 0 : 0;
  }

  async getTotalCost(range?: TimeRange): Promise<number> {
    const db = await getDb();
    if (!range) {
      const result = db.exec('SELECT SUM(cost_usd) FROM activity_logs');
      return result.length ? (result[0].values[0][0] as number) || 0 : 0;
    }
    const result = db.exec('SELECT SUM(cost_usd) FROM activity_logs WHERE timestamp >= ? AND timestamp <= ?', [range.start, range.end]);
    return result.length ? (result[0].values[0][0] as number) || 0 : 0;
  }

  async saveCreditSnapshot(snapshot: CreditSnapshot): Promise<void> {
    const db = await getDb();
    db.run(`INSERT INTO credit_snapshots (total_credits, used_credits, remaining_credits, snapshot_date) VALUES (?, ?, ?, ?)`,
      [snapshot.total_credits, snapshot.used_credits, snapshot.remaining_credits, snapshot.snapshot_date]);
    saveDatabase();
  }

  async getLatestCreditSnapshot(): Promise<CreditSnapshot | null> {
    const db = await getDb();
    const result = db.exec('SELECT * FROM credit_snapshots ORDER BY snapshot_date DESC LIMIT 1');
    if (!result.length || !result[0].values.length) return null;
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: any = {}; cols.forEach((col: string, i: number) => obj[col] = row[i]);
    return obj;
  }

  async logSync(syncLog: SyncLog): Promise<void> {
    const db = await getDb();
    db.run(`INSERT INTO sync_logs (sync_type, range_start, range_end, records_synced, status, error_message) VALUES (?, ?, ?, ?, ?, ?)`,
      [syncLog.sync_type, syncLog.range_start || '', syncLog.range_end || '', syncLog.records_synced, syncLog.status, syncLog.error_message || '']);
    saveDatabase();
  }

  async getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ${limit}`);
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {}; cols.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    });
  }

  async getDataRange(): Promise<{ earliest: string; latest: string } | null> {
    const db = await getDb();
    const result = db.exec('SELECT MIN(timestamp), MAX(timestamp) FROM activity_logs');
    if (!result.length || !result[0].values[0][0]) return null;
    return { earliest: result[0].values[0][0] as string, latest: result[0].values[0][1] as string };
  }

  async getDistinctModels(): Promise<string[]> {
    const db = await getDb();
    const result = db.exec('SELECT DISTINCT model FROM activity_logs ORDER BY model');
    if (!result.length) return [];
    return result[0].values.map(r => r[0] as string);
  }
}

export const activityRepository = new ActivityRepository();
