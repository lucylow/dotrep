# Social Network Dataset Loader

Comprehensive support for loading and processing social network datasets from various formats and sources, designed for use with the Sybil-Resistant Social Credit Marketplace.

## Overview

The Social Network Dataset Loader provides robust support for loading social network datasets from:
- **SNAP format** (Stanford Large Network Dataset Collection)
- **JSON format** (custom node/edge structures)
- **CSV format** (edge lists with metadata)
- **GraphML/GEXF** (planned)

## Key Features

✅ **Multiple Format Support**: Load datasets from SNAP, JSON, CSV formats  
✅ **Automatic Format Detection**: Detects file format from extension and content  
✅ **Dataset Validation**: Validates structure and integrity  
✅ **Preprocessing Options**: Filtering, normalization, weight limits  
✅ **Graph Statistics**: Computes density, degree distribution, and more  
✅ **Popular Dataset Support**: Built-in info for Bitcoin-OTC, Reddit, Facebook, etc.  
✅ **Integration**: Seamlessly works with Social Graph Reputation Service  

## Supported Datasets

The loader includes built-in information for popular research datasets:

| Dataset | Nodes | Edges | Type | Properties |
|--------|-------|-------|------|------------|
| **Bitcoin-OTC** | ~5,881 | ~35,592 | Trust Network | Weighted, Signed, Directed, Temporal |
| **Bitcoin-Alpha** | ~3,783 | ~24,186 | Trust Network | Weighted, Signed, Directed, Temporal |
| **Reddit Hyperlinks** | ~55,863 | ~858,490 | Social Network | Signed, Directed, Temporal |
| **Facebook Ego** | ~4,039 | ~88,234 | Social Network | Undirected |
| **Wikipedia Vote** | ~7,115 | ~103,689 | Peer Evaluation | Directed |
| **Epinions** | ~75,879 | ~508,837 | Trust Network | Directed |

### Dataset Sources

- **Stanford SNAP**: https://snap.stanford.edu/data/
- **Network Repository**: https://networkrepository.com
- **Kaggle**: https://www.kaggle.com/datasets?tags=16502-Social+Networks

## Usage

### Basic Usage

```typescript
import { createSocialNetworkDatasetLoader } from './social-network-dataset-loader';

const loader = createSocialNetworkDatasetLoader();

// Load a dataset
const dataset = await loader.loadFromFile('data/bitcoin-otc.txt', {
  format: 'snap',
  directed: true,
  weighted: true,
  signed: true,
  temporal: true
});

console.log(`Loaded: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges`);
console.log(`Statistics: density=${dataset.statistics.density}`);
```

### With Reputation Service

```typescript
import { createDKGClientV8 } from './dkg-client-v8';
import { createSocialGraphReputationService } from './social-graph-reputation-service';

const dkgClient = createDKGClientV8({ useMockMode: true });
const reputationService = createSocialGraphReputationService(dkgClient);

// Load dataset and compute reputation
const graphData = await reputationService.ingestSocialGraphData({
  datasetFile: 'data/bitcoin-otc.txt',
  datasetOptions: {
    format: 'snap',
    maxNodes: 1000,
    normalizeWeights: true
  }
});

// Compute reputation scores
const { scores, sybilRisks } = await reputationService.computeReputation(
  graphData,
  { enableSybilDetection: true }
);
```

### Loading Options

```typescript
const options: DatasetLoadOptions = {
  format: 'auto',              // Auto-detect or specify: 'snap' | 'json' | 'csv'
  directed: true,               // Whether graph is directed
  weighted: true,               // Whether edges have weights
  signed: true,                // Whether edges can be negative (trust/distrust)
  temporal: true,               // Whether edges have timestamps
  maxNodes: 10000,             // Limit number of nodes
  maxEdges: 100000,            // Limit number of edges
  normalizeWeights: true,      // Normalize weights to [0, 1]
  minWeight: 0.1,              // Filter edges below this weight
  maxWeight: 1.0,               // Filter edges above this weight
  nodeFilter: (nodeId) => {    // Custom node filter
    return nodeId.startsWith('user-');
  },
  edgeFilter: (source, target) => {  // Custom edge filter
    return source !== target;  // Filter self-loops
  },
  skipValidation: false        // Skip dataset validation (not recommended)
};
```

## Format Specifications

### SNAP Format

SNAP format is a space-separated edge list format commonly used by Stanford datasets:

```
# Comment lines start with #
# Format: source target [weight] [timestamp]
1 2 0.5 1234567890
2 3 -0.3 1234567900
3 1 1.0
```

- **Columns**: source, target, weight (optional), timestamp (optional)
- **Comments**: Lines starting with `#` are ignored
- **Signed networks**: Negative weights indicate distrust/negative relationships
- **Temporal networks**: Timestamps can be in seconds or milliseconds

### JSON Format

JSON format supports flexible node and edge structures:

```json
{
  "name": "My Social Network",
  "description": "Custom social network dataset",
  "nodes": [
    { "id": "user1", "name": "Alice", "role": "developer" },
    { "id": "user2", "name": "Bob", "role": "designer" }
  ],
  "edges": [
    { "source": "user1", "target": "user2", "weight": 0.8, "type": "collaborates" },
    { "source": "user2", "target": "user1", "weight": 0.9, "type": "endorses" }
  ],
  "directed": true,
  "weighted": true,
  "signed": false,
  "temporal": false
}
```

### CSV Format

CSV format with header row:

```csv
source,target,weight,timestamp
user1,user2,0.8,1234567890
user2,user3,0.9,1234567900
```

Column names are flexible: `source`/`from`, `target`/`to`, `weight`/`value`, `timestamp`/`time`

## Dataset Information

Get information about popular datasets:

```typescript
import { SocialNetworkDatasetLoader } from './social-network-dataset-loader';

const info = SocialNetworkDatasetLoader.getDatasetInfo('bitcoin-otc');
if (info) {
  console.log(`Name: ${info.name}`);
  console.log(`URL: ${info.url}`);
  console.log(`Description: ${info.description}`);
  console.log(`Expected: ${info.expectedNodes} nodes, ${info.expectedEdges} edges`);
}
```

## Graph Statistics

The loader automatically computes comprehensive graph statistics:

```typescript
const stats = dataset.statistics;

console.log(`Total nodes: ${stats.totalNodes}`);
console.log(`Total edges: ${stats.totalEdges}`);
console.log(`Density: ${stats.density.toFixed(4)}`);
console.log(`Average degree: ${stats.averageDegree.toFixed(2)}`);
console.log(`Max degree: ${stats.maxDegree}`);
console.log(`Isolated nodes: ${stats.isolatedNodes}`);
console.log(`Self loops: ${stats.selfLoops}`);

if (stats.weightRange) {
  console.log(`Weight range: ${stats.weightRange.min} - ${stats.weightRange.max}`);
  console.log(`Mean weight: ${stats.weightRange.mean}`);
}

if (stats.timestampRange) {
  const days = (stats.timestampRange.max - stats.timestampRange.min) / (1000 * 60 * 60 * 24);
  console.log(`Time span: ${days.toFixed(0)} days`);
}
```

## Validation

The loader validates datasets to ensure data integrity:

- ✅ No duplicate node IDs
- ✅ All edge references point to valid nodes
- ✅ Non-empty node and edge sets
- ✅ Consistent weight ranges
- ✅ Valid timestamp formats

## Examples

See `examples/social-network-dataset-example.ts` for complete examples:

1. **Bitcoin-OTC Dataset**: Load trust network and compute reputation
2. **Custom JSON Dataset**: Load custom formatted dataset
3. **Reddit Hyperlinks**: Load large-scale social network
4. **Integrated Workflow**: End-to-end dataset → reputation → DKG publishing

## Best Practices

1. **Start Small**: Use `maxNodes` and `maxEdges` to limit dataset size during development
2. **Normalize Weights**: Use `normalizeWeights: true` for consistent weight ranges
3. **Filter Early**: Use `nodeFilter` and `edgeFilter` to remove unwanted data before processing
4. **Validate Always**: Keep `skipValidation: false` unless you're certain of data quality
5. **Check Statistics**: Review `dataset.statistics` to understand graph properties before analysis

## Integration with Reputation System

The dataset loader is fully integrated with the Social Graph Reputation Service:

```typescript
// Option 1: Load dataset separately
const dataset = await loader.loadFromFile('data/bitcoin-otc.txt');
const { scores } = await reputationService.computeReputation({
  nodes: dataset.nodes,
  edges: dataset.edges
});

// Option 2: Load through reputation service
const graphData = await reputationService.ingestSocialGraphData({
  datasetFile: 'data/bitcoin-otc.txt',
  datasetOptions: { format: 'snap', maxNodes: 1000 }
});
const { scores } = await reputationService.computeReputation(graphData);
```

## Performance Considerations

- **Large Datasets**: Use `maxNodes` and `maxEdges` to limit memory usage
- **Filtering**: Apply filters early to reduce processing time
- **Format Choice**: SNAP format is typically fastest for large edge lists
- **Streaming**: For very large datasets (>1M edges), consider implementing streaming parser

## Error Handling

The loader provides detailed error messages:

```typescript
try {
  const dataset = await loader.loadFromFile('data/invalid.txt');
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Dataset file not found');
  } else if (error.message.includes('validation failed')) {
    console.error('Dataset validation failed:', error.message);
  } else {
    console.error('Loading error:', error.message);
  }
}
```

## Future Enhancements

- [ ] GraphML format support
- [ ] GEXF format support
- [ ] Streaming parser for very large datasets
- [ ] Remote URL loading (with caching)
- [ ] Dataset preprocessing pipelines
- [ ] Community detection integration
- [ ] Temporal analysis tools

## References

- **Stanford SNAP**: https://snap.stanford.edu/data/
- **Network Repository**: https://networkrepository.com
- **SNAP Datasets Paper**: Leskovec & Krevl (2014)
- **Social Network Analysis**: Wasserman & Faust (1994)

## License

Part of the DotRep project - Sybil-Resistant Social Credit Marketplace.

