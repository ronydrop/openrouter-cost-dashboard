import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import openrouterRoutes from './routes/openrouter';
import dashboardRoutes from './routes/dashboard';
import exchangeRateRoutes from './routes/exchangeRate';
import syncRoutes from './routes/sync';
import { initializeDatabase } from './database';
import { getCacheStats, clearCache } from './services/cache';

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

// Initialize database
try {
  initializeDatabase();
  console.log('[App] Database initialized');
} catch (error: any) {
  console.error('[App] Database initialization failed:', error.message);
}

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
