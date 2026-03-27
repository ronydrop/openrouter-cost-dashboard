import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import openrouterRoutes from './routes/openrouter';
import dashboardRoutes from './routes/dashboard';
import exchangeRateRoutes from './routes/exchangeRate';
import syncRoutes from './routes/sync';
import { initializeDatabase, getDb } from './database';
import { getCacheStats, clearCache } from './services/cache';
import { activityIngestionService } from './services/ActivityIngestionService';

const app: Application = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Initialize database and auto-sync data if empty
async function initApp() {
  try {
    const db = await getDb();
    console.log('[App] Database initialized');

    // Check if database has data; if not, auto-sync to populate dashboard
    const result = db.exec('SELECT COUNT(*) FROM activity_logs');
    const count = result.length ? (result[0].values[0][0] as number) : 0;

    if (count === 0) {
      console.log('[App] No data found, running initial sync...');
      activityIngestionService.syncFromOpenRouter('last30days').then((syncResult) => {
        console.log(`[App] Initial sync completed: ${syncResult.recordsSynced} records`);
      }).catch((err: Error) => {
        console.error('[App] Initial sync failed:', err.message);
      });
    } else {
      console.log(`[App] Database has ${count} records`);
    }
  } catch (error: any) {
    console.error('[App] Database initialization failed:', error.message);
  }
}

initApp();

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openrouter: !!process.env.OPENROUTER_API_KEY,
  });
});

// Cache management endpoints
app.get('/api/cache/stats', (req: Request, res: Response) => {
  res.json(getCacheStats());
});

app.post('/api/cache/clear', (req: Request, res: Response) => {
  clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

// Routes
app.use('/api/openrouter', openrouterRoutes);
app.use('/api/openrouter', syncRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/exchange-rate', exchangeRateRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

export default app;
