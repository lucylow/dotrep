# Advanced Graph Algorithms for Reputation Scoring

This module implements research-backed graph algorithms for computing reputation scores in decentralized social networks. The algorithms are designed to address known limitations of basic PageRank while maintaining transparency and fairness.

## Overview

The implementation includes:

1. **Temporal Weighted PageRank** (UWUSRank-inspired)
   - Accounts for edge recency (recent interactions weighted higher)
   - Incorporates edge weights (endorsement strength, stake, payments)
   - Applies temporal decay to older edges

2. **Hybrid Reputation Scoring**
   - Combines graph structure with quality signals, stake, and payments
   - More robust and less gameable than pure graph-based ranking

3. **Fairness Adjustments**
   - Mitigates bias and inequality in rankings
   - Boosts underrepresented groups while maintaining relative ordering

4. **Sensitivity Auditing** (AURORA-inspired)
   - Identifies which edges have the most impact on rankings
   - Enables transparency and detects manipulation

5. **Sybil Detection**
   - Identifies potential Sybil attack clusters using graph structure
   - Uses multiple heuristics for robust detection

## Research Foundation

This implementation is based on academic research on:

- **PageRank & Centrality for Social Networks**: Using graph structure to rank influence/importance
- **Temporal Centrality Algorithms**: UWUSRank and similar algorithms that account for recency
- **Auditing PageRank**: AURORA research on understanding ranking sensitivity
- **Fairness in Network Ranking**: Research on bias and inequality in graph-based rankings

### Key Research Insights Applied

1. **Temporal Weighting**: Recent interactions matter more than old ones
2. **Weighted Edges**: Not all relationships are equal (stake-backed, payment-backed, verified)
3. **Hybrid Scoring**: Graph structure alone is insufficient; combine with quality signals
4. **Fairness**: Structural ranking can amplify inequality; adjustments needed
5. **Transparency**: Auditing helps understand and trust rankings

## Usage

### Basic Example

```typescript
import { createDKGClientV8 } from './dkg-client-v8';
import { createGraphReputationService } from './graph-reputation-service';
import { EdgeType } from './graph-algorithms';

// Initialize services
const dkgClient = createDKGClientV8({ environment: 'testnet' });
const reputationService = createGraphReputationService(dkgClient);

// Prepare graph data
const graphData = {
  nodes: [
    {
      id: 'alice',
      metadata: {
        stake: 1000,
        paymentHistory: 5000,
        contentQuality: 85,
        activityRecency: Date.now() - 7 * 24 * 60 * 60 * 1000
      }
    },
    // ... more nodes
  ],
  edges: [
    {
      source: 'alice',
      target: 'bob',
      weight: 0.8,
      edgeType: EdgeType.ENDORSE,
      timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000,
      metadata: {
        endorsementStrength: 0.9,
        stakeBacked: true,
        verified: true
      }
    },
    // ... more edges
  ]
};

// Compute reputation
const results = await reputationService.computeReputation(graphData, {
  useTemporalPageRank: true,
  applyFairnessAdjustments: true,
  enableSybilDetection: true,
  computeHybridScore: true
});

// Publish to DKG
await reputationService.publishReputationScores(results);
```

### Advanced Configuration

```typescript
const results = await reputationService.computeReputation(graphData, {
  useTemporalPageRank: true,
  applyFairnessAdjustments: true,
  fairnessAdjustmentStrength: 0.2, // 0 = no adjustment, 1 = maximum
  enableSensitivityAudit: true, // Expensive, use for top nodes only
  enableSybilDetection: true,
  computeHybridScore: true,
  hybridWeights: {
    graph: 0.5,      // Graph structure weight
    quality: 0.25,   // Content quality weight
    stake: 0.15,     // Stake weight
    payment: 0.1     // Payment history weight
  },
  pageRankConfig: {
    dampingFactor: 0.85,
    temporalDecay: 0.1,
    recencyWeight: 0.3,
    stakeWeight: 0.2,
    paymentWeight: 0.15
  }
});
```

## Algorithm Details

### Temporal Weighted PageRank

The temporal PageRank algorithm enhances basic PageRank by:

1. **Temporal Decay**: Older edges are weighted less using exponential decay
   ```
   temporal_factor = exp(-decay_rate * age_in_years)
   final_weight = base_weight * (recency_weight + (1 - recency_weight) * temporal_factor)
   ```

2. **Edge Weight Enhancement**: 
   - Stake-backed edges: +20% weight
   - Payment-backed edges: logarithmic boost based on amount
   - Verified endorsements: +20% weight

3. **Iterative Computation**: Standard PageRank iteration with enhanced weights

### Hybrid Scoring

Combines multiple signals:

```
final_score = 
  graph_score * graph_weight +
  quality_score * quality_weight +
  stake_score * stake_weight +
  payment_score * payment_weight
```

Each component is normalized to 0-1000 range for consistency.

### Fairness Adjustments

Applies boost to underrepresented groups:

1. Computes mean scores for majority and minority groups
2. Calculates boost factor based on disparity
3. Applies boost while preserving total score mass
4. Renormalizes to maintain consistency

### Sensitivity Auditing

For each node, tests removing each incoming edge and measures impact:

1. Remove edge from graph
2. Recompute PageRank
3. Measure score change
4. Rank edges by impact

This identifies which relationships most influence a node's reputation.

### Sybil Detection

Uses multiple heuristics:

1. **High in-degree, low PageRank**: Many connections but low score (z-score < -1)
2. **High out-degree, low in-degree**: Potential spam behavior
3. **Low reciprocity**: Many incoming but few outgoing connections

Each pattern contributes to a Sybil probability score (0-1).

## Performance Considerations

- **Temporal PageRank**: O(E * I) where E = edges, I = iterations (typically 20-50)
- **Sensitivity Auditing**: O(N * E * I) where N = nodes to audit (expensive!)
- **Fairness Adjustments**: O(N) - linear in number of nodes
- **Sybil Detection**: O(N + E) - linear in graph size

**Recommendations**:
- Use sensitivity auditing only for top-ranked nodes
- Cache PageRank results when possible
- Use rolling averages for stability over time

## Testing

See `graph-algorithms-example.ts` for:
- Basic reputation computation
- Algorithm comparison (baseline vs hybrid)
- Sybil attack simulation

## Future Improvements

1. **Incremental Updates**: Update scores incrementally as graph changes
2. **Distributed Computation**: Parallelize for large graphs
3. **Machine Learning**: Learn optimal weights from data
4. **Advanced Sybil Detection**: Use community detection algorithms
5. **Real-time Updates**: Stream processing for dynamic graphs

## References

- PageRank algorithm (Brin & Page, 1998)
- UWUSRank: User Activity and Interest Similarity-based Ranking (MDPI)
- AURORA: Auditing PageRank on Large Graphs (arXiv)
- Fairness in Network-based Ranking (arXiv)
- Social Network Analysis for Reputation Systems (various)

## License

Part of the DotRep project.

