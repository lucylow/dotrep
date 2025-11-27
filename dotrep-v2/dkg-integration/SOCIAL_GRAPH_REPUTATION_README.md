# Social Graph Reputation System - Implementation Guide

## Overview

This implementation provides a comprehensive social graph reputation system on OriginTrail DKG following **Pattern A: Hybrid Off-Chain Compute + DKG Snapshots**.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Social Graph Reputation System             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ DKG Ingestion │───▶│  Reputation  │───▶│   Snapshot   │  │
│  │   (SPARQL)    │    │  Computation │    │  Publishing  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         OriginTrail DKG (Knowledge Assets)          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  x402 Payment│    │  MCP Agent   │    │ Experiments  │  │
│  │  Integration │    │    Tools     │    │   Framework   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

1. **DKG Data Ingestion**: Query social graph data from DKG using SPARQL
2. **Reputation Computation**: PageRank with Sybil detection
3. **Snapshot Publishing**: Publish reputation snapshots as JSON-LD Knowledge Assets
4. **x402 Payment Integration**: Premium data access via micropayments
5. **MCP Agent Tools**: AI agent integration for reputation queries
6. **Experiment Frameworks**: Sybil injection tests and performance benchmarking

## Installation

```bash
npm install
```

## Quick Start

### Basic Usage

```typescript
import { createDKGClientV8 } from './dkg-client-v8';
import { createSocialGraphReputationService } from './social-graph-reputation-service';

// Initialize DKG client
const dkgClient = createDKGClientV8({
  environment: 'testnet',
  useMockMode: false // Set to true for testing without DKG node
});

// Initialize reputation service
const reputationService = createSocialGraphReputationService(dkgClient);

// Step 1: Ingest social graph data
const graphData = await reputationService.ingestSocialGraphData({
  limit: 10000,
  useExistingData: true // Use Umanitek Guardian dataset
});

// Step 2: Compute reputation scores
const { scores, sybilRisks } = await reputationService.computeReputation(graphData, {
  enableSybilDetection: true,
  pagerankConfig: {
    dampingFactor: 0.85,
    maxIterations: 100
  }
});

// Step 3: Publish snapshot to DKG
const result = await reputationService.publishReputationSnapshot(scores, sybilRisks, {
  algorithm: 'TrustWeightedPageRank',
  algorithmVersion: '1.2',
  includeSybilAnalysis: true
});

console.log(`Published snapshot: ${result.UAL}`);
```

### Running the Demo

```typescript
import { runReputationDemo } from './reputation-demo';

// Run complete demo
const results = await runReputationDemo({
  useMockMode: false,
  enableExperiments: true
});

console.log('Demo Results:', results);
```

## API Reference

### SocialGraphReputationService

#### `ingestSocialGraphData(options?)`

Ingests social graph data from DKG using SPARQL queries.

**Options:**
- `limit` (number): Maximum number of edges to fetch (default: 10000)
- `query` (string): Custom SPARQL query (optional)
- `useExistingData` (boolean): Use existing DKG data like Umanitek Guardian (default: true)

**Returns:** `{ nodes: GraphNode[], edges: GraphEdge[] }`

#### `computeReputation(graphData, options?)`

Computes reputation scores using PageRank with optional Sybil detection.

**Options:**
- `pagerankConfig`: PageRank configuration (damping factor, iterations, etc.)
- `enableSybilDetection` (boolean): Enable Sybil detection (default: true)
- `applyStakeWeighting` (boolean): Apply stake-based edge weighting (default: false)
- `stakeWeights` (Map): Map of user DIDs to stake amounts

**Returns:** `{ scores: Map<string, number>, sybilRisks: Map<string, number>, hybridScores?: Map }`

#### `publishReputationSnapshot(scores, sybilRisks, options?)`

Publishes reputation snapshot as a Knowledge Asset to DKG.

**Options:**
- `algorithm` (string): Algorithm name (default: 'TrustWeightedPageRank')
- `algorithmVersion` (string): Algorithm version (default: '1.2')
- `includeSybilAnalysis` (boolean): Include Sybil analysis in snapshot (default: true)
- `includeProvenance` (boolean): Include provenance data (default: true)
- `previousSnapshotUAL` (string): UAL of previous snapshot for versioning

**Returns:** `PublishResult` with UAL

#### `getTopCreators(limit?)`

Retrieves top N creators from the latest reputation snapshot.

**Parameters:**
- `limit` (number): Number of top creators to return (default: 10)

**Returns:** `ReputationScoreEntry[]`

#### `queryUserReputation(query)`

Queries reputation for a specific user (MCP agent tool).

**Parameters:**
- `userDID` (string): User's Decentralized Identifier
- `includeSybilRisk` (boolean): Include Sybil risk assessment
- `includeConfidence` (boolean): Include confidence score

**Returns:** User reputation data with trust level assessment

### MCPReputationTools

Provides standardized tools for AI agents to query reputation data.

#### Available Tools

1. **`get_user_reputation`**: Query reputation for a user by DID
2. **`get_top_creators`**: Get top N creators by reputation
3. **`get_latest_snapshot`**: Get the latest reputation snapshot metadata
4. **`assess_trust_level`**: Assess trust level with recommendations

#### Usage

```typescript
import { createMCPReputationTools } from './mcp-reputation-tools';

const mcpTools = createMCPReputationTools(dkgClient);

// Execute a tool
const result = await mcpTools.executeTool('get_user_reputation', {
  userDID: 'did:dkg:user:123',
  includeSybilRisk: true
});

console.log(result.data);
```

## Reputation Snapshot Schema

The reputation snapshot is published as a JSON-LD Knowledge Asset following this schema:

```json
{
  "@context": {
    "schema": "https://schema.org/",
    "reputation": "https://origintrail.io/schemas/reputation/v1"
  },
  "@id": "ual:dkg:reputation:snapshot:timestamp",
  "@type": "reputation:Snapshot",
  "schema:dateCreated": "2025-11-25T12:00:00Z",
  "reputation:algorithm": "TrustWeightedPageRank v1.2",
  "reputation:scores": [
    {
      "@type": "reputation:Score",
      "schema:user": "did:dkg:user:123",
      "reputation:value": 0.89,
      "reputation:sybilFlag": false,
      "reputation:percentile": 95.0,
      "reputation:confidence": 0.92,
      "reputation:stakeAmount": "5000 TRAC"
    }
  ],
  "reputation:sybilAnalysis": {
    "totalAccountsAnalyzed": 12500,
    "suspectedSybilClusters": 3,
    "averageSybilRisk": 0.28,
    "detectionConfidence": 0.88
  },
  "reputation:provenance": {
    "inputGraphHash": "0x...",
    "computationMethod": {
      "algorithm": "TrustWeightedPageRank",
      "version": "1.2",
      "parameters": {
        "dampingFactor": 0.85,
        "maxIterations": 100
      }
    }
  }
}
```

## Experiments

### Sybil Injection Test

Tests the effectiveness of Sybil detection by injecting synthetic Sybil clusters.

```typescript
const result = await reputationService.runSybilInjectionTest(
  baseGraph,
  10, // cluster size
  0.8 // connection density
);

console.log(`Precision: ${result.precision}`);
console.log(`Recall: ${result.recall}`);
console.log(`F1-Score: ${result.f1Score}`);
```

### Performance Benchmarking

Benchmarks computation time across different graph sizes.

```typescript
const benchmarks = await reputationService.benchmarkPerformance([1000, 5000, 10000]);

benchmarks.forEach(b => {
  console.log(`${b.graphSize} nodes: ${b.computationTimeSeconds}s`);
});
```

## x402 Payment Integration

The service supports x402 micropayments for premium data access:

```typescript
const paymentResult = await reputationService.handlePremiumDataRequest(
  'did:dkg:user:123',
  'ual:dkg:reputation:snapshot:123',
  '5.00',
  'USDC'
);

if (paymentResult.status === 'payment_required') {
  // Handle payment request
  console.log(paymentResult.paymentRequest);
} else if (paymentResult.status === 'access_granted') {
  // Access granted
  console.log(paymentResult.resource);
}
```

## Configuration

### Environment Variables

```bash
# DKG Configuration
DKG_ENVIRONMENT=testnet  # or 'mainnet' or 'local'
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900
DKG_BLOCKCHAIN=otp:20430
DKG_PUBLISH_WALLET=your_wallet_private_key

# Mock Mode (for testing)
DKG_USE_MOCK=false
DKG_FALLBACK_TO_MOCK=true

# x402 Configuration
X402_FACILITATOR_URL=https://facilitator.example.com
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Demo Run

```bash
npm run demo
```

## Performance Considerations

- **Graph Size**: Optimized for graphs up to 10,000 nodes
- **Computation Time**: ~1-5 seconds for 5K nodes, ~5-15 seconds for 10K nodes
- **DKG Publishing**: ~2-5 seconds per snapshot
- **Memory Usage**: ~50-200 MB depending on graph size

## Privacy & Security

- **Pseudonymous Identifiers**: Uses DIDs for user identification
- **No PII Storage**: Avoids storing personally identifiable information
- **Sybil Resistance**: Multi-factor Sybil detection
- **Verifiable Snapshots**: Cryptographic signatures and provenance

## Future Enhancements

1. **Staking Integration**: Incorporate TRAC staking for reputation weighting
2. **Payment History**: Track x402 payments for TraceRank-style scoring
3. **Community Verification**: Token-Curated Registry (TCR) integration
4. **Real-time Updates**: Incremental reputation updates
5. **Multi-chain Support**: Cross-chain reputation aggregation

## Troubleshooting

### DKG Connection Issues

If you encounter connection issues:

1. Check DKG node is running and accessible
2. Verify network connectivity
3. Enable mock mode for testing: `useMockMode: true`
4. Check environment variables are set correctly

### Performance Issues

For large graphs:

1. Reduce `limit` in data ingestion
2. Increase `maxIterations` in PageRank config
3. Disable optional features (Sybil detection, fairness adjustments)
4. Use batch processing for multiple snapshots

## License

MIT

## Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

