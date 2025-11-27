/**
 * Configuration loader with environment variable support
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  simulate: process.env.SIMULATE === 'true' || !process.env.EDGE_NODE_URL,

  // DKG
  edgeNodeUrl: process.env.EDGE_NODE_URL || 'http://localhost:8900',
  neurowebRpc: process.env.NEUROWEB_RPC || 'http://localhost:9944',

  // Escrow
  escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS || '',
  
  // Payment
  recipientAddress: process.env.RECIPIENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  facilitatorKey: process.env.FACILITATOR_KEY || '',
  privateKey: process.env.PRIVATE_KEY || '',

  // Blockchain
  ethRpcUrl: process.env.ETH_RPC_URL || 'http://localhost:8545',
  onChainMode: process.env.SIMULATE !== 'true' && !!process.env.ETH_RPC_URL,

  // Reputation
  reputationCacheTtl: parseInt(process.env.REPUTATION_CACHE_TTL || '3600', 10),
  sybilDetectionEnabled: process.env.SYBIL_DETECTION_ENABLED !== 'false',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Analytics
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  metricsDbPath: process.env.METRICS_DB_PATH || './data/metrics.db',
};

// Validation
if (!config.simulate && !config.edgeNodeUrl) {
  console.warn('⚠️  EDGE_NODE_URL not set, running in SIMULATE mode');
}

if (config.onChainMode && !config.privateKey) {
  console.warn('⚠️  PRIVATE_KEY not set, payment facilitator will use simulate mode');
}

export default config;

