import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let pool: Pool | null = null;
const postgresRequested = !!(process.env.DATABASE_URL || (process.env.PG_HOST && process.env.PG_DATABASE));
let postgresReady = false;

export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function getConfig(): PostgresConfig {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  }

  return {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    database: process.env.PG_DATABASE || 'openrouter_dashboard',
  };
}

export function getPool(): Pool {
  if (!postgresRequested) {
    throw new Error('PostgreSQL is not configured');
  }

  if (!pool) {
    const config = getConfig();
    console.log(`[PG] Connecting to PostgreSQL at ${config.host}:${config.port}/${config.database}`);
    
    pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[PG] Unexpected error on idle client:', err);
    });

    pool.on('connect', () => {
      console.log('[PG] New client connected');
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`[PG] Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }
    return result;
  } catch (error) {
    console.error('[PG] Query error:', error);
    console.error('[PG] Query:', text);
    console.error('[PG] Params:', params);
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializePostgres(): Promise<void> {
  if (!postgresRequested) {
    postgresReady = false;
    return;
  }

  const pool = getPool();
  
  try {
    console.log('[PG] Testing connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('[PG] Connected! Server time:', result.rows[0].now);
    client.release();

    console.log('[PG] Running migrations...');
    await runMigrations(pool);
    console.log('[PG] Migrations complete');
    postgresReady = true;
  } catch (error: any) {
    postgresReady = false;
    await closePool();
    console.error('[PG] Failed to initialize:', error.message);
    throw error;
  }
}

async function runMigrations(pool: Pool): Promise<void> {
  const migrationsDir = path.join(process.cwd(), 'src/database/migrations');
  const migrationFiles = [
    '001_initial_schema.sql',
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`[PG] Running migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await pool.query(sql);
        console.log(`[PG] Migration ${file} completed`);
      } catch (error: any) {
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`[PG] Migration ${file} skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[PG] Pool closed');
  }
}

export function isPostgresConfigured(): boolean {
  return postgresRequested && postgresReady;
}

export function hasPostgresConfig(): boolean {
  return postgresRequested;
}

export default {
  getPool,
  query,
  getClient,
  transaction,
  initializePostgres,
  closePool,
  isPostgresConfigured,
  hasPostgresConfig,
};
