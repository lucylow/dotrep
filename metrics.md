# Metrics & Performance

## System Metrics

### Reputation Engine

- **Computation time**: Target < 5 seconds for 1000 nodes
- **Sybil detection precision**: Target ≥ 80%
- **Sybil detection recall**: Target ≥ 70%
- **Memory usage**: Target < 2GB for 10,000 nodes

### MCP Server

- **Tool call latency**: Target < 500ms (p95)
- **Concurrent requests**: Target 100+ concurrent tool calls
- **Error rate**: Target < 1%

### x402 Gateway

- **Payment request latency**: Target < 100ms
- **Receipt publishing latency**: Target < 2 seconds
- **Success rate**: Target ≥ 99%

### DKG Integration

- **Publish latency**: Target < 5 seconds
- **SPARQL query latency**: Target < 1 second
- **Availability**: Target ≥ 99.9%

## Business Metrics

### Knowledge Assets

- **Assets published**: Track total ReputationAssets, ReceiptAssets, CommunityNotes
- **Verification rate**: Percentage of assets with valid signatures
- **Anchor rate**: Percentage of assets anchored on-chain

### Reputation System

- **Active creators**: Number of creators with reputation scores
- **Average reputation**: Mean reputation score across all creators
- **Sybil detection rate**: Percentage of accounts flagged as Sybil

### x402 Payments

- **Total payments**: Count of successful x402 payments
- **Total revenue**: Sum of all micropayments (in test tokens)
- **Receipt publication rate**: Percentage of payments with published ReceiptAssets

## Monitoring

### Prometheus Metrics

The system exposes Prometheus metrics at `/metrics` endpoints:

- `dotrep_reputation_computation_duration_seconds`
- `dotrep_reputation_nodes_processed_total`
- `dotrep_sybil_flags_total`
- `dotrep_mcp_tool_calls_total`
- `dotrep_mcp_tool_latency_seconds`
- `dotrep_x402_payments_total`
- `dotrep_x402_receipts_published_total`

### Grafana Dashboard

A pre-built Grafana dashboard is available at `deploy/grafana/dashboard.json`.

## Target Thresholds for Demo

For hackathon submission, the following thresholds should be met:

- ✅ At least 1 ReputationAsset published
- ✅ At least 1 ReceiptAsset published
- ✅ Sybil detection precision ≥ 50% (synthetic test)
- ✅ All published assets have valid contentHash
- ✅ All published assets have valid signatures
- ✅ x402 flow completes successfully
- ✅ MCP server responds to tool calls

## Performance Benchmarks

### Synthetic Tests

Run `python services/reputation/compute_reputation.py --test` to run synthetic Sybil tests.

Expected output:
```
Sybil detection precision: 0.XX (X/20)
```

### Load Tests

```bash
# Test MCP server
ab -n 1000 -c 10 http://localhost:3001/tool/get_reputation

# Test x402 gateway
ab -n 100 -c 5 http://localhost:4001/trusted-feed/creator123
```

## Logging

All services log to stdout in JSON format for easy parsing and aggregation.

Key log fields:
- `timestamp`: ISO 8601 timestamp
- `level`: log level (info, warn, error)
- `service`: service name
- `message`: log message
- `metadata`: additional context

