import express from 'express';
import compression from 'compression';

export const app = express();
app.use(compression());
app.use(express.json());

// Ultra-minimal health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Minimal server is running',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL
    }
  });
});

// Mock routes to prevent frontend 404s during test
app.post('/api/inventory/raw-materials', (req, res) => {
  res.status(501).json({ error: 'Server is in diagnostic mode' });
});

// Basic catch-all for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found in diagnostic mode' });
});
