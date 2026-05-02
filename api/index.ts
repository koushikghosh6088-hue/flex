import express from 'express';

const app = express();
app.use(express.json());

// Absolute minimal health check inside the API folder
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API entry point is working',
    timestamp: new Date().toISOString()
  });
});

// Mock for other routes
app.all('/api/*', (req, res) => {
  res.json({ message: 'Catch-all API reached', path: req.path });
});

export default app;
