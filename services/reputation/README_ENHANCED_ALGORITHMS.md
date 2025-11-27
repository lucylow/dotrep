# Enhanced Graph Ranking Algorithms

This module implements advanced graph ranking algorithms based on recent research (2018-2025) on social network analysis, reputation systems, and graph-based ranking.

## Features

### 1. Temporal PageRank (UWUSRank-inspired)
- **Recency weighting**: Older interactions decay over time
- **Activity weighting**: More active users get higher scores
- **Configurable decay**: Adjustable recency decay factor

### 2. Weighted Hybrid PageRank
Combines multiple signals:
- **Graph structure** (40%): Traditional PageRank on social graph
- **Economic signals** (30%): Stake, payments, transactions
- **Content verification** (20%): Guardian verification scores
- **Temporal signals** (10%): Recent activity and engagement

### 3. Sensitivity Auditing (AURORA-inspired)
- **Edge influence analysis**: Identifies which edges most affect rankings
- **Sensitive node detection**: Finds nodes with unstable rankings
- **Explainability**: Generates reports explaining why nodes rank high/low

### 4. Fairness Adjustments
- **Minority boost**: Increases scores for underrepresented nodes
- **Damping factor**: Reduces "rich-get-richer" effects
- **Bias detection**: Analyzes inequality across groups
- **Minimum score floor**: Ensures all nodes get some reputation

## Usage

### Basic Temporal PageRank

```python
from enhanced_pagerank import TemporalPageRank
import networkx as nx
from datetime import datetime, timedelta

# Build graph
G = nx.DiGraph()
G.add_edge('alice', 'bob', weight=1.0)
G.add_edge('bob', 'charlie', weight=0.8)

# Edge timestamps (for recency weighting)
edge_timestamps = {
    ('alice', 'bob'): datetime.now() - timedelta(days=1),
    ('bob', 'charlie'): datetime.now() - timedelta(days=30)
}

# Node activity scores (0-1)
node_activity = {
    'alice': 0.9,
    'bob': 0.7,
    'charlie': 0.5
}

# Compute temporal PageRank
temporal_pr = TemporalPageRank(alpha=0.85, recency_decay=0.95)
scores = temporal_pr.compute(G, edge_timestamps, node_activity)
```

### Hybrid Reputation Scoring

```python
from enhanced_pagerank import WeightedHybridPageRank

# Economic signals
economic_signals = {
    'alice': {'stake': 500, 'payments': 50, 'transactions': 20},
    'bob': {'stake': 200, 'payments': 30, 'transactions': 15}
}

# Verification scores (from Guardian)
verification_scores = {
    'alice': 0.95,
    'bob': 0.80
}

# Compute hybrid scores
hybrid_pr = WeightedHybridPageRank(
    graph_weight=0.4,
    economic_weight=0.3,
    verification_weight=0.2,
    temporal_weight=0.1
)

hybrid_scores = hybrid_pr.compute(
    G,
    pagerank_scores,
    economic_signals,
    verification_scores
)
```

### Comprehensive Reputation Computation

```python
from enhanced_pagerank import compute_enhanced_reputation

results = compute_enhanced_reputation(
    graph=G,
    edge_timestamps=edge_timestamps,
    node_activity=node_activity,
    economic_signals=economic_signals,
    verification_scores=verification_scores,
    enable_fairness=True,
    enable_auditing=True,
    node_labels={'alice': 'majority', 'bob': 'minority'}
)

print(f"Top ranked: {results['top_ranked']}")
print(f"Bias analysis: {results.get('bias_analysis', {})}")
print(f"Edge influence: {results.get('auditing', {}).get('edge_influence', {})}")
```

### Auditing and Explainability

```python
from enhanced_pagerank import PageRankAuditor

# Create auditor
auditor = PageRankAuditor(G, pagerank_scores)

# Compute edge influence
edge_influence = auditor.compute_edge_influence(top_k=50)

# Detect sensitive nodes
sensitive_nodes = auditor.detect_sensitive_nodes(threshold=0.01)

# Generate explanation for a node
explanation = auditor.generate_explanation('alice', top_k_edges=5)
print(f"Alice's ranking is influenced by: {explanation['top_influencing_edges']}")
```

### Fairness Adjustments

```python
from enhanced_pagerank import FairnessAdjuster

adjuster = FairnessAdjuster(
    minority_boost=0.1,
    damping_factor=0.9,
    min_score_floor=0.01
)

# Apply fairness adjustments
adjusted_scores = adjuster.adjust_for_fairness(
    scores,
    node_labels={'alice': 'majority', 'bob': 'minority'}
)

# Detect bias
bias_report = adjuster.detect_bias(scores, node_groups)
print(f"Group statistics: {bias_report['group_statistics']}")
```

## TypeScript Usage

```typescript
import {
  computeEnhancedReputation,
  TemporalPageRank,
  WeightedHybridPageRank,
  FairnessAdjuster,
  PageRankAuditor
} from './enhancedGraphRanking';

// Define nodes and edges
const nodes = [
  { id: 'alice', activity: 0.9, stake: 500, verificationScore: 0.95 },
  { id: 'bob', activity: 0.7, stake: 200, verificationScore: 0.80 }
];

const edges = [
  { source: 'alice', target: 'bob', weight: 1.0, timestamp: new Date() }
];

// Compute enhanced reputation
const result = computeEnhancedReputation(nodes, edges, {
  useTemporal: true,
  useHybrid: true,
  enableFairness: true,
  enableAuditing: false
});

console.log('Top ranked:', result.topRanked);
```

## Research Background

These implementations are based on:

1. **UWUSRank** (MDPI): Temporal PageRank with user activity and recency
2. **AURORA** (arXiv): Auditing PageRank on large graphs
3. **Inequality in Network-based Ranking** (arXiv): Fairness adjustments
4. **Social Participatory Sensing** (arXiv): Hybrid reputation with quality signals

## Configuration

### Temporal PageRank Parameters
- `alpha`: Damping factor (default: 0.85)
- `recency_decay`: Decay per day (default: 0.95)
- `activity_weight`: Weight for activity (default: 0.3)
- `max_iter`: Maximum iterations (default: 100)
- `tol`: Convergence tolerance (default: 1e-6)

### Hybrid Ranking Weights
- `graph_weight`: Graph structure weight (default: 0.4)
- `economic_weight`: Economic signals weight (default: 0.3)
- `verification_weight`: Verification weight (default: 0.2)
- `temporal_weight`: Temporal signals weight (default: 0.1)

### Fairness Parameters
- `minority_boost`: Boost for minority nodes (default: 0.1)
- `damping_factor`: Rich-get-richer damping (default: 0.9)
- `min_score_floor`: Minimum score (default: 0.01)

## Performance Considerations

- **Large graphs**: Use sampling in auditing (`sample_size` parameter)
- **Real-time updates**: Temporal PageRank can be incrementally updated
- **Caching**: PageRank scores can be cached and updated periodically
- **Parallelization**: Edge influence computation can be parallelized

## Testing

Run tests with:
```bash
python -m pytest services/reputation/tests/test_enhanced_pagerank.py
```

## References

- UWUSRank: User Activity and Interest Similarity-based Ranking
- AURORA: Auditing PageRank on Large Graphs
- Inequality and Inequity in Network-based Ranking
- Social Participatory Sensing with Reputation Systems

