import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data/openrouter.db');

let db: SqlJsDatabase | null = null;
let dbInitPromise: Promise<SqlJsDatabase> | null = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (!dbInitPromise) {
    dbInitPromise = initDatabase();
  }
  return dbInitPromise;
}

async function initDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();
  
  const dbDir = path.dirname(DB_PATH);
  console.log(`[DB] Database directory: ${dbDir}`);
  if (!fs.existsSync(dbDir)) {
    console.log(`[DB] Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[DB] Database path: ${DB_PATH}`);
  if (fs.existsSync(DB_PATH)) {
    console.log('[DB] Loading existing database');
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    console.log('[DB] Creating new database');
    db = new SQL.Database();
  }

  // Main activity logs table - expanded schema
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generation_id TEXT,
      session_id TEXT,
      task_id TEXT,
      user_id TEXT,
      request_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      provider_name TEXT DEFAULT 'unknown',
      api_type TEXT DEFAULT 'openai',
      api_key_name TEXT,
      api_key_hash TEXT,
      cost REAL DEFAULT 0,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      reasoning_tokens INTEGER DEFAULT 0,
      cached_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      response_time_ms INTEGER,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      endpoint TEXT DEFAULT '/chat/completions',
      environment TEXT DEFAULT 'production',
      feature_name TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(request_id, timestamp)
    )
  `);

  // Indexes for common queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON activity_logs(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_model ON activity_logs(model)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_provider ON activity_logs(provider_name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_api_key ON activity_logs(api_key_name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_session ON activity_logs(session_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_task ON activity_logs(task_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user ON activity_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cost ON activity_logs(cost)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_hour ON activity_logs(timestamp)`);

  // Credit snapshots table
  db.run(`
    CREATE TABLE IF NOT EXISTS credit_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_credits REAL NOT NULL,
      used_credits REAL NOT NULL,
      remaining_credits REAL NOT NULL,
      snapshot_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_credits_date ON credit_snapshots(snapshot_date)`);

  // API Keys table (from /keys endpoint)
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT NOT NULL,
      key_hash TEXT UNIQUE,
      total_cost REAL DEFAULT 0,
      total_requests INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Sync logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      range_start TEXT,
      range_end TEXT,
      records_synced INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_logs(status)`);

  saveDatabase();
  console.log('[DB] Database initialized with expanded schema');
  return db;
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function initializeDatabase(): void {
  getDb();
}
