# Polkadot Cloud Integration POC Setup

This guide explains how to set up and run the Polkadot Cloud integration proof-of-concept.

## Overview

The POC includes:
1. **Batch Anchor Script** - Reads proofs from disk, batches them, pins to IPFS, and optionally submits on-chain
2. **Polkadot API Client** - Minimal client for submitting proofs to a Substrate chain
3. **Enhanced Worker** - Optionally persists proofs to disk for batch processing
4. **Docker Setup** - Complete local stack with Redis, IPFS, API, and Worker

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm (or npm/yarn)

## Quick Start

### 1. Install Dependencies

```bash
cd dotrep-v2
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in `dotrep-v2/`:

```bash
# Server
PORT=4000
NODE_ENV=development

# Redis (for Docker Compose, use service name)
REDIS_URL=redis://redis:6379

# IPFS (for Docker Compose, use service name)
IPFS_API_URL=http://ipfs:5001

# Proof Persistence (optional - set to "true" to enable disk persistence)
PERSIST_PROOFS_TO_DISK=true
PROOFS_DIR=./data/proofs

# Anchor Service (optional)
ANCHOR_SERVICE_URL=http://localhost:4000/api/anchor
ANCHOR_SERVICE_API_KEY=demo-key

# Polkadot Chain (optional - for on-chain submission)
POLKADOT_WS=ws://127.0.0.1:9944
SERVICE_SEED=//Alice  # DEMO ONLY - Use KMS in production
REPUTATION_PALLET_NAME=reputation
REPUTATION_SUBMIT_METHOD=submitProof

# Database (if using)
DATABASE_URL=mysql://user:password@localhost:3306/dotrep
```

### 3. Start Services with Docker Compose

```bash
# Start Redis, IPFS, API, and Worker
docker-compose -f docker-compose.poc.yml up --build
```

This will start:
- **Redis** on port 6379
- **IPFS** on ports 4001 (swarm), 5001 (API), 8080 (gateway)
- **API Server** on port 4000
- **Worker** (processes GitHub events and optionally persists proofs)

### 4. Run Batch Anchor POC

Once you have proof files in `data/proofs/`, run:

```bash
# From host (if IPFS_API_URL points to Docker IPFS)
npm run batch:anchor:poc

# Or from inside the container
docker exec -it dotrep_api npm run batch:anchor:poc
```

### 5. Test Polkadot Submission (Optional)

If you have a local Substrate node running:

```bash
npm run polkadot:demo
```

## Manual Setup (Without Docker)

### 1. Start IPFS Locally

```bash
# Install IPFS (if not already installed)
# macOS: brew install ipfs
# Linux: see https://docs.ipfs.io/install/command-line/

# Initialize and start IPFS
ipfs init
ipfs daemon
```

### 2. Start Redis Locally

```bash
# macOS: brew install redis && brew services start redis
# Linux: sudo apt-get install redis-server && sudo systemctl start redis
```

### 3. Update .env

```bash
REDIS_URL=redis://127.0.0.1:6379
IPFS_API_URL=http://127.0.0.1:5001
PROOFS_DIR=./data/proofs
```

### 4. Start Services

```bash
# Terminal 1: Start API
npm run dev

# Terminal 2: Start Worker
npm run dev:worker

# Terminal 3: Run batch anchor when ready
npm run batch:anchor:poc
```

## Creating Sample Proof Files

To test the batch anchor script, create sample proof files:

```bash
mkdir -p data/proofs

# Create a sample proof
cat > data/proofs/sample1.json <<EOF
{
  "event_id": "demo-1",
  "provider": "github",
  "event_type": "pull_request",
  "provider_user": {
    "login": "testuser"
  },
  "repo": "org/repo",
  "metadata": {
    "repo": "org/repo",
    "pr": 123,
    "title": "Fix bug"
  },
  "timestamp": "2025-01-14T00:00:00Z",
  "proof_hash": "abc123"
}
EOF
```

## Workflow

1. **Worker processes events** → Creates proofs → Optionally persists to `data/proofs/*.json`
2. **Batch anchor script** → Reads all `data/proofs/*.json` → Batches them → Pins to IPFS → Optionally submits on-chain
3. **Processed proofs** → Moved to `data/proofs/archived/`

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `IPFS_API_URL` | IPFS API endpoint | `http://127.0.0.1:5001` |
| `PROOFS_DIR` | Directory for proof files | `./data/proofs` |
| `PERSIST_PROOFS_TO_DISK` | Enable disk persistence in worker | `false` |
| `ANCHOR_SERVICE_URL` | HTTP endpoint for anchor service | (optional) |
| `ANCHOR_SERVICE_API_KEY` | API key for anchor service | (optional) |
| `POLKADOT_WS` | WebSocket endpoint for Substrate node | (optional) |
| `SERVICE_SEED` | Seed phrase for signing (DEMO ONLY) | (optional) |
| `REPUTATION_PALLET_NAME` | Name of reputation pallet | `reputation` |
| `REPUTATION_SUBMIT_METHOD` | Method name for submitting proof | `submitProof` |

## Troubleshooting

### IPFS Connection Failed

- Ensure IPFS daemon is running: `ipfs daemon`
- Check IPFS_API_URL is correct
- For Docker, use `http://ipfs:5001` (service name)

### No Proofs Found

- Check `PROOFS_DIR` path is correct
- Ensure proof files have `.json` extension
- Verify worker is persisting proofs (if `PERSIST_PROOFS_TO_DISK=true`)

### Polkadot Connection Failed

- Ensure Substrate node is running
- Check `POLKADOT_WS` endpoint is correct
- Verify `SERVICE_SEED` is set (for demo/testing)

### Worker Not Persisting Proofs

- Set `PERSIST_PROOFS_TO_DISK=true` in `.env`
- Check `PROOFS_DIR` is writable
- Verify worker has access to the directory

## Production Considerations

⚠️ **IMPORTANT**: This is a POC. For production:

1. **Never use SERVICE_SEED in production** - Use KMS/HSM for key management
2. **Replace file-based storage** - Use database (Postgres) for proof storage
3. **Add proper error handling** - Implement retry logic, backoff, and monitoring
4. **Secure secrets** - Use secret management (AWS Secrets Manager, HashiCorp Vault)
5. **Add authentication** - Secure anchor service endpoints
6. **Implement queue semantics** - Use proper job queues with durability
7. **Add monitoring** - Prometheus metrics, Grafana dashboards, alerting

## Next Steps

1. Contact Polkadot Cloud for production API credentials
2. Set up KMS/HSM for secure key management
3. Migrate from file-based to database storage
4. Implement proper error handling and retry logic
5. Add comprehensive monitoring and alerting

## Resources

- [Polkadot Cloud](https://polkadot.cloud/)
- [Polkadot Developer Docs](https://docs.polkadot.com/)
- [IPFS Documentation](https://docs.ipfs.io/)

