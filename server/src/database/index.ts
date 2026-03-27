import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/openrouter.db');

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
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
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
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_model ON activity_logs(model)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_provider ON activity_logs(provider)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_request_id ON activity_logs(request_id)`);

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

  saveDatabase();
  console.log('[DB] Database initialized successfully');
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
