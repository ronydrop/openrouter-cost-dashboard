import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 OpenRouter Cost Dashboard - Backend Server             ║
║                                                              ║
║   Server running on: http://localhost:${PORT}                   ║
║   API endpoints available at: http://localhost:${PORT}/api      ║
║                                                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                               ║
║   OpenRouter API: ${process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Not configured'}              ║
║   Exchange Rate API: ${process.env.EXCHANGE_RATE_API_URL ? '✅ Configured' : '⚠️ Using fallback'}       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
