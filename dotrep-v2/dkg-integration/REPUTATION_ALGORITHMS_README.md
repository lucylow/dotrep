# 🚀 Reputation Algorithms: Complete Implementation Guide

This guide shows you how to run reputation algorithms for your social graph system, from basic implementations to advanced DKG-integrated solutions.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Algorithms](#algorithms)
- [Usage Examples](#usage-examples)
- [Advanced Features](#advanced-features)
- [DKG Integration](#dkg-integration)

## 🚀 Quick Start

### Run Quick Demo

```bash
# Run with sample data (no external dependencies)
ts-node dotrep-v2/dkg-integration/run-reputation-algorithms.ts --quick-demo
```

### Run on Real Data

```bash
# Run with dataset file
ts-node dotrep-v2/dkg-integration/run-reputation-algorithms.ts \
  --dataset data/sample_graph.json \
  --multi-dimensional \
  --batch

# Run for specific users
ts-node dotrep-v2/dkg-integration/run-reputation-algorithms.ts \
  --users user1,user2,user3 \
  --multi-dimensional \
  --publish
```

## 🏗️ Architecture

The reputation system consists of several layers:

```
┌─────────────────────────────────────────────────────────┐
│              Reputation Algorithm Runner                 │
│  (Orchestrates the complete pipeline)                   │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│ Basic        │  │ Trust-       │  │ Multi-       │
│ PageRank     │  │ Weighted     │  │ Dimensional  │
│              │  │ PageRank     │  │ Reputation   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Sybil Detector    │
              │  (Multi-factor)     │
              └─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Batch Processor    │
              │  (Scalable)          │
              └─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  DKG Publisher      │
              │  (Knowledge Assets)  │
              └──────────────────────┘
```

## 📊 Algorithms

### 1. Basic PageRank

Classic PageRank algorithm for computing node importance in a directed graph.

```typescript
import { BasicPageRank } from './reputation-algorithm-runner';
import { GraphNode, GraphEdge, EdgeType } from './graph-algorithms';

const pagerank = new BasicPageRank({
  dampingFactor: 0.85,
  maxIterations: 100,
  tolerance: 1e-6
});

const scores = pagerank.compute(nodes, edges);
```

**Features:**
- Standard PageRank algorithm
- Configurable damping factor
- Convergence detection
- Score normalization

### 2. Trust-Weighted PageRank

Enhanced PageRank that incorporates trust signals:
- Economic stake weighting
- Reputation-based weighting
- Edge trust weights

```typescript
import { TrustWeightedPageRank } from './reputation-algorithm-runner';

const stakeWeights = new Map([
  ['user1', 5000],
  ['user2', 1000]
]);

const trustPagerank = new TrustWeightedPageRank({
  dampingFactor: 0.85,
  stakeWeights,
  reputationWeights: new Map()
});

const scores = trustPagerank.compute(nodes, edges);
```

**Features:**
- Stake-based edge weighting (up to 50% boost)
- Reputation-based weighting (up to 30% boost)
- Trust signal integration
- Configurable weight caps

### 3. Multi-Dimensional Reputation System

Computes comprehensive reputation across multiple dimensions:

- **Structural**: User's position in social graph (PageRank, centrality)
- **Behavioral**: Activity patterns (engagement, reciprocity)
- **Content**: Quality verification (Guardian integration)
- **Economic**: Stake and payment history
- **Temporal**: Long-term patterns (longevity, recency)

```typescript
import { MultiDimensionalReputation } from './reputation-algorithm-runner';

const reputationEngine = new MultiDimensionalReputation(
  { nodes, edges },
  guardianIntegrator // optional
);

const result = await reputationEngine.computeUserReputation('user1', [
  'structural',
  'behavioral',
  'content',
  'economic',
  'temporal'
]);

console.log(result.finalScore); // 0.0 - 1.0
console.log(result.componentScores);
console.log(result.sybilRisk);
console.log(result.confidence);
```

**Component Scores:**
- Each dimension scored 0-1
- Weighted combination for final score
- Sybil risk penalty applied
- Confidence score based on data quality

### 4. Advanced Sybil Detection

Multi-factor Sybil detection using:

- **Graph Structure**: Clustering analysis, connection patterns
- **Behavioral Patterns**: Burstiness detection, activity anomalies
- **Economic Footprint**: Stake/payment verification
- **Temporal Patterns**: Account age vs activity correlation

```typescript
import { SybilDetector } from './reputation-algorithm-runner';

const detector = new SybilDetector({ nodes, edges });
const sybilRisk = detector.analyzeUser('user1'); // 0.0 - 1.0

if (sybilRisk > 0.7) {
  console.log('High Sybil risk detected!');
}
```

**Risk Factors:**
- Graph clustering (high internal connections)
- Behavioral burstiness (many actions in short time)
- Economic footprint mismatch (high activity, no stake)
- Temporal anomalies (new account, high activity)

## 🚀 Usage Examples

### Example 1: Basic PageRank

```typescript
import { BasicPageRank } from './reputation-algorithm-runner';
import { GraphNode, GraphEdge, EdgeType } from './graph-algorithms';

// Create sample graph
const nodes: GraphNode[] = [
  { id: 'A', metadata: {} },
  { id: 'B', metadata: {} },
  { id: 'C', metadata: {} }
];

const edges: GraphEdge[] = [
  { source: 'A', target: 'B', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
  { source: 'B', target: 'C', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
  { source: 'C', target: 'A', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() }
];

// Compute PageRank
const pagerank = new BasicPageRank();
const scores = pagerank.compute(nodes, edges);

console.log('PageRank scores:', scores);
// Map { 'A' => 0.333, 'B' => 0.333, 'C' => 0.333 }
```

### Example 2: Multi-Dimensional Reputation

```typescript
import { MultiDimensionalReputation } from './reputation-algorithm-runner';

const graph = {
  nodes: [
    {
      id: 'alice',
      metadata: {
        stake: 5000,
        paymentHistory: 2000,
        contentQuality: 85
      }
    },
    {
      id: 'bob',
      metadata: {
        stake: 1000,
        paymentHistory: 500,
        contentQuality: 70
      }
    }
  ],
  edges: [
    {
      source: 'alice',
      target: 'bob',
      weight: 0.8,
      edgeType: EdgeType.ENDORSE,
      timestamp: Date.now()
    }
  ]
};

const reputationEngine = new MultiDimensionalReputation(graph);
const result = await reputationEngine.computeUserReputation('alice');

console.log('Final Score:', result.finalScore);
console.log('Component Scores:', result.componentScores);
console.log('Sybil Risk:', result.sybilRisk);
console.log('Confidence:', result.confidence);
console.log('Explanation:', result.explanation);
```

### Example 3: Batch Processing

```typescript
import { MultiDimensionalReputation, BatchReputationEngine } from './reputation-algorithm-runner';

const reputationEngine = new MultiDimensionalReputation(graph);
const batchEngine = new BatchReputationEngine(reputationEngine, {
  batchSize: 1000,
  maxWorkers: 4
});

const userList = ['user1', 'user2', 'user3', /* ... */];
const result = await batchEngine.computeBatchReputation(userList);

console.log(`Processed ${result.totalProcessed} users`);
console.log(`Failed: ${result.totalFailed}`);
console.log(`Time: ${result.processingTime}ms`);
```

### Example 4: Complete Pipeline

```typescript
import { createReputationAlgorithmRunner } from './reputation-algorithm-runner';

const runner = createReputationAlgorithmRunner({
  useMockMode: true,
  enableMultiDimensional: true,
  enableBatchProcessing: true
});

const result = await runner.runCompletePipeline({
  datasetFile: 'data/social_graph.json',
  userList: ['user1', 'user2', 'user3'],
  enableMultiDimensional: true,
  enableBatchProcessing: true,
  publishToDKG: true
});

console.log('Scores:', result.scores);
console.log('Snapshot UAL:', result.snapshotUAL);
```

## 🔧 Advanced Features

### Batch Processing

Process large user lists efficiently with parallel processing and caching:

```typescript
const batchEngine = new BatchReputationEngine(reputationEngine, {
  batchSize: 1000,      // Users per batch
  maxWorkers: 4         // Parallel workers
});

// Process 10,000 users
const result = await batchEngine.computeBatchReputation(userList);
```

**Features:**
- Automatic batching
- Parallel processing with concurrency limits
- Result caching (1 hour TTL)
- Progress tracking
- Error handling

### Caching

Get cached reputation if recent enough:

```typescript
const cached = batchEngine.getCachedReputation('user1', 60); // 60 minutes
if (cached) {
  console.log('Using cached result:', cached);
}
```

### Incremental Updates

Update reputation for affected users only:

```typescript
// When new interactions occur
const newInteractions = [
  { from: 'user1', to: 'user2', weight: 0.8, timestamp: Date.now() }
];

// Recompute only affected users
const affectedUsers = new Set([
  ...newInteractions.map(i => i.from),
  ...newInteractions.map(i => i.to)
]);

const updatedScores = await batchEngine.computeBatchReputation(
  Array.from(affectedUsers)
);
```

## 🔗 DKG Integration

### Publishing Reputation Snapshots

Publish reputation scores as DKG Knowledge Assets:

```typescript
import { DKGReputationPublisher } from './reputation-algorithm-runner';
import { createDKGClientV8 } from './dkg-client-v8';

const dkgClient = createDKGClientV8({ useMockMode: true });
const publisher = new DKGReputationPublisher(dkgClient);

const scores = new Map<string, ReputationResult>();
// ... compute scores ...

const publishResult = await publisher.publishReputationSnapshot(scores, {
  creator: 'did:dkg:reputation-engine:001',
  computationMethod: 'MultiDimensionalReputation',
  timestamp: Date.now()
});

console.log('Published UAL:', publishResult.UAL);
console.log('Transaction:', publishResult.transactionHash);
```

### Querying Reputation Data

Query reputation data from DKG:

```typescript
// Query by UAL
const snapshot = await dkgClient.queryReputation(publishResult.UAL);

// Search by developer ID
const results = await dkgClient.searchByDeveloper('user1', { limit: 10 });
```

## 📈 Performance Optimization

### Pre-compute Global Metrics

For large graphs, pre-compute expensive metrics:

```typescript
// Pre-compute PageRank for all nodes
const globalPageRank = pagerank.compute(allNodes, allEdges);

// Then use cached scores for individual users
const userScore = globalPageRank.get('user1');
```

### Incremental Updates

Only recompute affected users:

```typescript
// Track affected users
const affectedUsers = new Set<string>();

// When edge is added/removed
affectedUsers.add(edge.source);
affectedUsers.add(edge.target);

// Recompute only affected
const updated = await batchEngine.computeBatchReputation(
  Array.from(affectedUsers)
);
```

## 🧪 Testing

### Run Quick Demo

```bash
ts-node dotrep-v2/dkg-integration/run-reputation-algorithms.ts --quick-demo
```

### Run with Sample Data

```bash
# Create sample graph data
cat > sample_graph.json << EOF
{
  "nodes": [
    {"id": "user1", "metadata": {"stake": 5000}},
    {"id": "user2", "metadata": {"stake": 1000}}
  ],
  "edges": [
    {"source": "user1", "target": "user2", "weight": 0.8, "timestamp": 1234567890}
  ]
}
EOF

# Run algorithms
ts-node dotrep-v2/dkg-integration/run-reputation-algorithms.ts \
  --dataset sample_graph.json \
  --multi-dimensional \
  --batch
```

## 📚 API Reference

### BasicPageRank

```typescript
class BasicPageRank {
  constructor(config?: {
    dampingFactor?: number;    // Default: 0.85
    maxIterations?: number;   // Default: 100
    tolerance?: number;        // Default: 1e-6
  });
  
  compute(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number>;
}
```

### TrustWeightedPageRank

```typescript
class TrustWeightedPageRank extends BasicPageRank {
  constructor(config?: {
    dampingFactor?: number;
    maxIterations?: number;
    tolerance?: number;
    stakeWeights?: Map<string, number>;
    reputationWeights?: Map<string, number>;
  });
}
```

### MultiDimensionalReputation

```typescript
class MultiDimensionalReputation {
  constructor(
    graph: { nodes: GraphNode[]; edges: GraphEdge[] },
    guardianIntegrator?: any
  );
  
  async computeUserReputation(
    userDid: string,
    dimensions?: string[]
  ): Promise<ReputationResult>;
}
```

### SybilDetector

```typescript
class SybilDetector {
  constructor(graph: { nodes: GraphNode[]; edges: GraphEdge[] });
  
  analyzeUser(userDid: string): number; // Returns 0.0 - 1.0 risk score
}
```

### BatchReputationEngine

```typescript
class BatchReputationEngine {
  constructor(
    reputationEngine: MultiDimensionalReputation,
    config?: {
      batchSize?: number;      // Default: 1000
      maxWorkers?: number;     // Default: 4
    }
  );
  
  async computeBatchReputation(
    userList: string[],
    dimensions?: string[]
  ): Promise<BatchReputationResult>;
  
  getCachedReputation(
    userDid: string,
    maxAgeMinutes?: number
  ): ReputationResult | null;
}
```

### DKGReputationPublisher

```typescript
class DKGReputationPublisher {
  constructor(dkgClient: DKGClientV8);
  
  async publishReputationSnapshot(
    reputationScores: Map<string, ReputationResult>,
    metadata?: {
      creator?: string;
      computationMethod?: string;
      timestamp?: number;
      provenance?: Record<string, any>;
    }
  ): Promise<PublishResult>;
}
```

## 🎯 Best Practices

1. **Use Multi-Dimensional Reputation** for production systems
2. **Enable Batch Processing** for large user lists
3. **Cache Results** to avoid recomputation
4. **Monitor Sybil Risk** and apply penalties
5. **Publish to DKG** for verifiable reputation snapshots
6. **Use Incremental Updates** for real-time systems
7. **Pre-compute Global Metrics** for performance

## 🔍 Troubleshooting

### Low Scores

- Check graph connectivity
- Verify edge weights
- Review Sybil risk penalties
- Check component score breakdowns

### Performance Issues

- Enable batch processing
- Use caching
- Pre-compute global metrics
- Reduce graph size for testing

### DKG Publishing Failures

- Check DKG connection
- Verify JSON-LD structure
- Check token balances
- Review error messages

## 📖 Further Reading

- [Graph Algorithms Documentation](./GRAPH_ALGORITHMS_README.md)
- [Social Graph Reputation Service](./SOCIAL_GRAPH_REPUTATION_README.md)
- [DKG Client Documentation](./README.md)

## 🤝 Contributing

When adding new algorithms:

1. Implement the algorithm class
2. Add tests
3. Update documentation
4. Add examples
5. Update this README

## 📄 License

See main project license.

