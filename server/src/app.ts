import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import openrouterRoutes from './routes/openrouter.js';
import dashboardRoutes from './routes/dashboard.js';
import exchangeRateRoutes from './routes/exchangeRate.js';
import syncRoutes from './routes/sync.js';
import { getDb } from './database/index.js';
import { getCacheStats, clearCache } from './services/cache.js';
import { initializePostgres, isPostgresConfigured, closePool } from './database/postgres.js';
import { activityRepository } from './repositories/ActivityRepository.js';

const app: Application = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

let isAppReady = false;

async function initApp(): Promise<void> {
  console.log('[App] Starting initialization...');
  console.log('[App] PostgreSQL configured:', isPostgresConfigured());

  try {
    if (isPostgresConfigured()) {
      console.log('[App] Initializing PostgreSQL...');
      await initializePostgres();
      console.log('[App] PostgreSQL initialized successfully');
    } else {
      console.log('[App] Initializing SQLite...');
      const db = await getDb();
      console.log('[App] SQLite initialized successfully');
    }

    const count = await activityRepository.count();
    console.log(`[App] Database has ${count} records`);

    if (count === 0) {
      console.log('[App] No data found. Run POST /api/openrouter/sync to fetch data from OpenRouter');
    }

    isAppReady = true;
    console.log('[App] Application ready');
  } catch (error: any) {
    console.error('[App] Database initialization failed:', error.message);
    console.error('[App] Stack:', error.stack);
    isAppReady = true;
  }
}

initApp();

process.on('SIGINT', async () => {
  console.log('[App] Shutting down...');
  await closePool();
  process.exit(0);
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: isAppReady ? 'ok' : 'initializing',
    timestamp: new Date().toISOString(),
    openrouter: !!process.env.OPENROUTER_API_KEY,
    ready: isAppReady,
    database: isPostgresConfigured() ? 'postgresql' : 'sqlite',
  });
});

app.get('/api/cache/stats', (req: Request, res: Response) => {
  res.json(getCacheStats());
});

app.post('/api/cache/clear', (req: Request, res: Response) => {
  clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

app.use('/api/openrouter', openrouterRoutes);
app.use('/api/openrouter', syncRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/exchange-rate', exchangeRateRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

export default app;