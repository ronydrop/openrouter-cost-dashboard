import db, { initializeDatabase } from '../database';
import { ActivityItem, ActivityLogRow, NormalizedActivityItem, CreditSnapshot, SyncLog } from '../types';
import { TimeRange, parseRange } from '../utils/dateRanges';
import dayjs from 'dayjs';

export class ActivityRepository {
  constructor() {
    initializeDatabase();
  }

  /**
   * Convert database row to ActivityItem
   */
  private rowToActivity(row: ActivityLogRow): ActivityItem {
    return {
      id: row.id,
      request_id: row.request_id,
      timestamp: row.timestamp,
      model: row.model,
      provider: row.provider,
      user_label: row.user_label || undefined,
      prompt_tokens: row.prompt_tokens,
      completion_tokens: row.completion_tokens,
      total_tokens: row.total_tokens,
      cost_usd: row.cost_usd,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Convert ActivityItem to NormalizedActivityItem for aggregation
   */
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

  /**
   * Find activities by time range
   */
  findByRange(range: TimeRange): ActivityItem[] {
    const stmt = db.prepare(`
      SELECT * FROM activity_logs 
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `);
    
    const rows = stmt.all(range.start, range.end) as ActivityLogRow[];
    return rows.map(row => this.rowToActivity(row));
  }

  /**
   * Find activities by model
   */
  findByModel(model: string, range?: TimeRange): ActivityItem[] {
    let query = 'SELECT * FROM activity_logs WHERE model = ?';
    const params: any[] = [model];
    
    if (range) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as ActivityLogRow[];
    return rows.map(row => this.rowToActivity(row));
  }

  /**
   * Find activities by provider
   */
  findByProvider(provider: string, range?: TimeRange): ActivityItem[] {
    let query = 'SELECT * FROM activity_logs WHERE provider = ?';
    const params: any[] = [provider];
    
    if (range) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(range.start, range.end);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as ActivityLogRow[];
    return rows.map(row => this.rowToActivity(row));
  }

  /**
   * Find single activity by request_id
   */
  findByRequestId(requestId: string): ActivityItem | null {
    const stmt = db.prepare('SELECT * FROM activity_logs WHERE request_id = ? LIMIT 1');
    const row = stmt.get(requestId) as ActivityLogRow | undefined;
    return row ? this.rowToActivity(row) : null;
  }

  /**
   * Insert or update activity (upsert by request_id + timestamp)
   */
  upsert(activity: Partial<ActivityItem>): void {
    const stmt = db.prepare(`
      INSERT INTO activity_logs (
        request_id, timestamp, model, provider, user_label,
        prompt_tokens, completion_tokens, total_tokens, cost_usd, meta, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(request_id, timestamp) DO UPDATE SET
        model = excluded.model,
        provider = excluded.provider,
        user_label = excluded.user_label,
        prompt_tokens = excluded.prompt_tokens,
        completion_tokens = excluded.completion_tokens,
        total_tokens = excluded.total_tokens,
        cost_usd = excluded.cost_usd,
        meta = excluded.meta,
        updated_at = datetime('now')
    `);
    
    stmt.run(
      activity.request_id,
      activity.timestamp,
      activity.model,
      activity.provider || 'unknown',
      activity.user_label || null,
      activity.prompt_tokens || 0,
      activity.completion_tokens || 0,
      activity.total_tokens || 0,
      activity.cost_usd || 0,
      activity.meta ? JSON.stringify(activity.meta) : null
    );
  }

  /**
   * Bulk upsert activities
   */
  bulkUpsert(activities: Partial<ActivityItem>[]): number {
    const insert = db.transaction((items: Partial<ActivityItem>[]) => {
      let count = 0;
      for (const activity of items) {
        this.upsert(activity);
        count++;
      }
      return count;
    });
    
    return insert(activities);
  }

  /**
   * Get activity count in range
   */
  count(range?: TimeRange): number {
    if (!range) {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM activity_logs');
      const result = stmt.get() as { count: number };
      return result.count;
    }
    
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM activity_logs 
      WHERE timestamp >= ? AND timestamp <= ?
    `);
    const result = stmt.get(range.start, range.end) as { count: number };
    return result.count;
  }

  /**
   * Get total cost in range
   */
  getTotalCost(range?: TimeRange): number {
    if (!range) {
      const stmt = db.prepare('SELECT SUM(cost_usd) as total FROM activity_logs');
      const result = stmt.get() as { total: number | null };
      return result.total || 0;
    }
    
    const stmt = db.prepare(`
      SELECT SUM(cost_usd) as total FROM activity_logs 
      WHERE timestamp >= ? AND timestamp <= ?
    `);
    const result = stmt.get(range.start, range.end) as { total: number | null };
    return result.total || 0;
  }

  /**
   * Save credit snapshot
   */
  saveCreditSnapshot(snapshot: CreditSnapshot): void {
    const stmt = db.prepare(`
      INSERT INTO credit_snapshots (total_credits, used_credits, remaining_credits, snapshot_date)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(
      snapshot.total_credits,
      snapshot.used_credits,
      snapshot.remaining_credits,
      snapshot.snapshot_date
    );
  }

  /**
   * Get latest credit snapshot
   */
  getLatestCreditSnapshot(): CreditSnapshot | null {
    const stmt = db.prepare(`
      SELECT * FROM credit_snapshots ORDER BY snapshot_date DESC LIMIT 1
    `);
    return stmt.get() as CreditSnapshot | null || null;
  }

  /**
   * Get credit snapshots in range
   */
  getCreditSnapshots(range: TimeRange): CreditSnapshot[] {
    const stmt = db.prepare(`
      SELECT * FROM credit_snapshots 
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date DESC
    `);
    return stmt.all(range.start, range.end) as CreditSnapshot[];
  }

  /**
   * Log sync operation
   */
  logSync(syncLog: SyncLog): void {
    const stmt = db.prepare(`
      INSERT INTO sync_logs (sync_type, range_start, range_end, records_synced, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      syncLog.sync_type,
      syncLog.range_start || null,
      syncLog.range_end || null,
      syncLog.records_synced,
      syncLog.status,
      syncLog.error_message || null
    );
  }

  /**
   * Get recent sync logs
   */
  getRecentSyncLogs(limit: number = 10): SyncLog[] {
    const stmt = db.prepare(`
      SELECT * FROM sync_logsORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(limit) as SyncLog[];
  }

  /**
   * Delete activities in range (use with caution)
   */
  deleteInRange(range: TimeRange): number {
    const stmt = db.prepare(`
      DELETE FROM activity_logs WHERE timestamp >= ? AND timestamp <= ?
    `);
    const result = stmt.run(range.start, range.end);
    return result.changes;
  }

  /**
   * Get distinct models
   */
  getDistinctModels(): string[] {
    const stmt = db.prepare('SELECT DISTINCT model FROM activity_logs ORDER BY model');
    const rows = stmt.all() as { model: string }[];
    return rows.map(r => r.model);
  }

  /**
   * Get distinct providers
   */
  getDistinctProviders(): string[] {
    const stmt = db.prepare('SELECT DISTINCT provider FROM activity_logs ORDER BY provider');
    const rows = stmt.all() as { provider: string }[];
    return rows.map(r => r.provider);
  }

  /**
   * Get date range of stored data
   */
  getDataRange(): { earliest: string; latest: string } | null {
    const stmt = db.prepare(`
      SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM activity_logs
    `);
    const result = stmt.get() as { earliest: string | null; latest: string | null };
    
    if (!result.earliest || !result.latest) return null;
    
    return {
      earliest: result.earliest,
      latest: result.latest,
    };
  }
}

// Singleton instance
export const activityRepository = new ActivityRepository();
