# Polkadot Cloud Integration - Implementation Summary

This document summarizes the Polkadot Cloud integration improvements made to the DotRep project.

## ✅ Implemented Features

### 1. Batch Anchor POC Script (`scripts/batch_anchor_poc.ts`)

A proof-of-concept script that:
- Reads proof JSON files from `data/proofs/*.json`
- Batches them into a single payload
- Pins the batch to IPFS (configurable endpoint, supports Polkadot Cloud DA)
- Optionally POSTs to an anchor HTTP service
- Optionally submits on-chain via Polkadot API client
- Archives processed proofs to `data/proofs/archived/`

**Usage:**
```bash
npm run batch:anchor:poc
```

### 2. Polkadot API Client (`server/polkadot/polkadot_api_client.ts`)

A minimal client for submitting proofs on-chain:
- Connects to Substrate node via WebSocket
- Signs transactions using service seed (demo only)
- Supports configurable pallet and method names
- Handles connection management and errors

**Key Functions:**
- `submitProof(proofHashHex, metadata)` - Submit proof hash on-chain
- `disconnect()` - Clean disconnect

**Usage:**
```typescript
import { submitProof } from "./server/polkadot/polkadot_api_client";

const txHash = await submitProof(proofHash, { cid, batchId });
```

### 3. Enhanced GitHub Ingest Worker (`server/workers/githubIngestWorker.ts`)

Updated worker with optional disk persistence:
- Processes GitHub events from queue
- Verifies and builds proof payloads
- Optionally persists proofs to disk (`data/proofs/*.json`) when `PERSIST_PROOFS_TO_DISK=true`
- Queues proofs for batch processing

**Configuration:**
- `PERSIST_PROOFS_TO_DISK=true` - Enable disk persistence
- `PROOFS_DIR=./data/proofs` - Directory for proof files

### 4. Docker Compose POC Setup (`docker-compose.poc.yml`)

Complete local development stack:
- **Redis** - Queue management
- **IPFS** - Decentralized storage (go-ipfs)
- **API Server** - Main application
- **Worker** - Event processing

**Usage:**
```bash
docker-compose -f docker-compose.poc.yml up --build
```

### 5. Demo Script (`server/polkadot/polkadot_api_client_demo.ts`)

Standalone demo for testing Polkadot submission:
- Submits a demo proof hash
- Useful for testing chain connectivity

**Usage:**
```bash
npm run polkadot:demo
```

## 📁 File Structure

```
dotrep-v2/
├── scripts/
│   └── batch_anchor_poc.ts          # Batch anchor POC script
├── server/
│   ├── polkadot/
│   │   ├── polkadot_api_client.ts   # Polkadot API client
│   │   └── polkadot_api_client_demo.ts  # Demo script
│   └── workers/
│       └── githubIngestWorker.ts     # Enhanced worker (with disk persistence)
├── docker-compose.poc.yml            # POC Docker setup
├── POC_SETUP.md                      # Setup guide
└── POLKADOT_CLOUD_INTEGRATION.md      # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IPFS_API_URL` | IPFS API endpoint | `http://127.0.0.1:5001` |
| `PROOFS_DIR` | Directory for proof files | `./data/proofs` |
| `PERSIST_PROOFS_TO_DISK` | Enable disk persistence | `false` |
| `ANCHOR_SERVICE_URL` | HTTP endpoint for anchor service | (optional) |
| `ANCHOR_SERVICE_API_KEY` | API key for anchor service | (optional) |
| `POLKADOT_WS` | WebSocket endpoint for Substrate node | (optional) |
| `SERVICE_SEED` | Seed phrase for signing (DEMO ONLY) | (optional) |
| `REPUTATION_PALLET_NAME` | Name of reputation pallet | `reputation` |
| `REPUTATION_SUBMIT_METHOD` | Method name for submitting proof | `submitProof` |

### Package.json Scripts

```json
{
  "batch:anchor:poc": "tsx scripts/batch_anchor_poc.ts",
  "batch:anchor": "tsx scripts/batch_anchor_poc.ts",
  "polkadot:demo": "tsx server/polkadot/polkadot_api_client_demo.ts"
}
```

## 🚀 Workflow

1. **Event Ingestion**
   - GitHub webhook → Worker processes event
   - Worker verifies event and builds proof
   - If `PERSIST_PROOFS_TO_DISK=true`, proof saved to `data/proofs/*.json`
   - Proof also queued for batch processing

2. **Batch Anchoring**
   - Run `npm run batch:anchor:poc`
   - Script reads all `data/proofs/*.json` files
   - Batches them into single payload
   - Pins to IPFS (returns CID)
   - Optionally POSTs to anchor service
   - Optionally submits on-chain via Polkadot API
   - Moves processed proofs to `data/proofs/archived/`

3. **On-Chain Submission** (Optional)
   - Polkadot API client connects to Substrate node
   - Signs transaction with service seed (demo only)
   - Submits proof hash and metadata
   - Returns transaction hash

## 🔒 Security Notes

⚠️ **IMPORTANT**: This is a POC. For production:

1. **Never use SERVICE_SEED in production** - Use KMS/HSM for key management
2. **Replace file-based storage** - Use database (Postgres) for proof storage
3. **Add proper error handling** - Implement retry logic, backoff, and monitoring
4. **Secure secrets** - Use secret management (AWS Secrets Manager, HashiCorp Vault)
5. **Add authentication** - Secure anchor service endpoints
6. **Implement queue semantics** - Use proper job queues with durability
7. **Add monitoring** - Prometheus metrics, Grafana dashboards, alerting

## 📚 Integration with Polkadot Cloud

### Data Availability (DA)

The batch anchor script pins payloads to IPFS, which can be:
- Local IPFS node (development)
- Polkadot Cloud DA endpoint (production) - if IPFS-compatible
- Any IPFS-compatible service

### Execution Environment

Services can be deployed to:
- Polkadot Cloud execution pods (production)
- Local Docker Compose (development)
- Kubernetes (production)

### On-Chain Anchoring

The Polkadot API client submits proof hashes to:
- Local Substrate node (development)
- Testnet (staging)
- Production parachain (production)

## 🧪 Testing

### Local Testing

1. Start IPFS: `ipfs daemon`
2. Start Redis: `redis-server`
3. Create sample proof in `data/proofs/sample.json`
4. Run: `npm run batch:anchor:poc`

### Docker Testing

1. Start services: `docker-compose -f docker-compose.poc.yml up`
2. Create sample proof in `data/proofs/sample.json`
3. Run: `docker exec -it dotrep_api npm run batch:anchor:poc`

### Chain Testing

1. Start local Substrate node: `./target/release/dotrep-node --dev`
2. Set `POLKADOT_WS=ws://127.0.0.1:9944` and `SERVICE_SEED=//Alice`
3. Run: `npm run polkadot:demo`

## 📖 Documentation

- **POC_SETUP.md** - Complete setup guide
- **This file** - Implementation summary
- **README.md** - Main project documentation

## 🔄 Next Steps

1. **Contact Polkadot Cloud** - Request API credentials and DA endpoints
2. **KMS Integration** - Replace SERVICE_SEED with KMS/HSM
3. **Database Migration** - Move from file-based to database storage
4. **Error Handling** - Add comprehensive retry/backoff logic
5. **Monitoring** - Add Prometheus metrics and Grafana dashboards
6. **Testing** - Add unit and integration tests
7. **Documentation** - Update API documentation

## 🐛 Known Limitations

1. File-based storage is not production-ready
2. SERVICE_SEED is for demo only - must use KMS in production
3. No retry logic for failed IPFS pins or chain submissions
4. Limited error handling and logging
5. No monitoring or alerting
6. No authentication on anchor service endpoints

## 📝 Changelog

### 2025-01-14
- ✅ Added batch anchor POC script
- ✅ Added Polkadot API client
- ✅ Enhanced worker with disk persistence
- ✅ Added Docker Compose POC setup
- ✅ Added demo script
- ✅ Added comprehensive documentation

