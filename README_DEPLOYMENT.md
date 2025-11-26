# DOTREP Deployment Guide

## Monorepo Structure

```
dotrep/
├── apps/
│   ├── mcp-server/          # MCP server for AI agents
│   └── x402/                # x402 micropayment gateway
├── services/
│   ├── ingest/              # Python publisher service
│   ├── reputation/          # Python reputation engine
│   └── mock-dkg/            # Mock DKG Edge Node
├── deploy/
│   └── docker-compose.yml   # Main deployment file
├── templates/               # JSON-LD templates
├── scripts/                 # Verification and utility scripts
├── data/                     # Sample data files
└── dotrep-v2/              # Existing React UI and backend
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 20+ (for local development)

### One-Command Deployment

```bash
cd deploy
docker-compose up --build
```

This starts all services:
- Mock DKG on port 8085
- MCP Server on port 3001
- x402 Gateway on port 4001
- UI on port 3000
- Ingest and Reputation services (run on demand)

### Verify Services

```bash
# Check service health
curl http://localhost:8085/health  # Mock DKG
curl http://localhost:4001/health  # x402 Gateway
curl http://localhost:3001/health  # MCP Server (if HTTP endpoint exists)
```

## Manual Service Setup

### 1. Mock DKG

```bash
cd services/mock-dkg
npm install
npm start
```

### 2. Ingest Service

```bash
cd services/ingest
pip install -r requirements.txt
python publish_sample_asset.py --creator-id creator123 --simulate
```

### 3. Reputation Engine

```bash
cd services/reputation
pip install -r requirements.txt
python compute_reputation.py --input ../../data/sample_graph.json --publish --simulate
```

### 4. MCP Server

```bash
cd dotrep-v2/mcp-server
npm install
npm run build
npm start
```

### 5. x402 Gateway

```bash
cd apps/x402
npm install
npm start
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `EDGE_PUBLISH_URL`: DKG Edge Node URL (default: http://mock-dkg:8080)
- `DKG_USE_MOCK`: Use mock mode (default: true)
- `POLKADOT_WS_ENDPOINT`: Polkadot node endpoint

## Publishing Assets

### Publish ReputationAsset

```bash
docker exec -it dotrep_ingest_1 python publish_sample_asset.py \
  --creator-id creator123 \
  --reputation-score 0.873 \
  --simulate
```

### Compute and Publish Reputation

```bash
docker exec -it dotrep_reputation_1 python compute_reputation.py \
  --input /data/sample_graph.json \
  --publish \
  --alpha 0.25 \
  --simulate
```

## Verification

### Verify Asset

```bash
python scripts/verify_asset.py <ual> --edge-url http://localhost:8085
```

### Verify Receipt

```bash
python scripts/verify_receipt.py <receipt_path> --edge-url http://localhost:8085
```

### Verify All Assets

```bash
make verify
```

## Testing

### Run Sybil Detection Test

```bash
cd services/reputation
python compute_reputation.py --test
```

### Run Unit Tests

```bash
cd services/reputation
python tests/test_sybil.py
```

## Monitoring

### View Logs

```bash
docker-compose -f deploy/docker-compose.yml logs -f
```

### Service-Specific Logs

```bash
docker-compose -f deploy/docker-compose.yml logs -f mock-dkg
docker-compose -f deploy/docker-compose.yml logs -f x402
```

## Troubleshooting

### Services Not Starting

1. Check Docker is running: `docker ps`
2. Check ports are available: `netstat -an | grep -E '3000|3001|4001|8085'`
3. Check logs: `docker-compose logs`

### Asset Verification Fails

1. Ensure mock-dkg is running: `curl http://localhost:8085/health`
2. Check asset exists: `curl http://localhost:8085/assets`
3. Verify asset format: `python scripts/verify_asset.py <asset_path>`

### MCP Server Not Responding

1. Check MCP server logs: `docker-compose logs mcp-server`
2. Verify DKG connection: Check `EDGE_PUBLISH_URL` in environment
3. Test with mock mode: Set `DKG_USE_MOCK=true`

## Production Deployment

### Kubernetes

See `deploy/k8s/` for Kubernetes manifests (to be added).

### Helm Chart

See `helm/` directory for Helm chart (existing in dotrep-v2/helm).

## CI/CD

GitHub Actions workflow is configured in `.github/workflows/ci.yml`.

It runs:
- Linting and unit tests
- Docker image builds
- Integration tests
- Asset verification

## Next Steps

1. **Generate DID Keys**: Run `bash scripts/gen_did_key.sh` to generate signing keys
2. **Publish Assets**: Use ingest service to publish sample assets
3. **Compute Reputation**: Run reputation engine on your data
4. **Test x402 Flow**: Access premium resources via UI
5. **Verify Everything**: Run `make verify` to check all assets

For more details, see:
- `submission.md` - Hackathon submission guide
- `ethics.md` - Ethics and governance
- `metrics.md` - Performance metrics
- `demo_video_script.md` - Demo video script

