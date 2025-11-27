/**
 * Express Server Entry Point
 * DotRep Monetization API Server
 */

import express from 'express';
import cors from 'cors';
import config from '../utils/config.js';
import paymentRoutes from './routes/payments.js';
import reputationRoutes from './routes/reputation.js';
import marketplaceRoutes from './routes/marketplace.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: config.simulate ? 'simulate' : 'production',
  });
});

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Admin metrics endpoint
app.get('/admin/metrics', async (req, res) => {
  // TODO: Implement metrics collection
  res.json({
    paymentsReceived: 0,
    receiptsPublished: 0,
    queriesByApiKey: {},
    reputationComputeJobs: 0,
    sybilAlerts: 0,
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'An error occurred',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   DotRep Monetization API Server                          ║
║   Port: ${PORT}                                            ║
║   Mode: ${config.simulate ? 'SIMULATE' : 'PRODUCTION'}                      ║
║   DKG: ${config.edgeNodeUrl}                               ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  if (config.simulate) {
    console.log('⚠️  Running in SIMULATE mode - payments and DKG publishing are simulated');
  }
});

export default app;

