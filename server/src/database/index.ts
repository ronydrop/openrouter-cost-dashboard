import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file location
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/openrouter.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database instance
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Initialize schema
export function initializeDatabase(): void {
  // Create tables
  db.exec(`
    -- Main activity logs table with upsert support
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT DEFAULT 'unknown',
      user_label TEXT,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      meta TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(request_id, timestamp)
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_activity_model ON activity_logs(model);
    CREATE INDEX IF NOT EXISTS idx_activity_provider ON activity_logs(provider);
    CREATE INDEX IF NOT EXISTS idx_activity_request_id ON activity_logs(request_id);

    -- Credits snapshot table
    CREATE TABLE IF NOT EXISTS credit_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_credits REAL NOT NULL,
      used_credits REAL NOT NULL,
      remaining_credits REAL NOT NULL,
      snapshot_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_credits_date ON credit_snapshots(snapshot_date);

    -- Sync log table
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      range_start TEXT,
      range_end TEXT,
      records_synced INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_logs(status);
    CREATE INDEX IF NOT EXISTS idx_sync_date ON sync_logs(created_at);
  `);

  console.log('[DB] Database initialized successfully');
}

export default db;
