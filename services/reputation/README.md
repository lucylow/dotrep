# Advanced Social Graph Analysis System

This directory contains an enhanced social graph analysis system with multi-dimensional reputation scoring, advanced Sybil detection, Umanitek Guardian integration, and DKG publishing capabilities.

## 🎯 Features

### Multi-Dimensional Reputation Scoring
- **Structural Analysis**: PageRank, betweenness centrality, closeness centrality, degree centrality, community embeddedness
- **Behavioral Analysis**: Engagement consistency, reciprocity rate, content diversity, activity longevity, posting regularity
- **Content Quality Analysis**: Umanitek Guardian integration for content verification
- **Economic Analysis**: Stake-based scoring and transaction activity

### Enhanced Sybil Detection
- **Graph-Based Detection**: Community detection, connection diversity, clustering coefficient, degree anomaly detection
- **Behavioral Anomaly Detection**: Activity burstiness, interaction reciprocity, content uniformity, temporal patterns
- **Economic Analysis**: Stake and transaction activity analysis
- **Multi-Factor Risk Scoring**: Combines all factors into comprehensive risk assessment

### Umanitek Guardian Integration
- Content verification via fingerprinting
- Support for images, videos, and text
- Mock mode for development/demo
- Automatic fallback to mock if API unavailable

### DKG Publishing
- Comprehensive reputation snapshot publishing
- JSON-LD schema compliance
- Provenance tracking with graph hashes
- Integration with Guardian verification results

## 📁 File Structure

```
services/reputation/
├── compute_reputation.py          # Main entry point (enhanced)
├── advanced_graph_analyzer.py     # Multi-dimensional graph analysis
├── enhanced_sybil_detector.py    # Advanced Sybil detection
├── guardian_integrator.py        # Umanitek Guardian integration
├── reputation_engine.py          # Trust-weighted reputation computation
├── dkg_reputation_publisher.py    # DKG snapshot publishing
├── optimized_graph_processor.py  # Performance optimizations
├── social_graph_demo.py          # Complete demo implementation
└── requirements.txt              # Dependencies
```

## 🚀 Usage

### Basic Reputation Computation

```bash
python compute_reputation.py --input data/sample_graph.json --output results.json
```

### Advanced Multi-Dimensional Analysis

```bash
python compute_reputation.py --input data/sample_graph.json --advanced --output results.json
```

### Complete Demo

```bash
python compute_reputation.py --input data/sample_graph.json --demo --output demo_results.json
```

### Publish to DKG

```bash
python compute_reputation.py --input data/sample_graph.json --advanced --publish --output results.json
```

## 📊 Components

### AdvancedGraphAnalyzer

Performs comprehensive graph analysis with:
- Structural metrics (PageRank, centrality measures)
- Behavioral patterns
- Content quality (via Guardian)
- Economic signals

### EnhancedSybilDetector

Multi-factor Sybil detection:
- Graph cluster analysis (Louvain community detection)
- Behavioral anomaly detection
- Economic footprint analysis
- Temporal pattern analysis
- Content similarity analysis

### GuardianIntegrator

Umanitek Guardian API client:
- Content verification
- Mock mode for development
- Automatic fallback
- Health checks

### ReputationEngine

Trust-weighted reputation computation:
- Combines all analysis dimensions
- Dynamic weight adjustment
- Sybil penalty application
- Confidence scoring

### DKGReputationPublisher

Publishes reputation snapshots to DKG:
- JSON-LD schema compliance
- Provenance tracking
- Guardian evidence integration

## 🔧 Configuration

### Environment Variables

```bash
# Guardian API (optional)
UMANITEK_GUARDIAN_API_URL=https://api.umanitek.ai/v1
UMANITEK_GUARDIAN_API_KEY=your_api_key_here
GUARDIAN_USE_MOCK=true
GUARDIAN_FALLBACK_TO_MOCK=true

# DKG Publishing
EDGE_PUBLISH_URL=http://mock-dkg:8080
EDGE_API_KEY=your_api_key
```

## 📈 Performance

The system includes optimizations for large graphs:
- Batch processing with configurable chunk sizes
- Parallel computation using ThreadPoolExecutor
- Result caching
- Incremental updates for graph changes

## 🧪 Testing

Run Sybil detection test:
```bash
python compute_reputation.py --test
```

## 📝 Output Format

The advanced analysis produces comprehensive results:

```json
{
  "method": "advanced_multi_dimensional",
  "reputations": {
    "user_did": {
      "reputationScore": 0.85,
      "graphScore": 0.78,
      "stakeWeight": 0.5,
      "sybilPenalty": 0.05,
      "confidence": 0.92,
      "riskLevel": "low"
    }
  },
  "summary": {
    "total_users": 100,
    "avg_reputation": 0.65,
    "high_risk_users": 5
  }
}
```

## 🔗 Integration

The system integrates with:
- **OriginTrail DKG**: For publishing reputation snapshots
- **Umanitek Guardian**: For content verification
- **NetworkX**: For graph algorithms
- **Python-Louvain**: For community detection

## 📚 References

- [NetworkX Documentation](https://networkx.org/)
- [Umanitek Guardian](https://umanitek.ai)
- [OriginTrail DKG](https://origintrail.io)
- [Python-Louvain](https://github.com/taynaud/python-louvain)

