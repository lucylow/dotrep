# DOTREP Hackathon Submission

## Quick Start (Local Demo)

### Prerequisites

- Docker and Docker Compose installed
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd dotrep
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed (optional for demo)
   ```

3. **Start all services**
   ```bash
   cd deploy
   docker-compose up --build -d
   ```

4. **Wait for services to be healthy**
   ```bash
   docker-compose logs -f
   # Wait until all services show "healthy" status
   ```

5. **Publish sample assets**
   ```bash
   docker exec -it dotrep_ingest_1 python publish_sample_asset.py \
     --creator-id creator123 \
     --reputation-score 0.873 \
     --simulate
   ```
   Note the `SIMULATED_UAL` printed and check `MANUS_BUILD_LOG.md`.

6. **Compute reputation**
   ```bash
   docker exec -it dotrep_reputation_1 python compute_reputation.py \
     --input /data/sample_graph.json \
     --publish \
     --alpha 0.25 \
     --simulate
   ```

7. **Access the UI**
   - Open http://localhost:3000
   - View leaderboard, toggle Sybil filter
   - Explore graph visualization

8. **Test x402 flow**
   - In UI, navigate to marketplace
   - Attempt to access `/trusted-feed/creator123`
   - Follow payment prompt
   - On success, inspect published ReceiptAsset

9. **Verify assets**
   ```bash
   # Get UAL from MANUS_BUILD_LOG.md
   python scripts/verify_asset.py <ual> --edge-url http://localhost:8085
   ```

## Architecture Overview

```
┌────────────┐   ingest   ┌──────────────┐   publish   ┌─────────────┐
│ Data files │ ─────────> │ Ingest/Proxy  │ ─────────> │ Edge Node / │
│ (CSV/JSON) │            │ (publisher)   │            │ Mock DKG    │
└────────────┘            └──────────────┘            └─────────────┘
       │                         ▲                         ▲
       │                         │                         │
       │                compute / publish                  │
       │                         │                         │
       ▼                         │                         │
┌────────────┐     ┌─────────────────────────┐     ┌─────────────┐
│  UI / CLI  │ <-> │ MCP Server (Agent tools)│ <-> │ Reputation  │
│  React App │     │  - dkg_sparql           │     │ Engine (Py) │
└────────────┘     │  - get_reputation       │     └─────────────┘
                   │  - publish_note         │           │
                   │  - call_x402            │           │
                   └─────────────────────────┘           │
                            ▲                            │
                            │                            ▼
                        x402 Gateway  <---------------- Receipt publishing
                        (simulated)        (ReceiptAsset JSON-LD)
```

## Key Features Demonstrated

1. ✅ **Knowledge Asset Publishing**: JSON-LD assets with contentHash and DID signatures
2. ✅ **Reputation Computation**: Weighted PageRank with Sybil detection
3. ✅ **MCP Server**: AI agent tools for verifiable reputation queries
4. ✅ **x402 Micropayments**: HTTP 402 flow with ReceiptAsset publishing
5. ✅ **Verification**: CLI tools to verify asset integrity
6. ✅ **Mock DKG**: Offline demo capability without real Edge Node

## MCP Tools

The MCP server exposes the following tools for AI agents:

- `get_developer_reputation(developerId)` - Get reputation score
- `verify_contribution(contributionId)` - Verify contribution authenticity
- `search_developers_by_reputation(minScore, maxScore)` - Search by reputation range
- `get_reputation_proof(developerId)` - Get blockchain proof
- `compare_developers(developerIds[])` - Compare multiple developers
- `get_dkg_health()` - Check DKG connection status

## x402 Payment Flow

1. Client requests: `GET /trusted-feed/:resource`
2. Server responds: `HTTP 402 Payment Required` with `X-Payment-Request` header
3. Client provides: `X-Payment-Proof` header with transaction proof
4. Server validates and publishes `ReceiptAsset` to DKG
5. Server returns content + ReceiptAsset UAL

## Verification

All assets can be verified using:

```bash
python scripts/verify_asset.py <ual> --edge-url http://localhost:8085
```

Verification checks:
- Content hash integrity
- DID signature validity
- On-chain anchor (if applicable)

## Metrics

See `metrics.md` for detailed metrics and thresholds.

## Ethics & Governance

See `ethics.md` for governance policies and opt-out procedures.

## Demo Video

[Link to demo video - to be added]

## Contact

For questions or issues, please open an issue on GitHub.

